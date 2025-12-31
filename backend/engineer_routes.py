from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pathlib import Path
from typing import List
import shutil
import re
import os
import logging

from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_db
from models import Engineer, User, BroadbandPlan, Installation
from schemas import Token, EngineerLogin
from auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from auth_helpers import get_current_engineer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/engineer", tags=["Engineer"])

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Upload directories
UPLOAD_DIR = Path("uploads")
PHOTOS_DIR = UPLOAD_DIR / "photos"
DOCUMENTS_DIR = UPLOAD_DIR / "documents"

# File size limits
MAX_PHOTO_SIZE = int(os.getenv("MAX_PHOTO_SIZE", "5242880"))  # 5MB
MAX_DOCUMENT_SIZE = int(os.getenv("MAX_DOCUMENT_SIZE", "10485760"))  # 10MB


async def validate_file_size(file: UploadFile, max_size: int, file_type: str):
    """Validate uploaded file size"""
    
    if not file:
        return
    
    # Read file to check size
    contents = await file.read()
    size = len(contents)
    
    # Reset file pointer
    await file.seek(0)
    
    if size > max_size:
        max_mb = max_size / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{file_type} file too large. Maximum size: {max_mb:.1f}MB"
        )
    
    if size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{file_type} file is empty"
        )


def validate_mobile(mobile: str) -> str:
    """Validate mobile number format"""
    
    # Remove any non-digit characters
    mobile = re.sub(r'\D', '', mobile)
    
    if len(mobile) != 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number must be exactly 10 digits"
        )
    
    if not mobile.startswith(('6', '7', '8', '9')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid mobile number. Must start with 6, 7, 8, or 9"
        )
    
    return mobile


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def engineer_login(
    request: Request,
    credentials: EngineerLogin, 
    db: Session = Depends(get_db)
):
    """Engineer login with mobile number and password (rate limited)"""
    
    logger.info(f"🔐 Engineer login attempt: {credentials.mobile}")
    
    # Find engineer by mobile
    engineer = db.query(Engineer).filter(Engineer.mobile == credentials.mobile).first()
    
    if not engineer:
        logger.warning(f"❌ Engineer login failed: Mobile not found {credentials.mobile}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mobile number not found. Check your credentials.",
        )
    
    # Check if engineer is active
    if engineer.status != "Active":
        logger.warning(f"❌ Login failed: {engineer.status} engineer {credentials.mobile}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your account is {engineer.status}. Please contact admin.",
        )
    
    # Verify password (plain text comparison)
    if engineer.password != credentials.password:
        logger.warning(f"❌ Engineer login failed: Wrong password {credentials.mobile}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again.",
        )
    
    # Create access token with expiration
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": engineer.id, "role": "engineer"},
        expires_delta=access_token_expires
    )
    
    logger.info(f"✅ Engineer login successful: {engineer.name} ({engineer.mobile})")
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
async def get_engineer_profile(
    current_engineer: Engineer = Depends(get_current_engineer)
):
    """Get current engineer's profile"""
    
    return {
        "id": current_engineer.id,
        "name": current_engineer.name,
        "mobile": current_engineer.mobile,
        "email": current_engineer.email,
        "specialization": current_engineer.specialization,
        "status": current_engineer.status,
        "joining_date": current_engineer.joining_date
    }


