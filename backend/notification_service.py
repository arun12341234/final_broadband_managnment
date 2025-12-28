from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta, date
from database import SessionLocal
from models import User, BroadbandPlan
from email_service import send_plan_expiry_email, send_payment_due_email
from whatsapp_service import send_payment_reminder_whatsapp
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def send_payment_due_tomorrow_reminders():
    """Send reminders for payments due tomorrow (Email + WhatsApp)"""
    
    logger.info("🔔 Running payment due tomorrow notifications...")
    
    db = SessionLocal()
    try:
        tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Find users with payment due tomorrow
        users_with_payment_due = db.query(User).filter(
            User.payment_due_date == tomorrow,
            User.payment_status == "Pending"
        ).all()
        
        sent_count = 0
        for user in users_with_payment_due:
            plan = db.query(BroadbandPlan).filter(
                BroadbandPlan.id == user.broadband_plan_id
            ).first()
            
            if plan:
                # Send email
                send_payment_due_email(
                    user.name, 
                    user.email, 
                    plan.name, 
                    plan.price + user.old_pending_amount,
                    user.payment_due_date
                )
                
                # Send WhatsApp
                send_payment_reminder_whatsapp(
                    user.name,
                    user.phone,
                    plan.name,
                    plan.price + user.old_pending_amount,
                    user.payment_due_date
                )
                
                sent_count += 1
        
        logger.info(f"✅ Sent {sent_count} payment due tomorrow reminders")
        
    finally:
        db.close()


def send_plan_expiry_tomorrow_reminders():
    """Send reminders for plans expiring tomorrow"""
    
    logger.info("🔔 Running plan expiry tomorrow notifications...")
    
    db = SessionLocal()
    try:
        tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Find users with plans expiring tomorrow
        users_expiring_tomorrow = db.query(User).filter(
            User.plan_expiry_date == tomorrow,
            User.is_plan_active == True
        ).all()
        
        sent_count = 0
        for user in users_expiring_tomorrow:
            plan = db.query(BroadbandPlan).filter(
                BroadbandPlan.id == user.broadband_plan_id
            ).first()
            
            if plan:
                # Send WhatsApp reminder
                send_payment_reminder_whatsapp(
                    user.name,
                    user.phone,
                    plan.name,
                    plan.price,
                    user.plan_expiry_date
                )
                
                sent_count += 1
        
        logger.info(f"✅ Sent {sent_count} plan expiry tomorrow reminders")
        
    finally:
        db.close()


def send_expired_plan_notifications():
    """Send notifications for already expired plans"""
    
    logger.info("🔔 Running expired plan notifications...")
    
    db = SessionLocal()
    try:
        today = date.today().strftime("%Y-%m-%d")
        
        # Find users with expired plans
        expired_users = db.query(User).filter(
            User.plan_expiry_date < today,
            User.is_plan_active == False,
            User.status == "Expired"
        ).all()
        
        sent_count = 0
        for user in expired_users:
            plan = db.query(BroadbandPlan).filter(
                BroadbandPlan.id == user.broadband_plan_id
            ).first()
            
            if plan:
                send_plan_expiry_email(
                    user.name,
                    user.email,
                    plan.name,
                    user.plan_expiry_date
                )
                
                sent_count += 1
        
        logger.info(f"✅ Sent {sent_count} expired plan notifications")
        
    finally:
        db.close()


def send_all_notifications_with_payment_reminders():
    """Send all types of notifications"""
    
    logger.info("📧 Starting all notification tasks...")
    
    # Payment due tomorrow (Email + WhatsApp)
    send_payment_due_tomorrow_reminders()
    
    # Plan expiring tomorrow (WhatsApp)
    send_plan_expiry_tomorrow_reminders()
    
    # Already expired plans (Email)
    send_expired_plan_notifications()
    
    logger.info("✅ All notification tasks completed")
    
    return {
        "success": True,
        "message": "All notifications sent",
        "timestamp": datetime.now().isoformat()
    }


def start_scheduler():
    """Start the APScheduler with all jobs"""
    
    # Import here to avoid circular imports
    from plan_expiry_checker import check_and_expire_plans
    from backup import create_daily_backup
    
    # Job 1: Check and expire plans (Daily at 12:05 AM)
    scheduler.add_job(
        func=check_and_expire_plans,
        trigger="cron",
        hour=0,
        minute=5,
        id="check_expired_plans",
        name="Check and expire plans"
    )
    
    # Job 2: Daily backup (Daily at 2:00 AM)
    scheduler.add_job(
        func=create_daily_backup,
        trigger="cron",
        hour=2,
        minute=0,
        id="daily_backup",
        name="Daily database backup"
    )
    
    # Job 3: Send all notifications (Daily at 10:00 AM)
    scheduler.add_job(
        func=send_all_notifications_with_payment_reminders,
        trigger="cron",
        hour=10,
        minute=0,
        id="send_notifications",
        name="Send all notifications"
    )
    
    scheduler.start()
    
    logger.info("✅ Scheduler started with 3 jobs:")
    logger.info("   - 12:05 AM: Check expired plans")
    logger.info("   - 2:00 AM: Database backup")
    logger.info("   - 10:00 AM: Send notifications")