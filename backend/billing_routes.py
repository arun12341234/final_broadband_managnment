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

def ensure_is_primary_column(db: Session):
    """Ensure the is_primary column exists on billing_settings (SQLite-safe)."""
    try:
        # Use raw connection for SQLite pragma
        conn = db.bind.raw_connection()
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(billing_settings)")
        columns = [row[1] for row in cur.fetchall()]
        if "is_primary" not in columns:
            cur.execute("ALTER TABLE billing_settings ADD COLUMN is_primary BOOLEAN DEFAULT 0")
            conn.commit()
        cur.close()
        conn.close()
    except Exception:
        # Best-effort; ignore if fails
        pass


def generate_upi_qr(upi_id: str, payee_name: str, amount: float | None = None, note: str | None = None) -> str:
    """Generate a valid UPI payment QR code as base64 PNG.

    Encodes the UPI deep link: upi://pay?pa=<VPA>&pn=<name>&cu=INR[&am=<amount>&tn=<note>]
    """
    if not upi_id or '@' not in upi_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid UPI ID")

    # Build UPI URL
    params = [
        ("pa", upi_id.strip()),
        ("pn", (payee_name or "").strip() or "Payee"),
        ("cu", "INR"),
    ]
    if amount is not None:
        try:
            amt = float(amount)
            if amt > 0:
                params.append(("am", f"{amt:.2f}"))
        except Exception:
            pass
    if note:
        params.append(("tn", note.strip()))

    # Construct query string safely
    from urllib.parse import urlencode
    query = urlencode(params, doseq=False)
    upi_url = f"upi://pay?{query}"

    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(upi_url)
    qr.make(fit=True)

    # Create image and convert to base64
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"


@router.get("", response_model=BillingSettingsResponse)
async def get_primary_billing_settings(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """
    Get the primary billing settings. If none is marked primary, return the most recent.
    """
    logger.info(f"📋 Fetching primary billing settings for admin: {current_admin.email}")

    # Ensure column exists to avoid OperationalError on ORM SELECT
    ensure_is_primary_column(db)

    settings = db.query(BillingSettings).filter(BillingSettings.is_primary == True).order_by(BillingSettings.id.desc()).first()
    if not settings:
        settings = db.query(BillingSettings).order_by(BillingSettings.id.desc()).first()

    if not settings:
        logger.warning("⚠️  No billing settings found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No billing settings configured. Please create one."
        )

    logger.info(f"✅ Billing settings retrieved: {settings.full_name}")
    return settings


@router.get("/list", response_model=list[BillingSettingsResponse])
async def list_billing_settings(
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """List all billing settings."""
    logger.info(f"📋 Listing all billing settings for admin: {current_admin.email}")
    ensure_is_primary_column(db)
    settings = db.query(BillingSettings).order_by(BillingSettings.is_primary.desc(), BillingSettings.id.desc()).all()
    return settings


@router.post("", response_model=BillingSettingsResponse, status_code=status.HTTP_201_CREATED)
async def create_billing_settings(
    settings: BillingSettingsCreate,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Create new billing settings. Multiple entries are allowed."""
    logger.info(f"📝 Creating billing settings by admin: {current_admin.email}")

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

    # Generate UPI QR if upi_id is provided; else no QR
    qr_code_data = None
    if settings.upi_id:
        try:
            qr_code_data = generate_upi_qr(settings.upi_id, settings.full_name)
        except HTTPException:
            qr_code_data = None

    # Create new settings
    # Ensure column exists before insert
    ensure_is_primary_column(db)
    make_primary = bool(settings.is_primary)

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
        is_primary=False,  # will set below
        qr_code_data=qr_code_data
    )

    db.add(db_settings)
    db.commit()
    db.refresh(db_settings)

    # Make primary if requested or if none exists yet
    try:
        if make_primary or db.query(BillingSettings).filter(BillingSettings.is_primary == True).count() == 0:
            # Set this one as primary and unset others
            db.query(BillingSettings).update({BillingSettings.is_primary: False})
            db_settings.is_primary = True
            db.commit()
            db.refresh(db_settings)
            logger.info("🌟 New billing settings set as primary")
    except Exception as e:
        logger.warning(f"⚠️  Failed to set primary flag: {e}")

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

    # Track if fields changed that impact QR code (UPI ID or payee name)
    qr_changed = False

    # Update fields if provided
    update_data = settings.dict(exclude_unset=True)

    for field, value in update_data.items():
        if value is not None:
            setattr(db_settings, field, value)
            if field in ['full_name', 'upi_id']:
                qr_changed = True

    # Regenerate UPI QR if UPI or name changed
    if qr_changed:
        if db_settings.upi_id:
            try:
                db_settings.qr_code_data = generate_upi_qr(db_settings.upi_id, db_settings.full_name)
                logger.info("🔄 UPI QR regenerated due to UPI/name change")
            except HTTPException:
                db_settings.qr_code_data = None
        else:
            db_settings.qr_code_data = None

    # Update timestamp
    db_settings.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(db_settings)

    # Ensure column exists and handle primary toggle
    ensure_is_primary_column(db)
    if 'is_primary' in update_data and update_data['is_primary'] is True:
        # Set current as primary, unset others
        db.query(BillingSettings).update({BillingSettings.is_primary: False})
        db_settings.is_primary = True
        db.commit()
        db.refresh(db_settings)
        logger.info("🌟 Updated billing settings set as primary")

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


@router.patch("/{settings_id}/make-primary", response_model=BillingSettingsResponse)
async def make_primary_billing_settings(
    settings_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(get_current_admin)
):
    """Mark a billing settings entry as primary."""
    logger.info(f"🌟 Making billing settings {settings_id} primary by admin: {current_admin.email}")

    db_settings = db.query(BillingSettings).filter(BillingSettings.id == settings_id).first()
    if not db_settings:
        logger.warning(f"❌ Billing settings {settings_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Billing settings not found"
        )

    # Ensure column exists and unset all primaries, set this one
    ensure_is_primary_column(db)
    db.query(BillingSettings).update({BillingSettings.is_primary: False})
    db_settings.is_primary = True
    db.commit()
    db.refresh(db_settings)

    logger.info("✅ Primary billing settings updated")
    return db_settings
