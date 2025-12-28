"""
Migration: Add billing_history table
Run this once to create the billing history table
"""

from database import Base, engine
from models import BillingHistory
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate():
    """Create billing_history table"""
    
    logger.info("🔨 Running migration: Add billing_history table")
    
    try:
        # Create billing_history table
        Base.metadata.create_all(bind=engine, tables=[BillingHistory.__table__])
        
        logger.info("✅ Billing history table created successfully")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        return False


if __name__ == "__main__":
    success = migrate()
    if success:
        print("\n✅ Migration completed successfully!")
    else:
        print("\n❌ Migration failed!")