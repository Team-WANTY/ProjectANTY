from shared.auth import authorize_operation
from shared.exceptions.db import RecordAlreadyExistsError, RecordNotFoundError
from shared.models.users import UserInDB
from shared.simple_logging import logger

from src.database import ProfileDB
from src.models import ProfileUpdate


class ProfileService:
    def __init__(self, profile_db: ProfileDB):
        self.db = profile_db
        logger.debug("Created ProfileService")

    async def create_profile(self, user_id: str):
        try:
            await self.get_profile(user_id)
            raise RecordAlreadyExistsError()
        except RecordNotFoundError:
            pass
        await self.db.create_profile(user_id)

    async def get_profile(self, user_id: str):
        profile = await self.db.get_profile(user_id)
        return profile

    async def update_profile(self, profile_update: ProfileUpdate, updater: UserInDB):
        logger.debug(
            f"Trying to update profile for user with ID '{profile_update.user_id}', first authorizing"
        )
        await authorize_operation(updater, profile_update.user_id)
        logger.debug(
            f"Profile update authorized for user with ID '{profile_update.user_id}'"
        )
        if not updater.is_superuser:
            logger.debug(
                f"User performing the update with ID {updater.id} is not a superuser, removing restricted operations"
            )
            profile_update.unlocked_analytics = None
            profile_update.unlocked_badges = None
        await self.db.update_profile(profile_update)

    async def delete_profile(self, user_id: str, updater: UserInDB):
        logger.debug(
            f"Trying to delete profile for user with ID '{user_id}', first authorizing"
        )
        await authorize_operation(updater, user_id)
        await self.db.delete_profile(user_id)
