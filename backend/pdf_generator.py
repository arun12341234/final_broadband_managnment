from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from datetime import datetime
from pathlib import Path
import qrcode
import io
import logging

logger = logging.getLogger(__name__)


def generate_invoice_pdf(user_data: dict, plan_data: dict, billing_data: dict, output_dir: Path = None):
    """
    Generate professional invoice PDF
    
    Args:
        user_data: Dict with user information
        plan_data: Dict with plan information
        billing_data: Dict with billing information
        output_dir: Output directory (default: exports/)
    
    Returns:
        str: Path to generated PDF
    """
    
    if output_dir is None:
        output_dir = Path("exports")
    
    output_dir.mkdir(exist_ok=True)
    
    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    invoice_number = billing_data.get("invoice_number", f"INV-{timestamp}")
    filename = f"invoice_{invoice_number}.pdf"
    filepath = output_dir / filename
    
    # Create PDF
    doc = SimpleDocTemplate(str(filepath), pagesize=A4)
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#F97316'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    # Header
    elements.append(Paragraph("4You Broadband", title_style))
    elements.append(Paragraph("TAX INVOICE", styles['Heading2']))
    elements.append(Spacer(1, 0.3 * inch))
    
    # Company & Customer Info
    info_data = [
        ["From:", "To:"],
        ["4You Broadband", user_data.get("name", "")],
        ["Mumbai, Maharashtra", user_data.get("address", "")],
        ["India - 400001", f"Mobile: {user_data.get('mobile', '')}"],
        ["GSTIN: 27XXXXX1234X1Z5", f"Email: {user_data.get('email', '')}"],
    ]
    
    info_table = Table(info_data, colWidths=[3 * inch, 3 * inch])
    info_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
        ('FONT', (0, 1), (-1, -1), 'Helvetica', 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
    ]))
    
    elements.append(info_table)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Invoice Details
    invoice_details = [
        ["Invoice Number:", invoice_number],
        ["Invoice Date:", billing_data.get("invoice_date", datetime.now().strftime("%d-%b-%Y"))],
        ["Due Date:", billing_data.get("due_date", "")],
        ["Customer ID:", user_data.get("cs_id", "")],
    ]
    
    details_table = Table(invoice_details, colWidths=[2 * inch, 3 * inch])
    details_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 9),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ]))
    
    elements.append(details_table)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Items Table
    items_data = [
        ["#", "Description", "Period", "Amount (₹)"]
    ]
    
    # Add plan item
    items_data.append([
        "1",
        f"{plan_data.get('name', 'Broadband Plan')}\n{plan_data.get('speed', '')} - {plan_data.get('data_limit', '')}",
        billing_data.get("billing_period", datetime.now().strftime("%B %Y")),
        f"{plan_data.get('price', 0):,.2f}"
    ])
    
    # Add old pending if exists
    old_pending = billing_data.get("old_pending", 0)
    if old_pending > 0:
        items_data.append([
            "2",
            "Previous Outstanding",
            "Arrears",
            f"{old_pending:,.2f}"
        ])
    
    # Calculate totals
    subtotal = plan_data.get('price', 0) + old_pending
    gst_rate = 18
    gst_amount = subtotal * gst_rate / 100
    total_amount = subtotal + gst_amount
    
    # Add subtotal and GST
    items_data.append(["", "", "Subtotal:", f"{subtotal:,.2f}"])
    items_data.append(["", "", f"GST ({gst_rate}%):", f"{gst_amount:,.2f}"])
    items_data.append(["", "", "Total Amount:", f"{total_amount:,.2f}"])
    
    items_table = Table(items_data, colWidths=[0.5 * inch, 3 * inch, 1.5 * inch, 1.5 * inch])
    items_table.setStyle(TableStyle([
        # Header row
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F97316')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
        
        # Data rows
        ('FONT', (0, 1), (-1, -4), 'Helvetica', 9),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (-1, 0), (-1, -1), 'RIGHT'),
        
        # Totals rows
        ('FONT', (0, -3), (-1, -1), 'Helvetica-Bold', 10),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#FEF3C7')),
        
        # Grid
        ('GRID', (0, 0), (-1, -4), 0.5, colors.grey),
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    
    elements.append(items_table)
    elements.append(Spacer(1, 0.5 * inch))
    
    # Payment Information
    payment_info = Paragraph(
        "<b>Payment Information:</b><br/>"
        "UPI: 4youbroadband@upi<br/>"
        "Account: 1234567890<br/>"
        "IFSC: HDFC0001234<br/>"
        "Bank: HDFC Bank, Mumbai",
        styles['Normal']
    )
    elements.append(payment_info)
    elements.append(Spacer(1, 0.3 * inch))
    
    # Generate QR Code for UPI payment
    try:
        upi_string = f"upi://pay?pa=4youbroadband@upi&pn=4You Broadband&am={total_amount}&cu=INR"
        qr = qrcode.QRCode(version=1, box_size=3, border=2)
        qr.add_data(upi_string)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to ReportLab Image
        img_buffer = io.BytesIO()
        qr_img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        qr_image = Image(img_buffer, width=1.5*inch, height=1.5*inch)
        elements.append(qr_image)
        elements.append(Paragraph("Scan to Pay via UPI", styles['Normal']))
    except Exception as e:
        logger.warning(f"⚠️  QR code generation failed: {str(e)}")
    
    elements.append(Spacer(1, 0.3 * inch))
    
    # Footer
    footer_text = Paragraph(
        "<para align=center>"
        "<b>Thank you for choosing 4You Broadband!</b><br/>"
        "For support: 1800-4YOU-NET | support@4you.in<br/>"
        "<font size=8>This is a computer-generated invoice and does not require a signature.</font>"
        "</para>",
        styles['Normal']
    )
    elements.append(footer_text)
    
    # Build PDF
    doc.build(elements)
    
    logger.info(f"✅ Invoice PDF generated: {filename}")
    
    return str(filepath)


def generate_receipt_pdf(payment_data: dict, user_data: dict, output_dir: Path = None):
    """
    Generate payment receipt PDF
    
    Args:
        payment_data: Dict with payment information
        user_data: Dict with user information
        output_dir: Output directory (default: exports/)
    
    Returns:
        str: Path to generated PDF
    """
    
    if output_dir is None:
        output_dir = Path("exports")
    
    output_dir.mkdir(exist_ok=True)
    
    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    receipt_number = payment_data.get("receipt_number", f"RCP-{timestamp}")
    filename = f"receipt_{receipt_number}.pdf"
    filepath = output_dir / filename
    
    # Create PDF
    doc = SimpleDocTemplate(str(filepath), pagesize=A4)
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#10B981'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    # Header
    elements.append(Paragraph("4You Broadband", title_style))
    elements.append(Paragraph("PAYMENT RECEIPT", styles['Heading2']))
    elements.append(Spacer(1, 0.3 * inch))
    
    # Receipt Details
    receipt_data = [
        ["Receipt Number:", receipt_number],
        ["Payment Date:", payment_data.get("payment_date", datetime.now().strftime("%d-%b-%Y"))],
        ["Customer Name:", user_data.get("name", "")],
        ["Customer ID:", user_data.get("cs_id", "")],
        ["Mobile:", user_data.get("mobile", "")],
    ]
    
    receipt_table = Table(receipt_data, colWidths=[2 * inch, 3 * inch])
    receipt_table.setStyle(TableStyle([
        ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
    ]))
    
    elements.append(receipt_table)
    elements.append(Spacer(1, 0.5 * inch))
    
    # Payment Details Table
    payment_details = [
        ["Description", "Amount (₹)"],
        ["Amount Paid", f"{payment_data.get('amount', 0):,.2f}"],
        ["Payment Method", payment_data.get("payment_method", "")],
        ["Transaction ID", payment_data.get("transaction_id", "N/A")],
    ]
    
    payment_table = Table(payment_details, colWidths=[3 * inch, 2 * inch])
    payment_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#10B981')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 11),
        ('FONT', (0, 1), (-1, -1), 'Helvetica', 10),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ALIGN', (-1, 1), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    
    elements.append(payment_table)
    elements.append(Spacer(1, 0.5 * inch))
    
    # Success Message
    success_msg = Paragraph(
        "<para align=center>"
        "<font size=14 color='#10B981'><b>✓ Payment Received Successfully</b></font><br/>"
        "<font size=10>Thank you for your payment!</font>"
        "</para>",
        styles['Normal']
    )
    elements.append(success_msg)
    elements.append(Spacer(1, 0.5 * inch))
    
    # Footer
    footer_text = Paragraph(
        "<para align=center>"
        "For any queries, contact: 1800-4YOU-NET | support@4you.in<br/>"
        "<font size=8>This is a computer-generated receipt.</font>"
        "</para>",
        styles['Normal']
    )
    elements.append(footer_text)
    
    # Build PDF
    doc.build(elements)
    
    logger.info(f"✅ Receipt PDF generated: {filename}")
    
    return str(filepath)


if __name__ == "__main__":
    # Test invoice generation
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
        "invoice_number": "INV-2024-001",
        "invoice_date": "15-Dec-2024",
        "due_date": "30-Dec-2024",
        "billing_period": "December 2024",
        "old_pending": 500
    }
    
    pdf_path = generate_invoice_pdf(test_user, test_plan, test_billing)
    print(f"Test invoice created: {pdf_path}")