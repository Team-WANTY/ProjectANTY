from httpx import AsyncClient
from pydantic import EmailStr
from shared.auth import authorize_operation
from shared.exceptions.db import (
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordNotFoundError,
)
from shared.models.users import UserInDB
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.database import UsersDB
from src.models import UserCreate, UserUpdate
from src.settings import settings


class UsersService:
    def __init__(self, user_db: UsersDB):
        self.db = user_db
        logger.debug("Made new UserService")

    async def create_user(self, user_create: UserCreate):
        logger.debug(
            f"Trying to create new user: {user_create.model_dump()}, checking if user exists"
        )

        try:
            await self.get_user_by_username(user_create.username)
            raise RecordAlreadyExistsError()
        except RecordNotFoundError:
            pass
        try:
            await self.get_user_by_email(user_create.email)
            raise RecordAlreadyExistsError()
        except RecordNotFoundError:
            pass

        logger.debug(f"Creating new user ({user_create.model_dump()}) in DB")
        user_in_db = await self.db.create_user(user_create)

        logger.debug(
            f"Reaching out to profiles service to create new profile for user with ID '{user_in_db.id}'"
        )
        async with AsyncClient() as client:
            response = await client.post(
                f"{settings.PROFILES_SERVICE_URL}/{user_in_db.id}",
                headers={"X-Interservice-Key": shared_settings.INTERSERVICE_KEY},
            )
            if response.status_code != 201:
                raise RecordCreationError()

        logger.debug(f"Successfully registered new user: {user_in_db.model_dump()}")

    async def get_user_by_id(self, user_id: str) -> UserInDB:
        """Get user by ID"""
        logger.debug(f"Getting user with ID '{user_id}'")
        user_in_db = await self.db.get_user_by_id(user_id)
        logger.debug(f"Successfully got user with ID '{user_id}'")
        return user_in_db

    async def get_user_by_username(self, username: str) -> UserInDB:
        """Get user by username"""
        logger.debug(f"Getting user with username '{username}'")
        user_in_db = await self.db.get_user_by_username(username)
        logger.debug(f"Successfully got user with username '{username}'")
        return user_in_db

    async def get_user_by_email(self, email: EmailStr) -> UserInDB:
        """Get user by email"""
        logger.debug(f"Getting user with email '{email}'")
        user_in_db = await self.db.get_user_by_email(email)
        logger.debug(f"Successfully got user with email '{email}'")
        return user_in_db

    async def update_user(self, user_update: UserUpdate, updater: UserInDB):
        """Update user"""
        logger.debug(
            f"Checking if {updater.id} is authorized to update {user_update.id}"
        )
        await authorize_operation(updater, user_update.id)
        logger.debug(f"Updating user with ID '{user_update.id}'")
        if not updater.is_superuser:
            pass  # TODO if any restricted updates, set them to None here
        await self.db.update_user(user_update)

    async def delete_user(self, user_id: str, deleter: UserInDB) -> None:
        """Delete user"""
        # TODO call other services and delete everything related to that user
        logger.debug(f"Checking if {deleter.id} is authorized to delete {user_id}")
        await authorize_operation(deleter, user_id)
        logger.debug(f"Deleting user with ID '{user_id}'")
        await self.db.delete_user(user_id)
        # TODO query aggregation service to delete all user's info
        logger.debug(f"Successfully deleted user with ID '{user_id}'")
