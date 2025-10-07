from typing import Optional
from pydantic import EmailStr, SecretStr
from datetime import datetime, timezone
from models.user import UserCreate, UserUpdate, User, UserInDB
from database import db_client
from secrets_dependencies import get_password_hash, verify_password

class UserService:
    @staticmethod
    def create_user(user_create: UserCreate) -> User:
        """Create a new user"""
        # Check if username or email already exists
        if db_client.get_user_by_username(user_create.username):
            raise ValueError("Username already exists")
        if db_client.get_user_by_email(user_create.email):
            raise ValueError("Email already exists")
        
        # Create user document
        created_user_in_db = db_client.create_user(user_create)
        return created_user_in_db.to_user()
    
    @staticmethod
    def authenticate_user_by_username(username: str, password: str) -> Optional[User]:
        """Authenticate user with username and password"""
        user_in_db = db_client.get_user_by_username(username)
        if not user_in_db:
            return None
        if not verify_password(password, user_in_db.hashed_password.get_secret_value()):
            return None
        return user_in_db.to_user()
    
    @staticmethod
    def authenticate_user_by_email(email: EmailStr, password: str) -> Optional[User]:
        """Authenticate user with username and password"""
        user_in_db = db_client.get_user_by_email(email)
        if not user_in_db:
            return None
        if not verify_password(password, user_in_db.hashed_password.get_secret_value()):
            return None
        return user_in_db.to_user()

    @staticmethod
    def get_user(user_id: str) -> Optional[User]:
        """Get user by ID"""
        user_in_db = db_client.get_user_by_id(user_id)
        if not user_in_db:
            return None
        return user_in_db.to_user()
    
    @staticmethod
    def get_user_by_username(username: str) -> Optional[User]:
        """Get user by username"""
        user_in_db = db_client.get_user_by_username(username)
        if not user_in_db:
            return None
        return user_in_db.to_user()
    
    @staticmethod
    def get_user_by_email(email: EmailStr) -> Optional[User]:
        """Get user by username"""
        user_in_db = db_client.get_user_by_email(email)
        if not user_in_db:
            return None
        return user_in_db.to_user()

    @staticmethod
    def update_user(user: User, user_update: UserUpdate) -> User:
        """Update user"""
        user_in_db = db_client.get_user_by_id(str(user.id))
        if not user_in_db:
            raise ValueError("User not found")
        
        # Hash password if provided
        if user_update.plain_text_password:
            user_in_db.hashed_password = SecretStr(get_password_hash(user_update.plain_text_password.get_secret_value()))
        
        # Update timestamp
        user_in_db.updated_at = datetime.now(timezone.utc)
        
        updated_user_in_db = db_client.update_user(str(user.id), user_in_db)
        return updated_user_in_db.to_user()
    
    @staticmethod
    def delete_user(user: User) -> None:
        """Delete user"""
        db_client.delete_user(str(user.id))
    
    # @staticmethod
    # def list_users(skip: int = 0, limit: int = 100) -> list[User]:
    #     """List all users"""
    #     users_in_db = db_client.list_users(skip, limit)
    #     return [user_in_db.to_user() for user_in_db in users_in_db]

user_service = UserService()