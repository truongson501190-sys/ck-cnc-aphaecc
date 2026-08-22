from sqlalchemy.orm import Session
from models.user import User
from models.role import Role
from auth.models import UserCreate
from core.security import get_password_hash, verify_password, create_access_token

class AuthService:
    @staticmethod
    def register(db: Session, user_data: UserCreate) -> User:
        # Kiểm tra username/email đã tồn tại
        existing = db.query(User).filter(
            (User.username == user_data.username) | (User.email == user_data.email)
        ).first()
        if existing:
            raise ValueError("Username or email already exists")
        
        hashed = get_password_hash(user_data.password)
        db_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed,
            full_name=user_data.full_name,
            is_active=True
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def authenticate(db: Session, username: str, password: str) -> Optional[User]:
        user = db.query(User).filter(User.username == username).first()
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def create_token(user: User) -> dict:
        access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
        return {"access_token": access_token, "token_type": "bearer"}