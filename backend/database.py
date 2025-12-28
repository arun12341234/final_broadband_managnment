from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Use absolute path for database
BASE_DIR = Path(__file__).resolve().parent
DATABASE_FILE = BASE_DIR / "isp_management.db"

# Database URL
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    f"sqlite:///{DATABASE_FILE}"
)

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()