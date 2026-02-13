
import os
import sys
from pathlib import Path
import logging
from sqlalchemy import text

# Add current directory to path to import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from pdf_generator import generate_invoice_pdf

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def regenerate_all_invoices():
    db = SessionLocal()
    try:
        # Fetch Billing Settings (Company Info)
        # Using raw SQL to be safe, though BillingSettings seemed fine in app.py
        try:

            billing_stmt = text("SELECT full_name, street, city, state, country, pin_code, gstin, contact_number, upi_id, mobile_no_1, mobile_no_2, telephone_no FROM billing_settings ORDER BY id DESC LIMIT 1")
            billing_row = db.execute(billing_stmt).first()
            
            company_data = None
            if billing_row:
                company_data = {
                    "name": billing_row[0],
                    "street": billing_row[1],
                    "city": billing_row[2],
                    "state": billing_row[3],
                    "country": billing_row[4],
                    "pin_code": billing_row[5],
                    "gstin": billing_row[6],
                    "contact_number": billing_row[7],
                    "upi_id": billing_row[8],
                    "mobile_no_1": billing_row[9],
                    "mobile_no_2": billing_row[10],
                    "telephone_no": billing_row[11]
                }
        except Exception as e:
            logger.warning(f"Could not fetch billing settings: {e}")
            company_data = None


        # Fetch Invoices using Raw SQL to avoid schema mismatch
        # Select only columns we know exist or need
        invoice_query = text("""
            SELECT 
                i.invoice_number, i.invoice_date, i.due_date, i.billing_period, 
                i.old_pending_amount, i.payment_status, i.plan_price, i.plan_name,
                i.plan_id, i.user_id
            FROM invoices i
        """)
        
        invoices = db.execute(invoice_query).all()
        logger.info(f"Found {len(invoices)} invoices to regenerate.")
        
        for inv in invoices:
            # Unpack invoice data
            # RowProxy/Row access by index or name
            invoice_number = inv.invoice_number
            user_id = inv.user_id
            
            # Fetch User Details using Raw SQL
            user_query = text("SELECT name, cs_id, phone, email, address, invoice_remarks FROM users WHERE id = :uid")
            user_row = db.execute(user_query, {"uid": user_id}).first()
            
            if not user_row:
                logger.warning(f"User not found for invoice {invoice_number}, skipping.")
                continue
                
            user_data = {
                "name": user_row.name,
                "cs_id": user_row.cs_id,
                "mobile": user_row.phone,
                "email": user_row.email or "",
                "address": user_row.address or ""
            }
            
            # Fetch Plan Details
            plan_data = {
                "name": inv.plan_name or "Broadband Plan",
                "speed": "N/A",
                "data_limit": "",
                "price": inv.plan_price
            }
            
            if inv.plan_id:
                plan_query = text("SELECT speed, data_limit FROM broadband_plans WHERE id = :pid")
                plan_row = db.execute(plan_query, {"pid": inv.plan_id}).first()
                if plan_row:
                    plan_data['speed'] = plan_row.speed
                    plan_data['data_limit'] = plan_row.data_limit

            billing_data = {
                "invoice_number": invoice_number,
                "invoice_date": inv.invoice_date,
                "due_date": inv.due_date,
                "billing_period": inv.billing_period,
                "old_pending": inv.old_pending_amount,
                "payment_status": inv.payment_status
            }
            
            # Generate PDF
            try:
                # Output to backend/exports explicitly
                output_dir = Path(__file__).parent / "exports"
                user_remarks = user_row.invoice_remarks or ""
                # Recalculate amounts
                subtotal = inv.plan_price + inv.old_pending_amount
                new_total = subtotal # No GST
                
                new_pdf_path = generate_invoice_pdf(user_data, plan_data, billing_data, company_data, output_dir=output_dir, remarks=user_remarks)
                
                # Update Database with new path and amounts
                update_stmt = text("""
                    UPDATE invoices 
                    SET subtotal = :sub, 
                        gst_rate = 0.0, 
                        gst_amount = 0.0, 
                        total_amount = :tot,
                        pdf_filepath = :pdf
                    WHERE invoice_number = :inum
                """)
                db.execute(update_stmt, {
                    "sub": subtotal, 
                    "tot": new_total, 
                    "inum": invoice_number,
                    "pdf": str(new_pdf_path)
                })
                db.commit()

                logger.info(f"Regenerated and Updated DB: {invoice_number} -> {new_pdf_path}")
            except Exception as e:
                logger.error(f"Failed to regenerate {invoice_number}: {e}")

    except Exception as e:
         logger.error(f"Critical error during regeneration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    regenerate_all_invoices()
