"""
Migration: Add invoices table
Run this once to create the invoices table
"""

from database import Base, engine
from models import Invoice
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate():
    """Create invoices table"""

    logger.info("🔨 Running migration: Add invoices table")

    try:
        # Create invoices table
        Base.metadata.create_all(bind=engine, tables=[Invoice.__table__])

        logger.info("✅ Invoices table created successfully")
        logger.info("   - Invoices will be auto-generated during plan renewals")
        logger.info("   - Each invoice includes old_pending_amount")
        logger.info("   - Renewal invoices are marked as 'Paid'")

        return True

    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        return False


if __name__ == "__main__":
    success = migrate()
    if success:
        print("\n✅ Migration completed successfully!")
        print("   Invoices table is now ready.")
        print("   Plan renewals will automatically generate paid invoices.")
    else:
        print("\n❌ Migration failed!")
