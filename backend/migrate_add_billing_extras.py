"""
Migration: Add extra_items, amount_paid, and total_due columns to billing_history table
"""

from sqlalchemy import create_engine, text
import logging
from pathlib import Path
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Add extra columns to billing_history table"""
    
    # Force usage of backend/isp_management.db
    BASE_DIR = Path(__file__).resolve().parent
    DATABASE_FILE = BASE_DIR / "isp_management.db"
    
    logger.info(f"Targeting Database: {DATABASE_FILE}")
    
    # Convert to URI
    db_url = f"sqlite:///{DATABASE_FILE}"
    
    engine = create_engine(db_url)
    
    logger.info("🔨 Running migration: Add billing_history extra columns")
    
    columns_to_add = [
        ("extra_items", "TEXT"),
        ("amount_paid", "FLOAT"),
        ("total_due", "FLOAT")
    ]
    
    with engine.connect() as connection:
        trans = connection.begin()
        try:
            # Check if table exists
            result = connection.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='billing_history'"))
            if not result.fetchone():
                logger.error("❌ Table 'billing_history' NOT FOUND!")
                return False

            for col_name, col_type in columns_to_add:
                try:
                    connection.execute(text(f"ALTER TABLE billing_history ADD COLUMN {col_name} {col_type}"))
                    logger.info(f"✅ Column '{col_name}' added successfully")
                except Exception as e:
                    if "duplicate column name" in str(e).lower():
                        logger.info(f"⚠️ Column '{col_name}' already exists. Skipping.")
                    else:
                        raise e
            
            trans.commit()
            return True
                    
        except Exception as e:
            trans.rollback()
            logger.error(f"❌ Migration failed: {str(e)}")
            return False

if __name__ == "__main__":
    success = migrate()
    if success:
        print("\n✅ Migration completed successfully!")
    else:
        print("\n❌ Migration failed!")
