# auth/routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from config.settings import settings
from database.repositories import UserRepository
from database.core import get_session

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserCreate(BaseModel):
    email: str
    username: str
    password: str
    full_name: str = ""

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

@router.post("/register")
async def register(user_data: UserCreate, session = Depends(get_session)):
    repo = UserRepository(session)
    existing = await repo.get_by_email(user_data.email)
    if existing:
        raise HTTPException(400, "Email already registered")
    existing = await repo.get_by_username(user_data.username)
    if existing:
        raise HTTPException(400, "Username already taken")
    
    hashed = pwd_context.hash(user_data.password)
    user_id = f"user_{datetime.utcnow().timestamp()}"
    user = await repo.create(
        id=user_id,
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed,
        full_name=user_data.full_name,
    )
    return {"message": "User created", "user_id": user_id}

@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session = Depends(get_session)
):
    repo = UserRepository(session)
    user = await repo.get_by_email(form_data.username)  # username = email
    if not user:
        user = await repo.get_by_username(form_data.username)
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(401, "Incorrect email/username or password")
    
    access_token = create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}