@router.post("/add-customer")
@limiter.limit("20/hour")
async def add_new_customer(
    request: Request,
    name: str = Form(...),
    mobile: str = Form(...),
    address: str = Form(...),
    plan: str = Form(...),
    password: str = Form(...),
    user_photo: UploadFile = File(None),
    kyc_documents: List[UploadFile] = File(None),  # Changed to support multiple files
    current_engineer: Engineer = Depends(get_current_engineer),
    db: Session = Depends(get_db)
):
    """Engineer adds new customer with enhanced validation"""
    
    # Validate mobile number
    try:
        mobile = validate_mobile(mobile)
    except HTTPException as e:
        raise e
    
    # Validate password strength
    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters"
        )
    
    # Validate name
    if len(name.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name must be at least 2 characters"
        )
    
    # Validate address
    if len(address.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Address must be at least 10 characters"
        )
    
    # Check if mobile already exists
    existing = db.query(User).filter(User.phone == mobile).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mobile number {mobile} already exists in system"
        )
    
    # Validate file sizes
    await validate_file_size(user_photo, MAX_PHOTO_SIZE, "Photo")

    # Validate all KYC documents
    if kyc_documents:
        for doc in kyc_documents:
            if doc:
                await validate_file_size(doc, MAX_DOCUMENT_SIZE, "Document")

    # Handle photo upload
    photo_url = None
    if user_photo:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        photo_filename = f"{timestamp}_{user_photo.filename}"
        photo_path = PHOTOS_DIR / photo_filename

        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(user_photo.file, buffer)

        photo_url = f"/uploads/photos/{photo_filename}"
        logger.info(f"📷 Photo uploaded: {photo_filename}")

    # Handle multiple document uploads
    documents = []
    if kyc_documents:
        for idx, kyc_document in enumerate(kyc_documents):
            if kyc_document and kyc_document.filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                doc_filename = f"{timestamp}_{idx}_{kyc_document.filename}"
                doc_path = DOCUMENTS_DIR / doc_filename

                with open(doc_path, "wb") as buffer:
                    shutil.copyfileobj(kyc_document.file, buffer)

                doc_url = f"/uploads/documents/{doc_filename}"
                documents.append({
                    "id": f"doc_{timestamp}_{idx}",
                    "name": kyc_document.filename,
                    "type": "KYC Document",
                    "url": doc_url,
                    "uploaded_at": datetime.now().isoformat()
                })
                logger.info(f"📄 Document {idx+1} uploaded: {doc_filename}")

    if documents:
        logger.info(f"✅ Total {len(documents)} KYC document(s) uploaded")
    
    # Find plan by name (fuzzy match)
    plan_obj = db.query(BroadbandPlan).filter(
        BroadbandPlan.name.contains(plan.split()[0])
    ).first()
    
    if not plan_obj:
        plan_obj = db.query(BroadbandPlan).first()
    
    if not plan_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No broadband plans available. Please contact admin."
        )
    
    # Calculate dates
    from dateutil.relativedelta import relativedelta
    
    today = datetime.now().date()
    plan_start = today
    plan_expiry = plan_start + relativedelta(months=1)
    payment_due = plan_start + timedelta(days=15)
    
    # Generate customer ID
    cs_id = f"CS_{mobile[-4:]}"
    
    # Create new user
    import json
    new_user = User(
        id=f"usr_{int(datetime.utcnow().timestamp() * 1000)}",
        cs_id=cs_id,
        name=name.strip(),
        phone=mobile,
        email=f"{mobile}@4you.in",
        user_password=password,
        address=address.strip(),
        photo=photo_url,
        documents=json.dumps(documents) if documents else None,
        broadband_plan_id=plan_obj.id,
        payment_status="Pending",
        old_pending_amount=0,
        created_at=today.strftime("%Y-%m-%d"),
        payment_due_date=payment_due.strftime("%Y-%m-%d"),
        plan_start_date=plan_start.strftime("%Y-%m-%d"),
        plan_expiry_date=plan_expiry.strftime("%Y-%m-%d"),
        is_plan_active=False,  # Not active until installation completed
        status="Pending Installation"
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    logger.info(
        f"✅ New customer added by engineer {current_engineer.name}: "
        f"{name} ({mobile}) - CS ID: {cs_id}"
    )
    
    return {
        "success": True,
        "message": f"Customer {name} added successfully! Installation pending.",
        "customer_id": new_user.id,
        "cs_id": cs_id,
        "status": "Pending Installation",
        "plan": plan_obj.name,
        "credentials": {
            "mobile": mobile,
            "password": password
        }
    }


@router.get("/tasks")
async def get_installation_tasks(
    current_engineer: Engineer = Depends(get_current_engineer),
    db: Session = Depends(get_db)
):
    """Get all installation tasks"""
    
    # Get all users with installation status
    users = db.query(User).filter(
        User.status.in_(["Pending Installation", "Installation Scheduled", "Completed"])
    ).all()
    
    tasks = []
    for user in users:
        plan = db.query(BroadbandPlan).filter(
            BroadbandPlan.id == user.broadband_plan_id
        ).first()
        
        tasks.append({
            "id": user.id,
            "name": user.name,
            "mobile": user.phone,
            "address": user.address,
            "plan": plan.name if plan else "N/A",
            "status": user.status,
            "created_at": user.created_at
        })
    
    # Count by status
    pending_count = len([t for t in tasks if t["status"] == "Pending Installation"])
    scheduled_count = len([t for t in tasks if t["status"] == "Installation Scheduled"])
    completed_count = len([t for t in tasks if t["status"] == "Completed"])
    
    return {
        "tasks": tasks,
        "summary": {
            "pending": pending_count,
            "scheduled": scheduled_count,
            "completed": completed_count,
            "total": len(tasks)
        }
    }


@router.put("/update-task/{user_id}")
async def update_installation_task(
    user_id: str,
    status: str = Form(...),
    current_engineer: Engineer = Depends(get_current_engineer),
    db: Session = Depends(get_db)
):
    """Update installation task status"""
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate status
    allowed_statuses = ["Installation Scheduled", "Completed"]
    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {allowed_statuses}"
        )
    
    # Update user status
    user.status = status
    
    # If completed, activate plan
    if status == "Completed":
        user.is_plan_active = True
        user.status = "Active"
        logger.info(f"✅ Installation completed for {user.name}, plan activated")
    
    db.commit()
    
    logger.info(f"✅ Task updated by {current_engineer.name}: {user.name} → {status}")
    
    return {
        "success": True,
        "message": f"Task status updated to {status}",
        "user_id": user_id,
        "new_status": user.status,
        "is_plan_active": user.is_plan_active
    }