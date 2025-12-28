import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# Email feature toggle
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "true").lower() == "true"

# SMTP Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", "4You Broadband <noreply@4you.in>")


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Send email with error handling and feature toggle
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    
    # Check if email is enabled
    if not EMAIL_ENABLED:
        logger.info(f"📧 Email disabled. Would send to {to_email}: {subject}")
        return True  # Return True to not break workflow
    
    # Check if SMTP is configured
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("⚠️  SMTP not configured. Email not sent.")
        return False
    
    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = SMTP_FROM
        message["To"] = to_email
        
        # Add HTML body
        html_part = MIMEText(body, "html")
        message.attach(html_part)
        
        # Connect and send
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message)
        
        logger.info(f"✅ Email sent to {to_email}: {subject}")
        return True
        
    except smtplib.SMTPAuthenticationError:
        logger.error(f"❌ SMTP Authentication failed. Check SMTP_USER and SMTP_PASSWORD")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"❌ SMTP error sending email to {to_email}: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error sending email to {to_email}: {str(e)}")
        return False


def test_email_configuration() -> dict:
    """
    Test email configuration
    
    Returns:
        dict: Status and message
    """
    
    if not EMAIL_ENABLED:
        return {
            "status": "disabled",
            "message": "Email feature is disabled in configuration"
        }
    
    if not SMTP_USER or not SMTP_PASSWORD:
        return {
            "status": "not_configured",
            "message": "SMTP credentials not configured. Please update .env file."
        }
    
    try:
        # Try to connect
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
        
        return {
            "status": "success",
            "message": f"SMTP connection successful. Ready to send from {SMTP_USER}"
        }
        
    except smtplib.SMTPAuthenticationError:
        return {
            "status": "auth_error",
            "message": "SMTP authentication failed. Check credentials."
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Connection failed: {str(e)}"
        }


def send_plan_expiry_email(user_name: str, user_email: str, plan_name: str, expiry_date: str):
    """Send email notification for plan expiry"""
    
    subject = "🔔 4You Broadband - Plan Expired"
    
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #F97316;">4You Broadband</h2>
            
            <p>Dear {user_name},</p>
            
            <p>Your broadband plan has expired.</p>
            
            <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #D97706;">Plan Details:</h3>
                <ul>
                    <li><strong>Plan:</strong> {plan_name}</li>
                    <li><strong>Expired on:</strong> {expiry_date}</li>
                </ul>
            </div>
            
            <p><strong>Action Required:</strong></p>
            <p>Please make payment to continue uninterrupted service.</p>
            
            <p>You can pay via:</p>
            <ul>
                <li>UPI/Online: Login to customer portal</li>
                <li>Cash: Visit our office</li>
            </ul>
            
            <p>Thank you for choosing 4You Broadband!</p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="font-size: 12px; color: #666;">
                4You Broadband<br>
                Support: 1800-4YOU-NET<br>
                Email: support@4you.in
            </p>
        </div>
    </body>
    </html>
    """
    
    return send_email(user_email, subject, body)


def send_payment_due_email(user_name: str, user_email: str, plan_name: str, amount: float, due_date: str):
    """Send email notification for payment due tomorrow"""
    
    subject = "⚠️ 4You Broadband - Payment Due Tomorrow"
    
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #F97316;">4You Broadband</h2>
            
            <p>Dear {user_name},</p>
            
            <p>This is a reminder that your payment is due tomorrow.</p>
            
            <div style="background-color: #DBEAFE; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1E40AF;">Payment Details:</h3>
                <ul>
                    <li><strong>Plan:</strong> {plan_name}</li>
                    <li><strong>Amount Due:</strong> ₹{int(amount):,}</li>
                    <li><strong>Due Date:</strong> {due_date}</li>
                </ul>
            </div>
            
            <p><strong>Pay Now to Avoid Service Interruption</strong></p>
            
            <p>Payment Options:</p>
            <ul>
                <li>UPI: Pay via Customer Portal</li>
                <li>Card/NetBanking: Login at customer.4you.in</li>
                <li>Cash: Visit our office</li>
            </ul>
            
            <p>Thank you for your prompt attention!</p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="font-size: 12px; color: #666;">
                4You Broadband<br>
                Support: 1800-4YOU-NET<br>
                Email: support@4you.in
            </p>
        </div>
    </body>
    </html>
    """
    
    return send_email(user_email, subject, body)