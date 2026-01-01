import pandas as pd
from pathlib import Path
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import User, BroadbandPlan, Engineer, BillingHistory, Invoice
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


def export_financial_report_to_excel(db: Session, output_dir: Path = None):
    """
    Export a comprehensive financial report to Excel with multiple sheets:
    - Summary: KPIs like total revenue, GST collected, pending collection, old debt
    - Invoices: Detailed invoice list for the selected period (defaults to all)
    - Pending Users: Users with pending payments and their plan price + old pending

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
    filename = f"financial_report_{timestamp}.xlsx"
    filepath = output_dir / filename

    # Fetch data
    invoices = db.query(Invoice).order_by(Invoice.created_at.desc()).all()
    users = db.query(User).all()

    # Prepare invoices data
    invoices_data = []
    total_revenue = 0.0
    total_gst = 0.0

    for inv in invoices:
        total_revenue += float(inv.total_amount or 0)
        total_gst += float(inv.gst_amount or 0)
        invoices_data.append({
            "Invoice Number": inv.invoice_number,
            "Customer ID": inv.user.cs_id if inv.user else "N/A",
            "Customer Name": inv.user.name if inv.user else "N/A",
            "Plan": inv.plan_name,
            "Plan Price": inv.plan_price,
            "Old Pending": inv.old_pending_amount,
            "Subtotal": inv.subtotal,
            "GST %": inv.gst_rate,
            "GST Amount": inv.gst_amount,
            "Total": inv.total_amount,
            "Payment Status": inv.payment_status,
            "Payment Method": inv.payment_method or "",
            "Payment Date": inv.payment_date or "",
            "Invoice Date": inv.invoice_date,
            "Due Date": inv.due_date,
            "Billing Period": inv.billing_period,
            "Generated By": inv.generated_by,
            "Created At": inv.created_at.strftime("%Y-%m-%d %H:%M:%S") if inv.created_at else ""
        })

    # Prepare pending users data
    pending_users = [u for u in users if (u.payment_status or "").lower() == "pending"]
    pending_collection = 0.0
    pending_data = []
    for u in pending_users:
        plan = db.query(BroadbandPlan).filter(BroadbandPlan.id == u.broadband_plan_id).first()
        current_charge = float(plan.price) if plan else 0.0
        total_due = current_charge + float(u.old_pending_amount or 0)
        pending_collection += total_due
        pending_data.append({
            "Customer ID": u.cs_id,
            "Name": u.name,
            "Mobile": u.phone,
            "Plan": plan.name if plan else "N/A",
            "Current Charges": current_charge,
            "Old Pending": u.old_pending_amount or 0,
            "Total Due": total_due,
            "Payment Due Date": u.payment_due_date,
            "Status": u.status
        })

    # Compute old debt
    total_old_debt = sum([float(u.old_pending_amount or 0) for u in users])

    # Build summary
    summary_df = pd.DataFrame({
        "Metric": [
            "Total Invoices",
            "Total Revenue (incl. GST)",
            "GST Collected",
            "Pending Payments Count",
            "Pending Collection (est.)",
            "Total Old Debt",
            "Report Generated"
        ],
        "Value": [
            len(invoices),
            round(total_revenue, 2),
            round(total_gst, 2),
            len(pending_users),
            round(pending_collection, 2),
            round(total_old_debt, 2),
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ]
    })

    # DataFrames for sheets
    invoices_df = pd.DataFrame(invoices_data)
    pending_df = pd.DataFrame(pending_data)

    # Write Excel with multiple sheets
    with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
        summary_df.to_excel(writer, sheet_name="Summary", index=False)
        if not invoices_df.empty:
            invoices_df.to_excel(writer, sheet_name="Invoices", index=False)
        else:
            pd.DataFrame({"Info": ["No invoices found"]}).to_excel(writer, sheet_name="Invoices", index=False)
        if not pending_df.empty:
            pending_df.to_excel(writer, sheet_name="Pending Users", index=False)
        else:
            pd.DataFrame({"Info": ["No pending users"]}).to_excel(writer, sheet_name="Pending Users", index=False)

        # Auto width for Summary
        sheet = writer.sheets.get("Summary")
        if sheet:
            for idx, col in enumerate(summary_df.columns, start=1):
                max_length = max(summary_df[col].astype(str).apply(len).max(), len(col)) + 2
                sheet.column_dimensions[chr(64 + idx)].width = max_length

    logger.info(f"✅ Financial report export created: {filename} (Invoices: {len(invoices)}, Pending users: {len(pending_users)})")

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