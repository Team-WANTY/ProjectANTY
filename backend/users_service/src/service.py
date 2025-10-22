import logging

from httpx import AsyncClient, HTTPStatusError, codes
from pydantic import EmailStr, ValidationError
from shared.exceptions.interservice import InterserviceError
from shared.exceptions.token import TokenError, TokenExpiredError
from shared.models.token import Token
from shared.models.users import UserInDB

from src.database import UsersDB
from src.models import UserUpdate
from src.settings import settings

logger = logging.getLogger("users_service")

class UsersService:
    def __init__(self, user_db: UsersDB, auth_http_client: AsyncClient):
        self.user_db = user_db
        self.auth_client = auth_http_client
        logger.debug("Made new UserService")

    async def get_user_by_id(self, user_id: str) -> UserInDB:
        """Get user by ID"""
        logger.debug(f"Getting user with ID '{user_id}'")
        user_in_db = await self.user_db.get_user_by_id(user_id)
        logger.debug(f"Successfully got user with ID '{user_id}'")
        return user_in_db

    async def get_user_by_username(self, username: str) -> UserInDB:
        """Get user by username"""
        logger.debug(f"Getting user with username '{username}'")
        user_in_db = await self.user_db.get_user_by_username(username)
        logger.debug(f"Successfully got user with username '{username}'")
        return user_in_db

    async def get_user_by_email(self, email: EmailStr) -> UserInDB:
        """Get user by email"""
        logger.debug(f"Getting user with email '{email}'")
        user_in_db = await self.user_db.get_user_by_email(email)
        logger.debug(f"Successfully got user with email '{email}'")
        return user_in_db

    async def update_user(self, user_update: UserUpdate, updater_is_super:bool) -> UserInDB:
        """Update user"""
        logger.debug(f"Updating user with ID '{user_update.id}'")
        old_user_in_db = await self.get_user_by_id(user_update.id)
        updated_user_in_db = await self.user_db.update_user(old_user_in_db, user_update, updater_is_super)
        logger.debug(f"Successfully updated user with ID '{user_update.id}'")
        return updated_user_in_db

    async def delete_user(self, user_id: str) -> None:
        """Delete user"""
        logger.debug(f"Deleting user with ID '{user_id}'")
        await self.user_db.delete_user(user_id)
        logger.debug(f"Successfully deleted user with ID '{user_id}'")

    async def verify_token(self, token:str) -> Token:
        try:
            logger.debug(f"Verifying token: {token}")
            response = await self.auth_client.get(f"{settings.auth_service_internal_url}/verify?token={token}")
            token = Token.model_validate(response.json(), extra="ignore")
            logger.debug(f"Verified token: {token}, {token.model_dump()}")
            return token
        except HTTPStatusError as e:
            if e.response.status_code == codes.UNAUTHORIZED:
                raise TokenExpiredError()
            else:
                raise InterserviceError()
        except ValidationError:
            raise TokenError()
