import pandas as pd
from pathlib import Path
from datetime import datetime
from sqlalchemy.orm import Session
from models import User, BroadbandPlan, Engineer, BillingHistory
import logging

logger = logging.getLogger(__name__)


def export_users_to_excel(db: Session, output_dir: Path = None):
    """
    Export all users to Excel file
    
    Args:
        db: Database session
        output_dir: Output directory (default: exports/)
    
    Returns:
        str: Path to generated Excel file
    """
    
    if output_dir is None:
        output_dir = Path("exports")
    
    output_dir.mkdir(exist_ok=True)
    
    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"users_export_{timestamp}.xlsx"
    filepath = output_dir / filename
    
    # Fetch all users with plan details
    users = db.query(User).all()
    
    # Prepare data
    data = []
    for user in users:
        plan = db.query(BroadbandPlan).filter(
            BroadbandPlan.id == user.broadband_plan_id
        ).first()
        
        data.append({
            "Customer ID": user.cs_id,
            "Name": user.name,
            "Mobile": user.phone,
            "Email": user.email,
            "Address": user.address,
            "Plan": plan.name if plan else "N/A",
            "Plan Price": plan.price if plan else 0,
            "Plan Speed": plan.speed if plan else "N/A",
            "Payment Status": user.payment_status,
            "Old Pending": user.old_pending_amount,
            "Payment Due Date": user.payment_due_date,
            "Plan Start": user.plan_start_date,
            "Plan Expiry": user.plan_expiry_date,
            "Is Active": "Yes" if user.is_plan_active else "No",
            "Status": user.status,
            "Created Date": user.created_at
        })
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Create Excel writer with multiple sheets
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        # Users sheet
        df.to_excel(writer, sheet_name='Users', index=False)
        
        # Get worksheet
        worksheet = writer.sheets['Users']
        
        # Auto-adjust column widths
        for idx, col in enumerate(df.columns):
            max_length = max(
                df[col].astype(str).apply(len).max(),
                len(col)
            ) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = max_length
        
        # Add summary sheet
        summary_data = {
            "Metric": [
                "Total Users",
                "Active Users",
                "Expired Users",
                "Pending Installation",
                "Pending Payments",
                "Total Outstanding",
                "Export Date"
            ],
            "Value": [
                len(users),
                len([u for u in users if u.is_plan_active]),
                len([u for u in users if u.status == "Expired"]),
                len([u for u in users if u.status == "Pending Installation"]),
                len([u for u in users if u.payment_status == "Pending"]),
                sum([u.old_pending_amount for u in users]),
                datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ]
        }
        
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, sheet_name='Summary', index=False)
    
    logger.info(f"✅ Excel export created: {filename} ({len(users)} users)")
    
    return str(filepath)


def export_billing_history_to_excel(db: Session, output_dir: Path = None):
    """
    Export billing history to Excel file
    
    Args:
        db: Database session
        output_dir: Output directory (default: exports/)
    
    Returns:
        str: Path to generated Excel file
    """
    
    if output_dir is None:
        output_dir = Path("exports")
    
    output_dir.mkdir(exist_ok=True)
    
    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"billing_history_{timestamp}.xlsx"
    filepath = output_dir / filename
    
    # Fetch billing history
    history = db.query(BillingHistory).order_by(BillingHistory.created_at.desc()).all()
    
    # Prepare data
    data = []
    for record in history:
        user = db.query(User).filter(User.id == record.user_id).first()
        
        data.append({
            "Date": record.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "Customer ID": user.cs_id if user else "N/A",
            "Customer Name": user.name if user else "Deleted User",
            "Admin Email": record.admin_email,
            "Change Type": record.change_type,
            "Previous Payment Status": record.previous_payment_status,
            "New Payment Status": record.new_payment_status,
            "Previous Pending": record.previous_old_pending_amount,
            "New Pending": record.new_old_pending_amount,
            "Previous Due Date": record.previous_payment_due_date,
            "New Due Date": record.new_payment_due_date,
            "Previous Plan": record.previous_plan_name,
            "New Plan": record.new_plan_name,
            "Notes": record.notes
        })
    
    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Save to Excel
    df.to_excel(filepath, sheet_name='Billing History', index=False)
    
    logger.info(f"✅ Billing history export created: {filename} ({len(history)} records)")
    
    return str(filepath)


if __name__ == "__main__":
    # Test export (requires database connection)
    from database import SessionLocal
    
    db = SessionLocal()
    try:
        filepath = export_users_to_excel(db)
        print(f"Test export created: {filepath}")
    finally:
        db.close()