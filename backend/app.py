from fastapi import FastAPI, Depends, HTTPException, status, Request, Header, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, date
from pathlib import Path
from typing import List, Optional
import logging
import os
import shutil
from dotenv import load_dotenv

# Rate Limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Load environment variables
load_dotenv()

# Configure logging
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / 'app.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Configuration validation
def validate_config():
    """Validate critical environment variables"""
    secret_key = os.getenv("SECRET_KEY")
    admin_password = os.getenv("ADMIN_PASSWORD")
    
    if not secret_key or "CHANGE_THIS" in secret_key:
        logger.error("❌ SECRET_KEY not configured! Run: python generate_config.py")
        raise ValueError("SECRET_KEY not properly configured")
    
    if not admin_password or "CHANGE_THIS" in admin_password:
        logger.warning("⚠️  ADMIN_PASSWORD is default. Please change it!")
    
    logger.info("✅ Configuration validated")

# Validate on startup
try:
    validate_config()
except ValueError as e:
    logger.error(f"Configuration error: {e}")
    logger.error("Please run: python generate_config.py")
    exit(1)

# Rate Limiter Setup
limiter = Limiter(
    key_func=get_remote_address,
    enabled=os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
)

# FastAPI app
app = FastAPI(
    title="4You Broadband API",
    description="Complete ISP Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
FRONTEND_URLS = [
    os.getenv("FRONTEND_ADMIN_URL", "http://localhost:5173"),
    os.getenv("FRONTEND_CUSTOMER_URL", "http://localhost:5174"),
    os.getenv("FRONTEND_ENGINEER_URL", "http://localhost:5175"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_URLS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import models and database
from database import engine, SessionLocal, get_db, Base
from models import Admin, User, BroadbandPlan, Engineer, BillingHistory, Installation
from schemas import *
from auth import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from auth_helpers import get_current_admin, get_current_customer, get_current_engineer

# Import routers
from customer_routes import router as customer_router
from engineer_routes import router as engineer_router

# Include routers
app.include_router(customer_router)
app.include_router(engineer_router)

# Startup Event
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    
    logger.info("🚀 Starting 4You Broadband API...")
    
    # Create directories
    directories = [
        Path("uploads/photos"),
        Path("uploads/documents"),
        Path("backups"),
        Path("exports"),
        Path("logs")
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
        logger.info(f"✅ Directory created/verified: {directory}")
    
    # Create startup backup
    try:
        from backup import create_daily_backup
        create_daily_backup()
        logger.info("✅ Startup backup created")
    except Exception as e:
        logger.warning(f"⚠️  Startup backup failed: {e}")
    
    # Initialize database
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database initialized")
    
    # Create default admin if not exists
    db = SessionLocal()
    try:
        admin_email = os.getenv("ADMIN_EMAIL", "admin@4you.in")
        admin_exists = db.query(Admin).filter(Admin.email == admin_email).first()
        
        if not admin_exists:
            admin = Admin(
                id="admin_001",
                email=admin_email,
                hashed_password=get_password_hash(os.getenv("ADMIN_PASSWORD", "admin123"))
            )
            db.add(admin)
            db.commit()
            logger.info(f"✅ Default admin created: {admin_email}")
        else:
            logger.info("✅ Admin already exists")
    finally:
        db.close()
    
    # Start scheduler
    from notification_service import start_scheduler
    start_scheduler()
    logger.info("✅ Scheduler started")
    
    logger.info("✅ Application startup complete")
    logger.info(f"📡 API running on http://localhost:8000")
    logger.info(f"📚 API Docs at http://localhost:8000/docs")

# Shutdown Event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("👋 Shutting down application...")
    
    try:
        from backup import create_daily_backup
        create_daily_backup()
        logger.info("✅ Shutdown backup created")
    except Exception as e:
        logger.warning(f"⚠️  Shutdown backup failed: {e}")

# Health Check
@app.get("/health", tags=["System"])
async def health_check():
    """Check if API is running"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ============================================
# ADMIN AUTHENTICATION
# ============================================

@app.post("/api/admin/login", response_model=Token, tags=["Admin Auth"])
async def admin_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Admin login with email and password"""
    
    admin = db.query(Admin).filter(Admin.email == form_data.username).first()
    
    if not admin:
        logger.warning(f"❌ Admin login failed: Email not found {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, admin.hashed_password):
        logger.warning(f"❌ Admin login failed: Wrong password for {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": admin.id, "role": "admin"}
    )
    
    logger.info(f"✅ Admin login successful: {admin.email}")
    
    return {"access_token": access_token, "token_type": "bearer"}

# ============================================
# BROADBAND PLANS MANAGEMENT
# ============================================

@app.get("/api/plans", response_model=List[BroadbandPlanResponse], tags=["Plans"])
async def get_all_plans(db: Session = Depends(get_db)):
    """Get all broadband plans"""
    plans = db.query(BroadbandPlan).all()
    return plans

@app.post("/api/plans", response_model=BroadbandPlanResponse, tags=["Plans"])
async def create_plan(
    plan: BroadbandPlanCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create new broadband plan"""
    
    new_plan = BroadbandPlan(
        id=f"plan_{int(datetime.utcnow().timestamp() * 1000)}",
        name=plan.name,
        price=plan.price,
        speed=plan.speed,
        data_limit=plan.data_limit,
        commitment=plan.commitment
    )
    
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    
    logger.info(f"✅ Plan created: {plan.name} by {current_admin.email}")
    
    return new_plan

@app.put("/api/plans/{plan_id}", response_model=BroadbandPlanResponse, tags=["Plans"])
async def update_plan(
    plan_id: str,
    plan: BroadbandPlanCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update broadband plan"""
    
    db_plan = db.query(BroadbandPlan).filter(BroadbandPlan.id == plan_id).first()
    
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    db_plan.name = plan.name
    db_plan.price = plan.price
    db_plan.speed = plan.speed
    db_plan.data_limit = plan.data_limit
    db_plan.commitment = plan.commitment
    
    db.commit()
    db.refresh(db_plan)
    
    logger.info(f"✅ Plan updated: {plan.name} by {current_admin.email}")
    
    return db_plan

@app.delete("/api/plans/{plan_id}", tags=["Plans"])
async def delete_plan(
    plan_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete broadband plan"""
    
    plan = db.query(BroadbandPlan).filter(BroadbandPlan.id == plan_id).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    users_count = db.query(User).filter(User.broadband_plan_id == plan_id).count()
    
    if users_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete plan. {users_count} users are using this plan."
        )
    
    db.delete(plan)
    db.commit()
    
    logger.info(f"✅ Plan deleted: {plan.name} by {current_admin.email}")
    
    return {"message": "Plan deleted successfully"}

# ============================================
# USER MANAGEMENT
# ============================================

@app.get("/api/users", response_model=List[UserResponse], tags=["Users"])
async def get_all_users(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all users"""
    users = db.query(User).all()
    return users

@app.post("/api/users", response_model=UserResponse, tags=["Users"])
async def create_user(
    cs_id: str = Form(...),
    name: str = Form(...),
    phone: str = Form(...),
    email: str = Form(...),
    user_password: str = Form(...),
    address: str = Form(...),
    broadband_plan_id: str = Form(...),
    plan_start_date: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    document_0: Optional[UploadFile] = File(None),
    document_1: Optional[UploadFile] = File(None),
    document_2: Optional[UploadFile] = File(None),
    document_3: Optional[UploadFile] = File(None),
    document_4: Optional[UploadFile] = File(None),
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create new user with optional file uploads"""

    # Validate phone
    if not phone.isdigit() or len(phone) != 10:
        raise HTTPException(status_code=400, detail="Phone must be exactly 10 digits")

    # Check if user exists
    existing = db.query(User).filter(User.phone == phone).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Mobile number {phone} already exists"
        )

    today = date.today()
    plan_start = datetime.strptime(plan_start_date, "%Y-%m-%d").date() if plan_start_date else today

    from dateutil.relativedelta import relativedelta
    plan_expiry = plan_start + relativedelta(months=1)
    payment_due = plan_start + timedelta(days=15)

    # Handle photo upload
    photo_path = None
    if photo and photo.filename:
        upload_dir = Path("uploads/photos")
        upload_dir.mkdir(parents=True, exist_ok=True)
        photo_filename = f"{cs_id}_{int(datetime.utcnow().timestamp())}_{photo.filename}"
        photo_path = upload_dir / photo_filename
        with photo_path.open("wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        photo_path = str(photo_path)

    # Handle document uploads
    document_paths = []
    for doc_file in [document_0, document_1, document_2, document_3, document_4]:
        if doc_file and doc_file.filename:
            upload_dir = Path("uploads/documents")
            upload_dir.mkdir(parents=True, exist_ok=True)
            doc_filename = f"{cs_id}_{int(datetime.utcnow().timestamp())}_{doc_file.filename}"
            doc_path = upload_dir / doc_filename
            with doc_path.open("wb") as buffer:
                shutil.copyfileobj(doc_file.file, buffer)
            document_paths.append(str(doc_path))

    new_user = User(
        id=f"usr_{int(datetime.utcnow().timestamp() * 1000)}",
        cs_id=cs_id,
        name=name,
        phone=phone,
        email=email,
        user_password=user_password,
        address=address,
        broadband_plan_id=broadband_plan_id,
        payment_status="Pending",
        old_pending_amount=0,
        created_at=today.strftime("%Y-%m-%d"),
        payment_due_date=payment_due.strftime("%Y-%m-%d"),
        plan_start_date=plan_start.strftime("%Y-%m-%d"),
        plan_expiry_date=plan_expiry.strftime("%Y-%m-%d"),
        is_plan_active=True,
        status="Active",
        photo=photo_path
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"✅ User created: {name} by {current_admin.email}")
    if photo_path:
        logger.info(f"📸 Photo uploaded: {photo_path}")
    if document_paths:
        logger.info(f"📄 Documents uploaded: {len(document_paths)} files")

    return new_user

@app.get("/api/users/{user_id}", response_model=UserResponse, tags=["Users"])
async def get_user(
    user_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get user by ID"""
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

@app.put("/api/users/{user_id}", response_model=UserResponse, tags=["Users"])
async def update_user(
    user_id: str,
    name: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    user_password: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    broadband_plan_id: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    document_0: Optional[UploadFile] = File(None),
    document_1: Optional[UploadFile] = File(None),
    document_2: Optional[UploadFile] = File(None),
    document_3: Optional[UploadFile] = File(None),
    document_4: Optional[UploadFile] = File(None),
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update user with optional file uploads"""

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Update text fields
    if name:
        user.name = name
    if phone:
        if not phone.isdigit() or len(phone) != 10:
            raise HTTPException(status_code=400, detail="Phone must be exactly 10 digits")
        # Check if phone is taken by another user
        existing = db.query(User).filter(User.phone == phone, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Mobile number {phone} already exists")
        user.phone = phone
    if email:
        user.email = email
    if user_password:
        user.user_password = user_password
    if address:
        user.address = address
    if status:
        user.status = status
    if broadband_plan_id:
        user.broadband_plan_id = broadband_plan_id

    # Handle photo upload
    if photo and photo.filename:
        upload_dir = Path("uploads/photos")
        upload_dir.mkdir(parents=True, exist_ok=True)
        photo_filename = f"{user.cs_id}_{int(datetime.utcnow().timestamp())}_{photo.filename}"
        photo_path = upload_dir / photo_filename
        with photo_path.open("wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        user.photo = str(photo_path)
        logger.info(f"📸 Photo updated for user: {user.cs_id}")

    # Handle document uploads
    document_paths = []
    for doc_file in [document_0, document_1, document_2, document_3, document_4]:
        if doc_file and doc_file.filename:
            upload_dir = Path("uploads/documents")
            upload_dir.mkdir(parents=True, exist_ok=True)
            doc_filename = f"{user.cs_id}_{int(datetime.utcnow().timestamp())}_{doc_file.filename}"
            doc_path = upload_dir / doc_filename
            with doc_path.open("wb") as buffer:
                shutil.copyfileobj(doc_file.file, buffer)
            document_paths.append(str(doc_path))

    if document_paths:
        logger.info(f"📄 Documents uploaded for user {user.cs_id}: {len(document_paths)} files")

    db.commit()
    db.refresh(user)

    logger.info(f"✅ User updated: {user.name} by {current_admin.email}")

    return user

@app.delete("/api/users/{user_id}", tags=["Users"])
async def delete_user(
    user_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete user"""
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    logger.info(f"✅ User deleted: {user.name} by {current_admin.email}")
    
    return {"message": "User deleted successfully"}

# ============================================
# BILLING MANAGEMENT
# ============================================

@app.put("/api/users/{user_id}/billing", tags=["Billing"])
async def update_user_billing(
    user_id: str,
    billing_data: BillingUpdate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update user billing information"""
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_payment_status = user.payment_status
    old_pending = user.old_pending_amount
    old_due_date = user.payment_due_date
    old_plan = db.query(BroadbandPlan).filter(BroadbandPlan.id == user.broadband_plan_id).first()
    
    user.broadband_plan_id = billing_data.broadband_plan_id
    user.payment_status = billing_data.payment_status
    user.old_pending_amount = billing_data.old_pending_amount
    user.payment_due_date = billing_data.payment_due_date
    
    if billing_data.plan_start_date:
        user.plan_start_date = billing_data.plan_start_date
    
    new_plan = db.query(BroadbandPlan).filter(BroadbandPlan.id == billing_data.broadband_plan_id).first()
    
    billing_record = BillingHistory(
        user_id=user_id,
        admin_email=current_admin.email,
        previous_payment_status=old_payment_status,
        new_payment_status=billing_data.payment_status,
        previous_old_pending_amount=old_pending,
        new_old_pending_amount=billing_data.old_pending_amount,
        previous_payment_due_date=old_due_date,
        new_payment_due_date=billing_data.payment_due_date,
        previous_plan_id=old_plan.id if old_plan else None,
        previous_plan_name=old_plan.name if old_plan else None,
        new_plan_id=new_plan.id if new_plan else None,
        new_plan_name=new_plan.name if new_plan else None,
        change_type="billing_update",
        notes=f"Billing updated by {current_admin.email}"
    )
    
    db.add(billing_record)
    db.commit()
    
    logger.info(f"✅ Billing updated for {user.name} by {current_admin.email}")
    
    return {"message": "Billing updated successfully"}

@app.post("/api/users/{user_id}/renew", tags=["Billing"])
async def renew_user_plan(
    user_id: str,
    renewal_data: PlanRenewalRequest,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Renew or reduce user's plan (positive months = extend, negative = reduce)"""

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if renewal_data.months == 0:
        raise HTTPException(status_code=400, detail="Months cannot be zero")

    from dateutil.relativedelta import relativedelta

    current_expiry = datetime.strptime(user.plan_expiry_date, "%Y-%m-%d")
    new_expiry = current_expiry + relativedelta(months=renewal_data.months)

    # Check if reducing below current date
    if renewal_data.months < 0 and new_expiry < datetime.now():
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reduce plan below current date. Minimum expiry: {date.today().strftime('%Y-%m-%d')}"
        )

    user.plan_expiry_date = new_expiry.strftime("%Y-%m-%d")
    user.is_plan_active = True
    user.status = "Active"
    user.last_renewal_date = date.today().strftime("%Y-%m-%d")

    db.commit()

    action = "reduced" if renewal_data.months < 0 else "extended"
    abs_months = abs(renewal_data.months)
    logger.info(f"✅ Plan {action} for {user.name}: {renewal_data.months:+d} months by {current_admin.email}")

    return {
        "message": f"Plan {action} by {abs_months} month{'s' if abs_months != 1 else ''}",
        "new_expiry_date": new_expiry.strftime("%Y-%m-%d"),
        "action": action
    }

@app.get("/api/billing-history", response_model=List[BillingHistoryResponse], tags=["Billing"])
async def get_billing_history(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all billing history"""

    history = db.query(BillingHistory).order_by(BillingHistory.created_at.desc()).all()
    return history

@app.put("/api/billing-history/{history_id}", response_model=BillingHistoryResponse, tags=["Billing"])
async def update_billing_history(
    history_id: int,
    history_data: BillingHistoryUpdate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update a billing history record"""

    # Get the billing history record
    record = db.query(BillingHistory).filter(BillingHistory.id == history_id).first()
    if not record:
        raise HTTPException(404, "Billing history record not found")

    # Update fields that are provided
    update_data = history_data.dict(exclude_unset=True)

    for field, value in update_data.items():
        setattr(record, field, value)

    # Update plan names if plan IDs changed
    if history_data.previous_plan_id is not None:
        prev_plan = db.query(BroadbandPlan).filter(BroadbandPlan.id == history_data.previous_plan_id).first()
        record.previous_plan_name = prev_plan.name if prev_plan else None

    if history_data.new_plan_id is not None:
        new_plan = db.query(BroadbandPlan).filter(BroadbandPlan.id == history_data.new_plan_id).first()
        record.new_plan_name = new_plan.name if new_plan else None

    db.commit()
    db.refresh(record)

    logger.info(f"Billing history record {history_id} updated by {current_admin.email}")
    return record

@app.delete("/api/billing-history/{history_id}", tags=["Billing"])
async def delete_billing_history(
    history_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a billing history record"""

    # Get the billing history record
    record = db.query(BillingHistory).filter(BillingHistory.id == history_id).first()
    if not record:
        raise HTTPException(404, "Billing history record not found")

    db.delete(record)
    db.commit()

    logger.info(f"Billing history record {history_id} deleted by {current_admin.email}")
    return {"message": "Billing history record deleted successfully"}

# ============================================
# ENGINEER MANAGEMENT
# ============================================

@app.get("/api/engineers", response_model=List[EngineerResponse], tags=["Engineers"])
async def get_all_engineers(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all engineers"""
    engineers = db.query(Engineer).all()
    return engineers

@app.post("/api/engineers", response_model=EngineerResponse, tags=["Engineers"])
async def create_engineer(
    engineer: EngineerCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create new engineer"""
    
    existing = db.query(Engineer).filter(Engineer.mobile == engineer.mobile).first()
    if existing:
        raise HTTPException(400, f"Mobile {engineer.mobile} already exists")
    
    new_engineer = Engineer(
        id=f"eng_{int(datetime.utcnow().timestamp() * 1000)}",
        name=engineer.name,
        mobile=engineer.mobile,
        password=engineer.password,
        email=engineer.email,
        specialization=engineer.specialization,
        status=engineer.status,
        joining_date=engineer.joining_date or date.today().strftime("%Y-%m-%d"),
        address=engineer.address,
        emergency_contact=engineer.emergency_contact
    )
    
    db.add(new_engineer)
    db.commit()
    db.refresh(new_engineer)
    
    logger.info(f"✅ Engineer created: {engineer.name} by {current_admin.email}")
    
    return new_engineer

@app.put("/api/engineers/{engineer_id}", response_model=EngineerResponse, tags=["Engineers"])
async def update_engineer(
    engineer_id: str,
    engineer_update: EngineerCreate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update engineer"""
    
    engineer = db.query(Engineer).filter(Engineer.id == engineer_id).first()
    
    if not engineer:
        raise HTTPException(404, "Engineer not found")
    
    for field, value in engineer_update.dict(exclude_unset=True).items():
        setattr(engineer, field, value)
    
    db.commit()
    db.refresh(engineer)
    
    logger.info(f"✅ Engineer updated: {engineer.name} by {current_admin.email}")
    
    return engineer

@app.delete("/api/engineers/{engineer_id}", tags=["Engineers"])
async def delete_engineer(
    engineer_id: str,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete engineer"""
    
    engineer = db.query(Engineer).filter(Engineer.id == engineer_id).first()
    
    if not engineer:
        raise HTTPException(404, "Engineer not found")
    
    db.delete(engineer)
    db.commit()
    
    logger.info(f"✅ Engineer deleted: {engineer.name} by {current_admin.email}")
    
    return {"message": "Engineer deleted successfully"}

# ============================================
# DASHBOARD STATISTICS
# ============================================

@app.get("/api/dashboard/stats", tags=["Dashboard"])
async def get_dashboard_stats(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""
    
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_plan_active == True).count()
    pending_count = db.query(User).filter(User.payment_status == "Pending").count()
    
    verified_users = db.query(User).filter(
        User.payment_status.in_(["VerifiedByCash", "VerifiedByUpi"])
    ).all()
    
    monthly_revenue = 0
    for user in verified_users:
        plan = db.query(BroadbandPlan).filter(BroadbandPlan.id == user.broadband_plan_id).first()
        if plan:
            monthly_revenue += plan.price
    
    pending_users = db.query(User).filter(User.payment_status == "Pending").all()
    pending_collection = 0
    for user in pending_users:
        plan = db.query(BroadbandPlan).filter(BroadbandPlan.id == user.broadband_plan_id).first()
        if plan:
            pending_collection += plan.price + user.old_pending_amount
    
    total_old_debt = db.query(func.sum(User.old_pending_amount)).scalar() or 0
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "pending_payments": pending_count,
        "monthly_revenue": monthly_revenue,
        "pending_collection": pending_collection,
        "total_old_debt": total_old_debt
    }

# ============================================
# NOTIFICATIONS & EXPORTS
# ============================================

@app.post("/api/notifications/send-all", tags=["Notifications"])
async def send_all_notifications(
    current_admin: Admin = Depends(get_current_admin)
):
    """Manually trigger all notifications"""
    
    from notification_service import send_all_notifications_with_payment_reminders
    
    result = send_all_notifications_with_payment_reminders()
    
    return result

@app.post("/api/users/check-expired-plans", tags=["System"])
async def check_expired_plans_manual(
    current_admin: Admin = Depends(get_current_admin)
):
    """Manually check and expire plans"""
    
    from plan_expiry_checker import check_and_expire_plans
    
    result = check_and_expire_plans()
    
    return result

@app.get("/api/export/users", tags=["Export"])
async def export_users_excel(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Export users to Excel"""
    
    from excel_export import export_users_to_excel
    
    filepath = export_users_to_excel(db)
    
    return FileResponse(
        filepath,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="users_export.xlsx"
    )

# ============================================
# SYSTEM STATUS
# ============================================

@app.get("/api/system/test-email", tags=["System"])
async def test_email_endpoint(current_admin: Admin = Depends(get_current_admin)):
    """Test email configuration"""
    from email_service import test_email_configuration
    result = test_email_configuration()
    return result

@app.get("/api/system/test-whatsapp", tags=["System"])
async def test_whatsapp_endpoint(current_admin: Admin = Depends(get_current_admin)):
    """Test WhatsApp configuration"""
    from whatsapp_service import test_whatsapp_configuration
    result = test_whatsapp_configuration()
    return result

@app.get("/api/system/database-info", tags=["System"])
async def get_database_info(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get database information"""
    
    total_users = db.query(User).count()
    total_plans = db.query(BroadbandPlan).count()
    total_engineers = db.query(Engineer).count()
    total_billing_records = db.query(BillingHistory).count()
    
    database_url = os.getenv("DATABASE_URL", "sqlite:///./isp_management.db")
    db_type = "PostgreSQL" if "postgresql" in database_url else "SQLite"
    
    db_size = "N/A"
    if "sqlite" in database_url:
        db_file = Path("isp_management.db")
        if db_file.exists():
            size_bytes = db_file.stat().st_size
            db_size = f"{size_bytes / (1024 * 1024):.2f} MB"
    
    backup_dir = Path("backups")
    last_backup = "Never"
    if backup_dir.exists():
        backups = sorted(backup_dir.glob("*.db*"), reverse=True)
        if backups:
            last_backup_time = backups[0].stat().st_mtime
            last_backup = datetime.fromtimestamp(last_backup_time).strftime("%Y-%m-%d %H:%M:%S")
    
    return {
        "type": db_type,
        "total_users": total_users,
        "total_plans": total_plans,
        "total_engineers": total_engineers,
        "total_billing_records": total_billing_records,
        "size": db_size,
        "last_backup": last_backup
    }

# ============================================
# RUN SERVER
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
