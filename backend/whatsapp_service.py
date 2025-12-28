import requests
import os
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# WhatsApp feature toggle
WHATSAPP_ENABLED = os.getenv("WHATSAPP_ENABLED", "false").lower() == "true"
TWILIO_ENABLED = os.getenv("TWILIO_ENABLED", "false").lower() == "true"

# WhatsApp Business API
WHATSAPP_API_URL = os.getenv("WHATSAPP_API_URL")
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_ID")
WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_WHATSAPP_NUMBER = os.getenv("TWILIO_WHATSAPP_NUMBER")


def send_payment_reminder_whatsapp(user_name: str, user_phone: str, plan_name: str, plan_price: float, expiry_date: str):
    """Send WhatsApp payment reminder with multiple provider support"""
    
    # Check if WhatsApp is enabled
    if not WHATSAPP_ENABLED and not TWILIO_ENABLED:
        logger.info(f"📱 WhatsApp disabled. Would send to {user_phone}: Payment reminder")
        return True  # Return True to not break workflow
    
    # Try Twilio first (easier to setup)
    if TWILIO_ENABLED:
        return _send_via_twilio(user_name, user_phone, plan_name, plan_price, expiry_date)
    
    # Fallback to WhatsApp Business API
    if WHATSAPP_ENABLED:
        return _send_via_whatsapp_business(user_name, user_phone, plan_name, plan_price, expiry_date)
    
    logger.warning("⚠️  No WhatsApp provider configured")
    return False


def _send_via_twilio(user_name: str, user_phone: str, plan_name: str, plan_price: float, expiry_date: str):
    """Send via Twilio WhatsApp API"""
    
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        logger.warning("⚠️  Twilio not configured")
        return False
    
    try:
        from twilio.rest import Client
        
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        message_body = f"""🔔 4You Broadband Payment Reminder

Hello {user_name}! 👋

Your {plan_name} plan is expiring tomorrow!
Amount Due: ₹{int(plan_price):,}
Expiry: {expiry_date}

Please renew to continue service.

Pay now: http://localhost:5174"""
        
        message = client.messages.create(
            from_=TWILIO_WHATSAPP_NUMBER,
            body=message_body,
            to=f'whatsapp:+91{user_phone}'
        )
        
        logger.info(f"✅ WhatsApp sent via Twilio to {user_name} ({user_phone})")
        return True
        
    except Exception as e:
        logger.error(f"❌ Twilio WhatsApp error: {str(e)}")
        return False


def _send_via_whatsapp_business(user_name: str, user_phone: str, plan_name: str, plan_price: float, expiry_date: str):
    """Send via WhatsApp Business API"""
    
    if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_ID:
        logger.warning("⚠️  WhatsApp Business API not configured")
        return False
    
    formatted_phone = f"91{user_phone}"
    amount = f"₹{int(plan_price):,}"
    expiry_dt = datetime.strptime(expiry_date, "%Y-%m-%d")
    expiry_formatted = expiry_dt.strftime("%d %B %Y")
    
    message = f"""🔔 *4You Broadband Payment Reminder*

Hello {user_name}! 👋

Your broadband plan is expiring tomorrow!

📦 *Plan Details:*
- Plan: {plan_name}
- Amount Due: {amount}
- Expiry Date: {expiry_formatted}

⚠️ *Action Required:*
Please make payment to continue uninterrupted service.

💳 *Payment Options:*
- UPI: Pay via Customer Portal
- Cash: Visit our office
- Online: Login at customer portal

🌐 Customer Portal: http://localhost:5174
📞 Support: 1800-4YOU-NET

Thank you for choosing 4You Broadband! 🙏"""
    
    try:
        url = f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_ID}/messages"
        
        headers = {
            "Authorization": f"Bearer {WHATSAPP_TOKEN}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_phone,
            "type": "text",
            "text": {
                "preview_url": True,
                "body": message
            }
        }
        
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 200:
            logger.info(f"✅ WhatsApp sent via Business API to {user_name} ({user_phone})")
            return True
        else:
            logger.error(f"❌ WhatsApp API error: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"❌ WhatsApp Business API error: {str(e)}")
        return False


def test_whatsapp_configuration() -> dict:
    """Test WhatsApp configuration"""
    
    if not WHATSAPP_ENABLED and not TWILIO_ENABLED:
        return {
            "status": "disabled",
            "message": "WhatsApp feature is disabled in configuration"
        }
    
    if TWILIO_ENABLED:
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            return {
                "status": "not_configured",
                "message": "Twilio credentials not configured"
            }
        return {
            "status": "configured",
            "provider": "Twilio",
            "message": "Twilio WhatsApp is configured"
        }
    
    if WHATSAPP_ENABLED:
        if not WHATSAPP_TOKEN or not WHATSAPP_PHONE_ID:
            return {
                "status": "not_configured",
                "message": "WhatsApp Business API credentials not configured"
            }
        return {
            "status": "configured",
            "provider": "WhatsApp Business API",
            "message": "WhatsApp Business API is configured"
        }
    
    return {
        "status": "error",
        "message": "No provider configured"
    }