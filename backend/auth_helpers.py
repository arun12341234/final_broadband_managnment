from fastapi import Depends, HTTPException, status, Header
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from models import User, Engineer, Admin
from database import get_db
import os
import logging

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"


def get_token_from_header(authorization: str = Header(None)) -> str:
    """Extract and validate token from Authorization header"""
    
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Use: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return authorization.replace("Bearer ", "")


async def get_current_customer(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated customer"""
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = get_token_from_header(authorization)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        
        if user_id is None or role != "customer":
            logger.warning(f"Invalid token role: {role}")
            raise credentials_exception
            
    except JWTError as e:
        logger.warning(f"JWT decode error: {str(e)}")
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        logger.warning(f"User not found: {user_id}")
        raise credentials_exception
    
    if user.status == "Suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Please contact support."
        )
    
    return user


async def get_current_engineer(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> Engineer:
    """Get current authenticated engineer"""
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = get_token_from_header(authorization)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        engineer_id: str = payload.get("sub")
        role: str = payload.get("role")
        
        if engineer_id is None or role != "engineer":
            logger.warning(f"Invalid token role: {role}")
            raise credentials_exception
            
    except JWTError as e:
        logger.warning(f"JWT decode error: {str(e)}")
        raise credentials_exception
    
    engineer = db.query(Engineer).filter(Engineer.id == engineer_id).first()
    
    if engineer is None:
        logger.warning(f"Engineer not found: {engineer_id}")
        raise credentials_exception
    
    if engineer.status != "Active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your engineer account is {engineer.status}. Please contact admin."
        )
    
    return engineer


async def get_current_admin(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
) -> Admin:
    """Get current authenticated admin"""
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = get_token_from_header(authorization)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id: str = payload.get("sub")
        role: str = payload.get("role")
        
        if admin_id is None or role != "admin":
            logger.warning(f"Invalid token role: {role}")
            raise credentials_exception
            
    except JWTError as e:
        logger.warning(f"JWT decode error: {str(e)}")
        raise credentials_exception
    
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    
    if admin is None:
        logger.warning(f"Admin not found: {admin_id}")
        raise credentials_exception
    
    return admin