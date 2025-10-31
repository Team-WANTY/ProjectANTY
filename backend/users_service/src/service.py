import logging

from pydantic import EmailStr
from shared.auth import authorize_operation
from shared.models.users import UserInDB

from src.database import UsersDB
from src.models import UserUpdate

logger = logging.getLogger("users_service")


class UsersService:
    def __init__(self, user_db: UsersDB):
        self.user_db = user_db
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

    async def update_user(self, user_update: UserUpdate, updater: UserInDB) -> UserInDB:
        """Update user"""
        logger.debug(
            f"Checking if {updater.id} is authorized to update {user_update.id}"
        )
        await authorize_operation(updater, user_update.id)
        logger.debug(f"Updating user with ID '{user_update.id}'")
        old_user_in_db = await self.get_user_by_id(user_update.id)
        if not updater.is_superuser:
            pass  # TODO if any restricted updates, set them to None here
        updated_user_in_db = await self.user_db.update_user(old_user_in_db, user_update)
        logger.debug(f"Successfully updated user with ID '{user_update.id}'")
        return updated_user_in_db

    async def delete_user(self, user_id: str, deleter: UserInDB) -> None:
        """Delete user"""
        logger.debug(f"Checking if {deleter.id} is authorized to delete {user_id}")
        await authorize_operation(deleter, user_id)
        logger.debug(f"Deleting user with ID '{user_id}'")
        await self.user_db.delete_user(user_id)
        logger.debug(f"Successfully deleted user with ID '{user_id}'")
