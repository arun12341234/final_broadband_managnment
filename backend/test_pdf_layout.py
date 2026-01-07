from pdf_generator import generate_invoice_pdf
from pathlib import Path
import os
import sys

# Configure mock data
test_user = {
    "name": "Rajesh Kumar",
    "cs_id": "CS_1234",
    "mobile": "9876543210",
    "email": "rajesh@example.com",
    "address": "123 MG Road, Mumbai, Maharashtra 400001"
}

test_plan = {
    "name": "Premium Unlimited",
    "speed": "300 Mbps",
    "data_limit": "Unlimited",
    "price": 1200
}

test_billing = {
    "invoice_number": "INV-TEST-001",
    "invoice_date": "15-Dec-2024",
    "due_date": "30-Dec-2024",
    "billing_period": "December 2024",
    "old_pending": 0,
    "payment_status": "Pending"
}

test_company = {
    "street": "Test Street",
    "city": "Test City",
    "state": "Test State",
    "country": "Test Country",
    "pin_code": "123456",
    # "gstin": "GST1234", # Uncomment to test with GST
    "gstin": "", # Empty to test without GST
}

output_dir = Path("test_exports")
output_dir.mkdir(exist_ok=True)

# Test 1: With Remarks and No GST
try:
    path = generate_invoice_pdf(
        test_user, 
        test_plan, 
        test_billing, 
        company_data=test_company, 
        output_dir=output_dir,
        remarks="Adjusted for downtime during maintenance."
    )
    print(f"Generated Test PDF: {path}")
except Exception as e:
    print(f"Error generating PDF: {e}")
