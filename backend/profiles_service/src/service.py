import logging

from shared.auth import authorize_operation
from shared.models.auth import UserAuthInfo

from src.database import ProfileDB
from src.models import Profile, ProfileUpdate

logger = logging.getLogger("profiles_service")


class ProfileService:
    def __init__(self, profile_db: ProfileDB):
        self.db = profile_db

    async def create_profile(self, user_id: str):
        new_profile = Profile(id=user_id)
        profile = await self.db.create_profile(new_profile)
        return profile

    async def get_profile(self, user_id: str):
        profile = await self.db.get_profile(user_id)
        return profile

    async def update_profile(
        self, profile_update: ProfileUpdate, updater: UserAuthInfo
    ):
        await authorize_operation(updater, profile_update.user_id)
        if not updater.is_superuser:
            profile_update.unlocked_analytics = None
            profile_update.unlocked_badges = None
        profile = await self.db.update_profile(profile_update)
        return profile

    async def delete_profile(self, user_id: str, updater: UserAuthInfo):
        await authorize_operation(updater, user_id)
        await self.db.delete_profile(user_id)
