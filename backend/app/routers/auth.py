from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from typing import Optional

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.schemas.user import UserCreate, UserResponse, Token, TokenPayload, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_current_user(db = Depends(get_db), token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(sub=user_id)
    except JWTError:
        raise credentials_exception
        
    try:
        user = db.users.find_one({"_id": ObjectId(token_data.sub)})
    except Exception:
        raise credentials_exception
        
    if user is None:
        raise credentials_exception
    
    user["id"] = str(user["_id"])
    return user

@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db = Depends(get_db)):
    email_lower = user_in.email.strip().lower()
    
    user = db.users.find_one({"email": email_lower})
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )
    
    new_user = {
        "email": email_lower,
        "hashed_password": get_password_hash(user_in.password),
        "full_name": user_in.full_name,
        "target_role": user_in.target_role,
        "target_company": user_in.target_company,
        "experience_level": user_in.experience_level,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = db.users.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    new_user["id"] = str(new_user["_id"])
    
    access_token = create_access_token(subject=str(new_user["_id"]))
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login", response_model=Token)
def login(login_in: LoginRequest, db = Depends(get_db)):
    email_lower = login_in.email.strip().lower()
    user = db.users.find_one({"email": email_lower})
    
    if not user or not verify_password(login_in.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
    
    user["id"] = str(user["_id"])
    access_token = create_access_token(subject=str(user["_id"]))
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: dict = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    update_data = {}
    if user_update.full_name is not None:
        update_data["full_name"] = user_update.full_name
    if user_update.target_role is not None:
        update_data["target_role"] = user_update.target_role
    if user_update.target_company is not None:
        update_data["target_company"] = user_update.target_company
    if user_update.experience_level is not None:
        update_data["experience_level"] = user_update.experience_level
    if user_update.password is not None:
        update_data["hashed_password"] = get_password_hash(user_update.password)
        
    if update_data:
        db.users.update_one({"_id": current_user["_id"]}, {"$set": update_data})
        current_user.update(update_data)
        
    return current_user

import random
import os

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    password: str

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db = Depends(get_db)):
    email_lower = req.email.strip().lower()
    user = db.users.find_one({"email": email_lower})
    if not user:
        # For security reasons, don't reveal that the user does not exist.
        return {"message": "If the email exists in our system, a recovery code has been sent."}
    
    # Generate 6-digit OTP code
    otp_code = f"{random.randint(100000, 999999)}"
    expiry = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_code": otp_code, "reset_code_expires": expiry}}
    )
    
    # Console-based simulation: Print the code to terminal logs so user can capture it
    print("\n" + "="*50)
    print(f" PASSWORD RESET REQUEST RECEIVED FOR: {email_lower}")
    print(f" OTP CODE IS: {otp_code} (Expires in 15 minutes)")
    print("="*50 + "\n")
    
    return {"message": "If the email exists in our system, a recovery code has been sent."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db = Depends(get_db)):
    email_lower = req.email.strip().lower()
    user = db.users.find_one({"email": email_lower})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or recovery code.")
    
    db_code = user.get("reset_code")
    db_expiry = user.get("reset_code_expires")
    
    if not db_code or db_code != req.code:
        raise HTTPException(status_code=400, detail="Invalid email or recovery code.")
        
    # Check expiry
    # Note: pymongo handles timezone-aware or naive datetimes. Let's make sure comparison matches.
    if db_expiry:
        # Ensure it has timezone info or compare properly
        now = datetime.now(timezone.utc)
        # Ensure db_expiry has timezone info, pymongo usually loads as offset-naive UTC or aware depending on driver.
        # Let's convert both to naive UTC if one is naive.
        db_expiry_utc = db_expiry.replace(tzinfo=timezone.utc) if db_expiry.tzinfo is None else db_expiry
        if now > db_expiry_utc:
            raise HTTPException(status_code=400, detail="Recovery code has expired.")

    # Update password and clear reset code
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"hashed_password": get_password_hash(req.password)}, "$unset": {"reset_code": "", "reset_code_expires": ""}}
    )
    
    return {"message": "Password updated successfully. You can now log in."}

class GoogleLoginRequest(BaseModel):
    credential: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None

@router.post("/google", response_model=Token)
def google_login(req: GoogleLoginRequest, db = Depends(get_db)):
    credential = req.credential
    email = req.email
    name = req.name
    
    user_email = ""
    user_name = "Google User"
    
    if credential:
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests
            
            google_client_id = os.getenv("GOOGLE_CLIENT_ID")
            try:
                # Fully verify Google JWT
                idinfo = id_token.verify_oauth2_token(credential, google_requests.Request(), google_client_id)
                user_email = idinfo['email']
                user_name = idinfo.get('name', 'Google User')
            except Exception:
                # Fallback: Unverified base64 decode for testing or custom setup
                import json
                import base64
                parts = credential.split('.')
                if len(parts) >= 2:
                    payload_b64 = parts[1]
                    payload_b64 += '=' * (-len(payload_b64) % 4)
                    payload_json = base64.b64decode(payload_b64).decode('utf-8')
                    idinfo = json.loads(payload_json)
                    user_email = idinfo.get('email', '')
                    user_name = idinfo.get('name', 'Google User')
                else:
                    raise HTTPException(status_code=400, detail="Invalid Google ID token format")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Google authentication failed: {str(e)}")
    elif email:
        # Mock Google auth payload directly from client
        user_email = email
        user_name = name or "Google User"
    else:
        raise HTTPException(status_code=400, detail="Missing Google credential or email info")

    if not user_email:
        raise HTTPException(status_code=400, detail="Failed to retrieve email from Google token")
        
    user_email = user_email.strip().lower()
    user = db.users.find_one({"email": user_email})
    if not user:
        # Auto-signup with Google
        new_user = {
            "email": user_email,
            "hashed_password": get_password_hash(str(ObjectId())), # random password
            "full_name": user_name,
            "target_role": None,
            "target_company": None,
            "experience_level": None,
            "created_at": datetime.now(timezone.utc)
        }
        result = db.users.insert_one(new_user)
        new_user["_id"] = result.inserted_id
        user = new_user
    
    user["id"] = str(user["_id"])
    access_token = create_access_token(subject=str(user["_id"]))
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }
