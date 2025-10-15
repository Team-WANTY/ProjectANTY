from pydantic import EmailStr
from httpx import AsyncClient

from .database import UsersDB
from .exceptions import (
    UserCreationError,
    UserEmailExistsError,
    UserGeneralQueryError,
    UserNotFoundError,
    UserUpdateError,
    UserUsernameExistsError,
)
from ..shared.user_models import UserBase, UserCreate, UserInDB
from .models import UserUpdate


class UsersService:
    def __init__(self, user_db: UsersDB, auth_http_client:AsyncClient):
        self.user_db = user_db
        self.auth_client = auth_http_client

    async def create_user(self, user_create: UserCreate) -> UserInDB:
        """Create a new user"""
        # Check if username or email already exists
        try:
            user = await self.user_db.get_user_by_username(user_create.username)
            if user:
                raise UserUsernameExistsError()
        except UserNotFoundError:
            pass
        try:
            user = await self.user_db.get_user_by_email(user_create.email)
            if user:
                raise UserEmailExistsError()
        except UserNotFoundError:
            pass

        # Create user document
        created_user_in_db = await self.user_db.create_user(user_create)
        if not isinstance(created_user_in_db, UserInDB):
            raise UserCreationError(
                "ERROR: Returned value from UsersDB.create_user is not type UserInDB"
            )
        return created_user_in_db.to_user()

    async def get_user_by_id(self, user_id: str) -> User:
        """Get user by ID"""
        user_in_db = await self.user_db.get_user_by_id(user_id)
        if not isinstance(user_in_db, UserInDB):
            raise UserGeneralQueryError(
                "ERROR: Returned value from UsersDB.get_user_by_id is not type UserInDB"
            )
        return user_in_db.to_user()

    async def get_user_by_username(self, username: str) -> User:
        """Get user by username"""
        user_in_db = await self.user_db.get_user_by_username(username)
        if not isinstance(user_in_db, UserInDB):
            raise UserGeneralQueryError(
                "ERROR: Returned value from UsersDB.get_user_by_username is not type UserInDB"
            )
        return user_in_db.to_user()

    async def get_user_by_email(self, email: EmailStr) -> User:
        """Get user by username"""
        user_in_db = await self.user_db.get_user_by_email(email)
        if not isinstance(user_in_db, UserInDB):
            raise UserGeneralQueryError(
                "ERROR: Returned value from UsersDB.get_user_by_email is not type UserInDB"
            )
        return user_in_db.to_user()

    async def update_user(self, user_update: UserUpdate) -> User:
        """Update user"""
        updated_user_in_db = await self.user_db.update_user(user_update)
        if not isinstance(updated_user_in_db, UserInDB):
            raise UserUpdateError(
                "ERROR: Returned value from UsersDB.update_user is not type UserInDB"
            )
        return updated_user_in_db.to_user()

    async def delete_user(self, user_id: str) -> None:
        """Delete user"""
        await self.user_db.delete_user(user_id)

    # @staticmethod
    # def list_users(self, skip: int = 0, limit: int = 100) -> list[User]:
    #     """List all users"""
    #     users_in_db = list_users(skip, limit)
    #     return [user_in_db.to_user() for user_in_db in users_in_db]
