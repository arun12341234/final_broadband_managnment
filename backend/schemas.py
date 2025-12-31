from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List
from datetime import datetime
import re

# ============================================
# AUTHENTICATION SCHEMAS
# ============================================

class Token(BaseModel):
    access_token: str
    token_type: str


class CustomerLogin(BaseModel):
    mobile: str
    password: str


class EngineerLogin(BaseModel):
    mobile: str
    password: str


# ============================================
# BROADBAND PLAN SCHEMAS
# ============================================

class BroadbandPlanCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    price: float = Field(..., gt=0)
    speed: str
    data_limit: str
    commitment: str
    
    @validator('price')
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError('Price must be greater than 0')
        if v > 100000:
            raise ValueError('Price seems too high')
        return v


class BroadbandPlanResponse(BaseModel):
    id: str
    name: str
    price: float
    speed: str
    data_limit: str
    commitment: str
    
    class Config:
        from_attributes = True


# ============================================
# USER SCHEMAS
# ============================================

class UserCreate(BaseModel):
    cs_id: str = Field(..., min_length=3, max_length=20)
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=10)
    email: EmailStr
    user_password: str = Field(..., min_length=6)
    address: str = Field(..., min_length=10)
    broadband_plan_id: str
    plan_start_date: Optional[str] = None
    
    @validator('phone')
    def phone_must_be_valid(cls, v):
        if not v.isdigit():
            raise ValueError('Phone must contain only digits')
        if len(v) != 10:
            raise ValueError('Phone must be exactly 10 digits')
        return v
    
    @validator('cs_id')
    def cs_id_format(cls, v):
        if not re.match(r'^CS_\d+$', v):
            raise ValueError('CS ID must be in format CS_XXXX')
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    status: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    cs_id: str
    name: str
    phone: str
    email: Optional[str]
    address: Optional[str]
    photo: Optional[str] = None  # User photo URL
    documents: Optional[str] = None  # JSON string of documents
    broadband_plan_id: str
    payment_status: str
    old_pending_amount: int
    payment_due_date: str
    plan_start_date: str
    plan_expiry_date: str
    is_plan_active: bool
    status: str
    created_at: str

    class Config:
        from_attributes = True


# ============================================
# BILLING SCHEMAS
# ============================================

class BillingUpdate(BaseModel):
    broadband_plan_id: str
    payment_status: str
    old_pending_amount: int = Field(ge=0)
    payment_due_date: str
    plan_start_date: Optional[str] = None
    
    @validator('payment_status')
    def validate_payment_status(cls, v):
        allowed = ['Pending', 'VerifiedByCash', 'VerifiedByUpi']
        if v not in allowed:
            raise ValueError(f'Payment status must be one of: {allowed}')
        return v


class PlanRenewalRequest(BaseModel):
    months: int = Field(..., ge=-12, le=12)  # Negative for reduction, positive for extension


class PaymentRequest(BaseModel):
    bill_id: int
    payment_method: str
    transaction_id: Optional[str] = None


class BillingHistoryResponse(BaseModel):
    id: int
    user_id: str
    admin_email: str
    previous_payment_status: Optional[str]
    new_payment_status: Optional[str]
    previous_old_pending_amount: Optional[int]
    new_old_pending_amount: Optional[int]
    previous_payment_due_date: Optional[str]
    new_payment_due_date: Optional[str]
    previous_plan_id: Optional[str]
    new_plan_id: Optional[str]
    previous_plan_name: Optional[str]
    new_plan_name: Optional[str]
    change_type: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BillingHistoryUpdate(BaseModel):
    previous_payment_status: Optional[str] = None
    new_payment_status: Optional[str] = None
    previous_old_pending_amount: Optional[int] = None
    new_old_pending_amount: Optional[int] = None
    previous_payment_due_date: Optional[str] = None
    new_payment_due_date: Optional[str] = None
    previous_plan_id: Optional[str] = None
    new_plan_id: Optional[str] = None
    change_type: Optional[str] = None
    notes: Optional[str] = None


# ============================================
# ENGINEER SCHEMAS
# ============================================

class EngineerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    mobile: str = Field(..., min_length=10, max_length=10)
    password: str = Field(..., min_length=6)
    email: Optional[EmailStr] = None
    specialization: Optional[str] = None
    status: str = "Active"
    joining_date: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    
    @validator('mobile', 'emergency_contact')
    def mobile_must_be_valid(cls, v):
        if v and not v.isdigit():
            raise ValueError('Mobile must contain only digits')
        if v and len(v) != 10:
            raise ValueError('Mobile must be exactly 10 digits')
        return v


class EngineerResponse(BaseModel):
    id: str
    name: str
    mobile: str
    email: Optional[str]
    specialization: Optional[str]
    status: str
    joining_date: Optional[str]
    address: Optional[str]
    emergency_contact: Optional[str]
    
    class Config:
        from_attributes = True


# ============================================
# CUSTOMER PORTAL SCHEMAS
# ============================================

class CustomerDashboardResponse(BaseModel):
    id: str
    name: str
    email: str
    mobile: str
    address: str
    plan_name: str
    plan_price: float
    plan_speed: str
    plan_expiry_date: str
    is_plan_active: bool
    payment_status: str
    old_pending_amount: int
    photo: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============================================
# INVOICE SCHEMAS
# ============================================

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    user_id: str
    plan_id: str
    plan_name: str
    plan_price: float
    old_pending_amount: int
    subtotal: float
    gst_rate: float
    gst_amount: float
    total_amount: float
    payment_status: str
    payment_method: Optional[str]
    transaction_id: Optional[str]
    payment_date: Optional[str]
    invoice_date: str
    due_date: str
    billing_period: str
    months_renewed: int
    old_expiry_date: Optional[str]
    new_expiry_date: Optional[str]
    generated_by: str
    pdf_filepath: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceCreate(BaseModel):
    user_id: str
    months: int = Field(..., ge=1, le=12)
    payment_method: str = "Renewal"  # How the renewal was paid
    notes: Optional[str] = None


# ============================================
# OAUTH2 SCHEMA
# ============================================

from fastapi.security import OAuth2PasswordRequestForm