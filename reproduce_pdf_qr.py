
import logging
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from pdf_generator import generate_invoice_pdf

# Configure logging to stdout
logging.basicConfig(stream=sys.stdout, level=logging.INFO)

def test_generate_pdf():
    print("Starting PDF generation test...")
    
    test_user = {
        "name": "Test User",
        "cs_id": "CS_TEST_001",
        "mobile": "9999999999",
        "email": "test@example.com",
        "address": "123 Test St, Test City"
    }
    
    test_plan = {
        "name": "Test Plan",
        "speed": "100 Mbps",
        "data_limit": "Unlimited",
        "price": 1000
    }
    
    test_billing = {
        "invoice_number": "INV-TEST-QR-001",
        "invoice_date": "25-Jan-2026",
        "due_date": "5-Feb-2026",
        "billing_period": "January 2026",
        "amount_paid": 0,
        "payment_status": "Pending"
    }
    
    # Test with company data having UPI ID
    company_data = {
        "name": "Test Broadband",
        "upi_id": "testbackend@upi",  # Explicit UPI ID
        "street": "Company St",
        "city": "Mumbai",
        "state": "MH",
        "country": "India",
        "pin_code": "400001"
    }
    
    output_dir = Path("test_exports")
    output_dir.mkdir(exist_ok=True)
    
    try:
        pdf_path = generate_invoice_pdf(test_user, test_plan, test_billing, company_data, output_dir)
        print(f"PDF Generated at: {pdf_path}")
    except Exception as e:
        print(f"Error generating PDF: {e}")

if __name__ == "__main__":
    test_generate_pdf()
