"""
Migration: Add installations table
Run this once to create the installations table
"""

from database import Base, engine
from models import Installation
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate():
    """Create installations table"""
    
    logger.info("🔨 Running migration: Add installations table")
    
    try:
        # Create installations table
        Base.metadata.create_all(bind=engine, tables=[Installation.__table__])
        
        logger.info("✅ Installations table created successfully")
        
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