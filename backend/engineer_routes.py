from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pathlib import Path
from typing import List
import shutil
import re
import os
import logging

from database import get_db
from models import User, BroadbandPlan, Engineer, Installation
from schemas import Token, EngineerLogin
from auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from auth_helpers import get_current_engineer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/engineer", tags=["Engineer"])

# Upload directories
PHOTOS_DIR = Path("uploads/photos"); PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
DOCUMENTS_DIR = Path("uploads/documents"); DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)

# File size limits (in bytes)
MAX_PHOTO_SIZE = 5 * 1024 * 1024
MAX_DOCUMENT_SIZE = 10 * 1024 * 1024


def validate_mobile(mobile: str) -> str:
    """Validate Indian mobile number: 10 digits starting with 6-9"""
    mobile = re.sub(r"\D", "", mobile)
    if len(mobile) != 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mobile number must be exactly 10 digits")
    if not mobile.startswith(("6", "7", "8", "9")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid mobile number. Must start with 6, 7, 8, or 9")
    return mobile


async def validate_file_size(file: UploadFile | None, max_size: int, label: str):
    if not file:
        return
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    if size > max_size:
        raise HTTPException(status_code=400, detail=f"{label} too large. Max {max_size // (1024*1024)} MB")


@router.post("/login", response_model=Token)
async def engineer_login(
    request: Request,
    credentials: EngineerLogin,
    db: Session = Depends(get_db)
):
    """Engineer login with mobile number and password"""
    logger.info(f"Engineer login attempt: {credentials.mobile}")

    engineer = db.query(Engineer).filter(Engineer.mobile == credentials.mobile).first()
    if not engineer:
        logger.warning(f"Engineer login failed: Mobile not found {credentials.mobile}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Mobile number not found. Check your credentials.")

    if engineer.status != "Active":
        logger.warning(f"Login failed: {engineer.status} engineer {credentials.mobile}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Your account is {engineer.status}. Please contact admin.")

    # Plain-text password comparison per existing model
    if engineer.password != credentials.password:
        logger.warning(f"Engineer login failed: Wrong password {credentials.mobile}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password. Please try again.")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": engineer.id, "role": "engineer"}, expires_delta=access_token_expires)
    logger.info(f"Engineer login successful: {engineer.name} ({engineer.mobile})")
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
async def get_engineer_profile(current_engineer: Engineer = Depends(get_current_engineer)):
    return {
        "id": current_engineer.id,
        "name": current_engineer.name,
        "mobile": current_engineer.mobile,
        "email": current_engineer.email,
        "specialization": current_engineer.specialization,
        "status": current_engineer.status,
        "joining_date": current_engineer.joining_date,
    }


@router.post("/add-customer")
async def add_new_customer(
    request: Request,
    name: str = Form(...),
    mobile: str = Form(...),
    email: str = Form(None),
    address: str = Form(...),
    plan: str = Form(...),
    password: str = Form(...),
    user_photo: UploadFile = File(None),
    kyc_documents: List[UploadFile] = File(None),
    current_engineer: Engineer = Depends(get_current_engineer),
    db: Session = Depends(get_db)
):
    """Engineer adds new customer with validation and uploads"""

    mobile = validate_mobile(mobile)

    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if len(name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
    if len(address.strip()) < 10:
        raise HTTPException(status_code=400, detail="Address must be at least 10 characters")

    existing = db.query(User).filter(User.phone == mobile).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mobile number {mobile} already exists in system")

    await validate_file_size(user_photo, MAX_PHOTO_SIZE, "Photo")
    if kyc_documents:
        for doc in kyc_documents:
            if doc:
                await validate_file_size(doc, MAX_DOCUMENT_SIZE, "Document")

    photo_url = None
    if user_photo:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        photo_filename = f"{timestamp}_{user_photo.filename}"
        photo_path = PHOTOS_DIR / photo_filename
        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(user_photo.file, buffer)
        photo_url = f"/uploads/photos/{photo_filename}"
        logger.info(f"Photo uploaded: {photo_filename}")

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
                    "uploaded_at": datetime.now().isoformat(),
                })
                logger.info(f"Document {idx+1} uploaded: {doc_filename}")

    from dateutil.relativedelta import relativedelta
    today = datetime.now().date()
    plan_start = today
    plan_expiry = plan_start + relativedelta(months=1)
    payment_due = plan_start + timedelta(days=15)

    plan_obj = db.query(BroadbandPlan).filter(BroadbandPlan.name.contains(plan.split()[0])).first()
    if not plan_obj:
        plan_obj = db.query(BroadbandPlan).first()
    if not plan_obj:
        raise HTTPException(status_code=400, detail="No broadband plans available. Please contact admin.")

    cs_id = f"CS_{mobile[-4:]}"
    import json
    new_user = User(
        id=f"usr_{int(datetime.utcnow().timestamp() * 1000)}",
        cs_id=cs_id,
        name=name.strip(),
        phone=mobile,
        email=(email.strip() if email else f"{mobile}@4you.in"),
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
        is_plan_active=False,
        status="Pending Installation",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"New customer added by engineer {current_engineer.name}: {name} ({mobile}) - CS ID: {cs_id}")
    return {
        "success": True,
        "message": f"Customer {name} added successfully! Installation pending.",
        "customer_id": new_user.id,
        "cs_id": cs_id,
        "status": "Pending Installation",
        "plan": plan_obj.name,
        "credentials": {"mobile": mobile, "password": password},
    }


