from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
import logging
import qrcode
from io import BytesIO
import base64

from database import get_db
from models import BillingSettings
from schemas import BillingSettingsCreate, BillingSettingsUpdate, BillingSettingsResponse
from auth_helpers import get_current_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/billing-settings", tags=["Billing Settings"])


def generate_qr_code(address_data: dict) -> str:
    """
    Generate QR code from billing address data and return as base64 string.

    Args:
        address_data: Dictionary containing address information

    Returns:
        Base64 encoded PNG image of QR code
    """
    # Format address for QR code
    address_text = f"""
{address_data['full_name']}
{address_data['street']}
{address_data['city']}, {address_data['state']} - {address_data['pin_code']}
{address_data['country']}
"""

    if address_data.get('contact_number'):
        address_text += f"\nContact: {address_data['contact_number']}"

    if address_data.get('gstin'):
        address_text += f"\nGSTIN: {address_data['gstin']}"

    if address_data.get('upi_id'):
        address_text += f"\nUPI: {address_data['upi_id']}"

    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(address_text.strip())
    qr.make(fit=True)

    # Create image
    img = qr.make_image(fill_color="black", back_color="white")

    # Convert to base64
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()

    return f"data:image/png;base64,{img_str}"


@router.get("", response_model=BillingSettingsResponse)
async def get_billing_settings(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    Get current billing settings.
    Only one record should exist - returns the first/latest one.
    """
    logger.info(f"📋 Fetching billing settings for admin: {current_admin.email}")

    # Get the most recent billing settings (there should only be one)
    settings = db.query(BillingSettings).order_by(BillingSettings.id.desc()).first()

    if not settings:
        logger.warning("⚠️  No billing settings found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No billing settings configured. Please create one."
        )

    logger.info(f"✅ Billing settings retrieved: {settings.full_name}")
    return settings


@router.post("", response_model=BillingSettingsResponse, status_code=status.HTTP_201_CREATED)
async def create_billing_settings(
    settings: BillingSettingsCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    Create new billing settings.
    Only one settings record should exist at a time.
    """
    logger.info(f"📝 Creating billing settings by admin: {current_admin.email}")

    # Check if settings already exist
    existing = db.query(BillingSettings).first()
    if existing:
        logger.warning("⚠️  Billing settings already exist - use PUT to update")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Billing settings already exist. Use the update endpoint to modify."
        )

    # Generate QR code
    address_data = {
        'full_name': settings.full_name,
        'street': settings.street,
        'city': settings.city,
        'state': settings.state,
        'country': settings.country,
        'pin_code': settings.pin_code,
        'contact_number': settings.contact_number,
        'gstin': settings.gstin,
        'upi_id': settings.upi_id
    }

    qr_code_data = generate_qr_code(address_data)

    # Create new settings
    db_settings = BillingSettings(
        full_name=settings.full_name,
        street=settings.street,
        city=settings.city,
        state=settings.state,
        country=settings.country,
        pin_code=settings.pin_code,
        gstin=settings.gstin,
        contact_number=settings.contact_number,
        upi_id=settings.upi_id,
        ui_layout=settings.ui_layout,
        qr_code_data=qr_code_data
    )

    db.add(db_settings)
    db.commit()
    db.refresh(db_settings)

    logger.info(f"✅ Billing settings created successfully: {db_settings.full_name}")
    return db_settings


@router.put("/{settings_id}", response_model=BillingSettingsResponse)
async def update_billing_settings(
    settings_id: int,
    settings: BillingSettingsUpdate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    Update existing billing settings.
    Regenerates QR code if address fields are changed.
    """
    logger.info(f"✏️  Updating billing settings {settings_id} by admin: {current_admin.email}")

    # Get existing settings
    db_settings = db.query(BillingSettings).filter(BillingSettings.id == settings_id).first()

    if not db_settings:
        logger.warning(f"❌ Billing settings {settings_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Billing settings not found"
        )

    # Track if address changed (to regenerate QR code)
    address_changed = False

    # Update fields if provided
    update_data = settings.dict(exclude_unset=True)

    for field, value in update_data.items():
        if value is not None:
            setattr(db_settings, field, value)
            if field in ['full_name', 'street', 'city', 'state', 'country', 'pin_code', 'contact_number', 'gstin', 'upi_id']:
                address_changed = True

    # Regenerate QR code if address changed
    if address_changed:
        address_data = {
            'full_name': db_settings.full_name,
            'street': db_settings.street,
            'city': db_settings.city,
            'state': db_settings.state,
            'country': db_settings.country,
            'pin_code': db_settings.pin_code,
            'contact_number': db_settings.contact_number,
            'gstin': db_settings.gstin,
            'upi_id': db_settings.upi_id
        }
        db_settings.qr_code_data = generate_qr_code(address_data)
        logger.info("🔄 QR code regenerated due to address change")

    # Update timestamp
    db_settings.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(db_settings)

    logger.info(f"✅ Billing settings updated successfully: {db_settings.full_name}")
    return db_settings


@router.delete("/{settings_id}")
async def delete_billing_settings(
    settings_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    Delete billing settings.
    (Generally not recommended - use update instead)
    """
    logger.info(f"🗑️  Deleting billing settings {settings_id} by admin: {current_admin.email}")

    db_settings = db.query(BillingSettings).filter(BillingSettings.id == settings_id).first()

    if not db_settings:
        logger.warning(f"❌ Billing settings {settings_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Billing settings not found"
        )

    db.delete(db_settings)
    db.commit()

    logger.info(f"✅ Billing settings deleted successfully")
    return {"message": "Billing settings deleted successfully"}
