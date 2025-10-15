from azure.cosmos.exceptions import ResourceExistsError
from httpx import AsyncClient, HTTPStatusError
from httpx import codes as httpcodes
from pydantic import EmailStr

from shared.models.token import Token
from shared.models.users import UserCreate, UserInDB
from users_service.database import UsersDB
from users_service.exceptions import (
    UserCreationError,
    UserEmailExistsError,
    UserInterserviceError,
    UserNotFoundError,
    UserTokenError,
    UserUsernameExistsError,
)
from users_service.models import UserUpdate


class UsersService:
    def __init__(self, user_db: UsersDB, auth_http_client: AsyncClient):
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
        try:
            created_user_in_db = await self.user_db.create_user(user_create)
            return created_user_in_db
        except ResourceExistsError:
            raise UserCreationError()

    async def get_user_by_id(self, user_id: str) -> UserInDB:
        """Get user by ID"""
        user_in_db = await self.user_db.get_user_by_id(user_id)
        return user_in_db

    async def get_user_by_username(self, username: str) -> UserInDB:
        """Get user by username"""
        user_in_db = await self.user_db.get_user_by_username(username)
        return user_in_db

    async def get_user_by_email(self, email: EmailStr) -> UserInDB:
        """Get user by username"""
        user_in_db = await self.user_db.get_user_by_email(email)
        return user_in_db

    async def update_user(self, user_update: UserUpdate) -> UserInDB:
        """Update user"""
        updated_user_in_db = await self.user_db.update_user(user_update)
        return updated_user_in_db.to_user()

    async def delete_user(self, user_id: str) -> None:
        """Delete user"""
        await self.user_db.delete_user(user_id)

    async def verify_token(self, token: str) -> str:
        try:
            response = await self.auth_client.post("/auth/verify")
            response.raise_for_status()
            json_data = response.json()
        except HTTPStatusError as e:
            if e.response.status_code == httpcodes.UNAUTHORIZED:
                raise UserTokenError()
            else:
                raise UserInterserviceError()
        token = Token.model_validate(json_data, strict=True, extra="ignore`")
        return token.sub

    # @staticmethod
    # def list_users(self, skip: int = 0, limit: int = 100) -> list[User]:
    #     """List all users"""
    #     users_in_db = list_users(skip, limit)
    #     return [user_in_db.to_user() for user_in_db in users_in_db]
