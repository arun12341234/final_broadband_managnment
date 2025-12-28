"""
Migration: Add engineers table
Run this once to create the engineers table
"""

from sqlalchemy import create_engine, Column, String, Text
from sqlalchemy.ext.declarative import declarative_base
from database import DATABASE_URL, Base, engine
from models import Engineer
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate():
    """Create engineers table"""
    
    logger.info("🔨 Running migration: Add engineers table")
    
    try:
        # Create engineers table
        Base.metadata.create_all(bind=engine, tables=[Engineer.__table__])
        
        logger.info("✅ Engineers table created successfully")
        
        # Add sample engineer
        from database import SessionLocal
        db = SessionLocal()
        
        try:
            # Check if sample engineer exists
            existing = db.query(Engineer).filter(Engineer.mobile == "9876543210").first()
            
            if not existing:
                sample_engineer = Engineer(
                    id="eng_001",
                    name="Ravi Kumar",
                    mobile="9876543210",
                    password="ravi123",
                    email="ravi@4you.in",
                    specialization="Fiber Installation",
                    status="Active",
                    joining_date="2024-01-15",
                    address="Mumbai, Maharashtra",
                    emergency_contact="9876543211"
                )
                
                db.add(sample_engineer)
                db.commit()
                
                logger.info("✅ Sample engineer added:")
                logger.info(f"   Mobile: 9876543210")
                logger.info(f"   Password: ravi123")
            else:
                logger.info("⚠️  Sample engineer already exists")
                
        finally:
            db.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        return False


if __name__ == "__main__":
    success = migrate()
    if success:
        print("\n✅ Migration completed successfully!")
        print("\n📝 Sample Engineer Credentials:")
        print("   Mobile: 9876543210")
        print("   Password: ravi123")
    else:
        print("\n❌ Migration failed!")