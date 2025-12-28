from datetime import date, timedelta
from database import SessionLocal
from models import User
import logging

logger = logging.getLogger(__name__)


def check_and_expire_plans():
    """
    Check for expired plans and update status
    Runs daily at 12:05 AM via scheduler
    """
    
    logger.info("🔍 Checking for expired plans...")
    
    db = SessionLocal()
    try:
        today = date.today().strftime("%Y-%m-%d")
        
        # Find users with expired plans
        expired_users = db.query(User).filter(
            User.plan_expiry_date <= today,
            User.is_plan_active == True
        ).all()
        
        expired_count = 0
        
        for user in expired_users:
            logger.info(f"⏰ Expiring plan for: {user.name} (Expiry: {user.plan_expiry_date})")
            
            # Mark plan as expired
            user.is_plan_active = False
            user.status = "Expired"
            
            # Reset payment status to Pending for next cycle
            user.payment_status = "Pending"
            
            # Set new payment due date (15 days from today)
            new_due_date = (date.today() + timedelta(days=15)).strftime("%Y-%m-%d")
            user.payment_due_date = new_due_date
            
            # Keep old_pending_amount as is (customer still owes it)
            
            expired_count += 1
        
        db.commit()
        
        logger.info(f"✅ Expired {expired_count} plans")
        
        return {
            "success": True,
            "expired_count": expired_count,
            "message": f"Successfully expired {expired_count} plans"
        }
        
    except Exception as e:
        logger.error(f"❌ Error checking expired plans: {str(e)}")
        db.rollback()
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        db.close()


if __name__ == "__main__":
    # Allow manual execution
    result = check_and_expire_plans()
    print(result)