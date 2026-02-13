"""
Migration: Add invoice_remarks column to users table
"""

from database import engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Add invoice_remarks column to users table"""
    
    logger.info("🔨 Running migration: Add invoice_remarks column")
    
    try:
        with engine.connect() as connection:
            trans = connection.begin()
            try:
                connection.execute(text("ALTER TABLE users ADD COLUMN invoice_remarks TEXT"))
                trans.commit()
                logger.info("✅ Column 'invoice_remarks' added successfully")
                return True
            except Exception as e:
                trans.rollback()
                if "duplicate column name" in str(e).lower():
                    logger.info("⚠️ Column 'invoice_remarks' already exists. Skipping.")
                    return True
                else:
                    raise e
                    
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = migrate()
    if success:
        print("\n✅ Migration completed successfully!")
    else:
        print("\n❌ Migration failed!")