@router.get("/tasks")
async def get_installation_tasks(current_engineer: Engineer = Depends(get_current_engineer), db: Session = Depends(get_db)):
    """Get all installation tasks using Installation status so completed tasks persist"""

    inst_records = db.query(Installation).filter(
        Installation.status.in_(["Pending Installation", "Installation Scheduled", "Completed"])
    ).order_by(Installation.updated_at.desc()).all()

    tasks = []
    for inst in inst_records:
        user = db.query(User).filter(User.id == inst.user_id).first()
        if not user:
            continue
        plan = db.query(BroadbandPlan).filter(BroadbandPlan.id == user.broadband_plan_id).first()
        tasks.append({
            "id": user.id,
            "name": user.name,
            "mobile": user.phone,
            "address": user.address,
            "plan": plan.name if plan else "N/A",
            "status": inst.status,
            "created_at": user.created_at,
            "scheduled_date": inst.scheduled_date,
            "completed_date": inst.completed_date,
        })

    pending_count = len([t for t in tasks if t["status"] == "Pending Installation"])
    scheduled_count = len([t for t in tasks if t["status"] == "Installation Scheduled"])
    completed_count = len([t for t in tasks if t["status"] == "Completed"])

    return {"tasks": tasks, "summary": {"pending": pending_count, "scheduled": scheduled_count, "completed": completed_count, "total": len(tasks)}}


@router.put("/update-task/{user_id}")
async def update_installation_task(
    user_id: str,
    status: str = Form(...),
    scheduled_date: str = Form(None),
    current_engineer: Engineer = Depends(get_current_engineer),
    db: Session = Depends(get_db),
):
    """Update installation task: schedule with date or complete and activate plan"""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    allowed_statuses = ["Installation Scheduled", "Completed"]
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {allowed_statuses}")

    if status == "Installation Scheduled":
        if not scheduled_date:
            raise HTTPException(status_code=400, detail="scheduled_date is required for Installation Scheduled")
        try:
            scheduled_dt = datetime.strptime(scheduled_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid scheduled_date format. Use YYYY-MM-DD")

        user.status = "Installation Scheduled"
        installation = db.query(Installation).filter(Installation.user_id == user.id).first()
        if not installation:
            installation = Installation(
                id=f"ins_{int(datetime.utcnow().timestamp() * 1000)}",
                user_id=user.id,
                engineer_id=current_engineer.id,
                status="Installation Scheduled",
                scheduled_date=scheduled_dt.strftime("%Y-%m-%d"),
            )
            db.add(installation)
        else:
            installation.status = "Installation Scheduled"
            installation.engineer_id = current_engineer.id
            installation.scheduled_date = scheduled_dt.strftime("%Y-%m-%d")

    elif status == "Completed":
        from dateutil.relativedelta import relativedelta
        today = datetime.now().date()
        plan_start = today
        plan_expiry = plan_start + relativedelta(months=1)
        payment_due = plan_start + timedelta(days=15)

        user.status = "Active"
        user.is_plan_active = True
        user.plan_start_date = plan_start.strftime("%Y-%m-%d")
        user.plan_expiry_date = plan_expiry.strftime("%Y-%m-%d")
        user.payment_due_date = payment_due.strftime("%Y-%m-%d")

        installation = db.query(Installation).filter(Installation.user_id == user.id).first()
        if installation:
            installation.status = "Completed"
            installation.completed_date = plan_start.strftime("%Y-%m-%d")

        logger.info(f"Installation completed for {user.name}. Status=Active, start={user.plan_start_date}, expiry={user.plan_expiry_date}")

    db.commit()
    logger.info(f"Task updated by {current_engineer.name}: {user.name} -> {status}")
    return {
        "success": True,
        "message": f"Task status updated to {status}",
        "user_id": user_id,
        "new_status": user.status,
        "is_plan_active": user.is_plan_active,
        "plan_start_date": user.plan_start_date,
        "plan_expiry_date": user.plan_expiry_date,
        "payment_due_date": user.payment_due_date,
    }