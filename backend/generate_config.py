#!/usr/bin/env python3
"""
Generate secure configuration for first-time setup
Run: python generate_config.py
"""

import secrets
import string
from pathlib import Path


def generate_secret_key():
    """Generate cryptographically secure secret key"""
    return secrets.token_hex(32)


def generate_strong_password(length=16):
    """Generate strong random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def create_env_file():
    """Create .env file with secure defaults"""
    
    env_file = Path("backend/.env") if Path("backend").exists() else Path(".env")
    
    if env_file.exists():
        response = input("⚠️  .env file already exists. Overwrite? (yes/no): ")
        if response.lower() != 'yes':
            print("❌ Cancelled. Keeping existing .env file.")
            return
    
    print("🔐 Generating secure configuration...\n")
    
    # Generate secure values
    secret_key = generate_secret_key()
    admin_password = generate_strong_password()
    
    # Read template
    template_file = Path("backend/.env.example") if Path("backend/.env.example").exists() else Path(".env.example")
    
    if not template_file.exists():
        print("❌ .env.example not found!")
        print("Creating basic .env file...")
        
        # Create basic .env content
        content = f"""# Database
DATABASE_URL=sqlite:///./isp_management.db

# Security
SECRET_KEY={secret_key}
ADMIN_EMAIL=admin@4you.in
ADMIN_PASSWORD={admin_password}
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Email
EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# WhatsApp
WHATSAPP_ENABLED=false

# CORS
FRONTEND_ADMIN_URL=http://localhost:5173
FRONTEND_CUSTOMER_URL=http://localhost:5174
FRONTEND_ENGINEER_URL=http://localhost:5175

# Limits
MAX_PHOTO_SIZE=5242880
MAX_DOCUMENT_SIZE=10485760
RATE_LIMIT_ENABLED=true
"""
    else:
        with open(template_file, 'r') as f:
            content = f.read()
        
        # Replace placeholders
        content = content.replace(
            "SECRET_KEY=CHANGE_THIS_TO_RANDOM_32_CHAR_HEX_STRING",
            f"SECRET_KEY={secret_key}"
        )
        content = content.replace(
            "ADMIN_PASSWORD=CHANGE_THIS_TO_STRONG_PASSWORD",
            f"ADMIN_PASSWORD={admin_password}"
        )
    
    # Write .env file
    with open(env_file, 'w') as f:
        f.write(content)
    
    print("✅ Configuration generated successfully!\n")
    print("=" * 60)
    print("🔑 IMPORTANT - SAVE THESE CREDENTIALS:")
    print("=" * 60)
    print(f"\n📧 Admin Email: admin@4you.in")
    print(f"🔐 Admin Password: {admin_password}")
    print(f"\n⚠️  Save these credentials in a secure location!")
    print(f"⚠️  The password will NOT be shown again!\n")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("1. Update SMTP settings in .env (for email)")
    print("2. Update WhatsApp settings if needed (optional)")
    print("3. Run migrations:")
    print("   python migrate_add_engineers.py")
    print("   python migrate_add_billing_history.py")
    print("   python migrate_add_installations.py")
    print("4. Run: python app.py")
    print("\n✅ Setup complete!")


if __name__ == "__main__":
    create_env_file()