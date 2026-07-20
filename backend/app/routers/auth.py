from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from datetime import datetime, timezone, timedelta
from bson import ObjectId

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
