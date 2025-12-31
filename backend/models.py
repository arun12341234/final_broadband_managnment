from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    def __repr__(self):
        return f"<Admin(email='{self.email}')>"


class BroadbandPlan(Base):
    __tablename__ = "broadband_plans"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    speed = Column(String, nullable=False)
    data_limit = Column(String, nullable=False)
    commitment = Column(String, nullable=False)
    
    # Relationship
    users = relationship("User", back_populates="plan")
    
    def __repr__(self):
        return f"<BroadbandPlan(name='{self.name}', price={self.price})>"


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    cs_id = Column(String, unique=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String)
    user_password = Column(String, nullable=True)  # Plain text for customer login
    address = Column(Text)
    photo = Column(String, nullable=True)
    documents = Column(Text, nullable=True)  # JSON string
    
    # Plan details
    broadband_plan_id = Column(String, ForeignKey("broadband_plans.id"))
    plan_start_date = Column(String)
    plan_expiry_date = Column(String)
    is_plan_active = Column(Boolean, default=True)
    last_renewal_date = Column(String, nullable=True)
    
    # Payment details
    payment_status = Column(String, default="Pending")  # Pending, VerifiedByCash, VerifiedByUpi
    old_pending_amount = Column(Integer, default=0)
    payment_due_date = Column(String)
    
    # Status
    status = Column(String, default="Active")  # Active, Expired, Suspended, Pending Installation
    created_at = Column(String)
    
    # Relationships
    plan = relationship("BroadbandPlan", back_populates="users")
    billing_history = relationship("BillingHistory", back_populates="user")
    
    def __repr__(self):
        return f"<User(name='{self.name}', cs_id='{self.cs_id}')>"


class Engineer(Base):
    __tablename__ = "engineers"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    mobile = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)  # Plain text for engineer login
    email = Column(String, nullable=True)
    specialization = Column(String, nullable=True)
    status = Column(String, default="Active")  # Active, Inactive, On Leave
    joining_date = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    emergency_contact = Column(String, nullable=True)
    
    def __repr__(self):
        return f"<Engineer(name='{self.name}', mobile='{self.mobile}')>"


class BillingHistory(Base):
    __tablename__ = "billing_history"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    admin_email = Column(String, nullable=False)
    
    # Previous values
    previous_payment_status = Column(String)
    previous_old_pending_amount = Column(Integer)
    previous_payment_due_date = Column(String)
    previous_plan_id = Column(String)
    previous_plan_name = Column(String)
    
    # New values
    new_payment_status = Column(String)
    new_old_pending_amount = Column(Integer)
    new_payment_due_date = Column(String)
    new_plan_id = Column(String)
    new_plan_name = Column(String)
    
    # Metadata
    change_type = Column(String)  # billing_update, payment_verification, plan_change
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", back_populates="billing_history")
    
    def __repr__(self):
        return f"<BillingHistory(user_id='{self.user_id}', change_type='{self.change_type}')>"


class Installation(Base):
    __tablename__ = "installations"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    engineer_id = Column(String, ForeignKey("engineers.id"), nullable=True)

    # Installation details
    status = Column(String, default="Pending Installation")  # Pending Installation, Installation Scheduled, Completed
    scheduled_date = Column(String, nullable=True)
    completed_date = Column(String, nullable=True)

    # Technical details
    router_serial = Column(String, nullable=True)
    cable_length = Column(String, nullable=True)
    installation_notes = Column(Text, nullable=True)
    installation_photo = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="installations")
    engineer = relationship("Engineer", backref="installations")

    def __repr__(self):
        return f"<Installation(id='{self.id}', status='{self.status}')>"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_number = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)

    # Invoice details
    plan_id = Column(String, ForeignKey("broadband_plans.id"), nullable=False)
    plan_name = Column(String, nullable=False)
    plan_price = Column(Float, nullable=False)

    # Amounts
    old_pending_amount = Column(Integer, default=0)  # Previous outstanding amount
    subtotal = Column(Float, nullable=False)  # plan_price + old_pending_amount
    gst_rate = Column(Float, default=18.0)  # GST percentage
    gst_amount = Column(Float, nullable=False)  # Calculated GST
    total_amount = Column(Float, nullable=False)  # Final amount with GST

    # Payment details
    payment_status = Column(String, default="Pending")  # Pending, Paid, Cancelled
    payment_method = Column(String, nullable=True)  # Cash, UPI, Card, etc.
    transaction_id = Column(String, nullable=True)
    payment_date = Column(String, nullable=True)

    # Dates
    invoice_date = Column(String, nullable=False)
    due_date = Column(String, nullable=False)
    billing_period = Column(String, nullable=False)  # e.g., "January 2025 - February 2025"

    # Renewal info
    months_renewed = Column(Integer, default=1)  # Number of months renewed
    old_expiry_date = Column(String, nullable=True)
    new_expiry_date = Column(String, nullable=True)

    # Admin who generated
    generated_by = Column(String, nullable=False)  # Admin email

    # PDF file path
    pdf_filepath = Column(String, nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="invoices")
    plan = relationship("BroadbandPlan", backref="invoices")

    def __repr__(self):
        return f"<Invoice(invoice_number='{self.invoice_number}', total={self.total_amount})>"


class BillingSettings(Base):
    __tablename__ = "billing_settings"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    street = Column(Text, nullable=False)  # Street / Building / Area
    city = Column(String, nullable=False)
    state = Column(String, nullable=False)
    country = Column(String, nullable=False, default="India")
    pin_code = Column(String, nullable=False)
    gstin = Column(String, nullable=True)  # Optional GST number
    contact_number = Column(String, nullable=True)  # Optional contact
    upi_id = Column(String, nullable=True)  # UPI ID for payments

    # UI Layout preference
    ui_layout = Column(String, default="card")  # card, stepper, fullwidth, compact

    # QR Code data
    qr_code_data = Column(Text, nullable=True)  # Base64 encoded QR code image

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<BillingSettings(name='{self.full_name}', city='{self.city}')>"