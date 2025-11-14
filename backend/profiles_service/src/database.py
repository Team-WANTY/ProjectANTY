import logging

from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from shared.db import now_timestamp
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)

from src.models import Profile, ProfileUpdate

logger = logging.getLogger("profile_service")


class ProfileDB:
    def __init__(self, container: ContainerProxy):
        self.container = container

    async def create_profile(self, new_profile: Profile) -> Profile:
        try:
            logger.debug(f"Trying to create profile: {new_profile.model_dump()}")
            item: CosmosDict = await self.container.create_item(
                body=new_profile.model_dump()
            )
            created_profile = Profile.model_validate(item, extra="ignore")
            logger.debug(
                f"Successfully created profile: {created_profile.model_dump()}"
            )
            return created_profile
        except exceptions.CosmosResourceExistsError:
            logger.warning(
                f"Error while creating profile: {new_profile.model_dump()}, already exists"
            )
            raise RecordAlreadyExistsError()
        except Exception as e:
            logger.error(
                f"Error while creating profile: {new_profile.model_dump()}, unexpected: {e}"
            )
            raise RecordCreationError()

    async def get_profile(self, user_id: str) -> Profile:
        try:
            logger.debug(f"Trying to get profile from user ID '{user_id}'")
            item: CosmosDict = await self.container.read_item(
                item=user_id, partition_key=user_id
            )
            profile = Profile.model_validate(item, extra="ignore")
            logger.debug(f"Got from user ID '{user_id}': {profile.model_dump()}")
            return profile
        except exceptions.CosmosResourceNotFoundError:
            logger.warning(
                f"Error while getting profile from user ID '{user_id}', not found"
            )
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error while getting profile from user ID '{user_id}', unexpected: {e}"
            )
            raise GeneralQueryError()

    async def update_profile(self, profile_update: ProfileUpdate) -> Profile:
        try:
            patch_operations = []

            if profile_update.bio is not None:
                logger.debug(
                    f"Trying to update bio for user ID '{profile_update.user_id}'"
                )
                # TODO limit size?
                patch_operations.append(
                    {"op": "replace", "path": "/bio", "value": profile_update.bio}
                )

            if profile_update.avatar_image_id is not None:
                logger.debug(
                    f"Trying to update avatar ID for user ID '{profile_update.user_id}'"
                )
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/avatar_image_id",
                        "value": profile_update.avatar_image_id,
                    }
                )

            if profile_update.equipped_badges is not None:
                logger.debug(
                    f"Trying to update equipped badges for user ID '{profile_update.user_id}'"
                )
                if len(profile_update.equipped_badges) > 4:
                    logger.warning(
                        f"{profile_update.user_id} tried to equip more than 4 badges"
                    )
                    profile_update.equipped_badges = profile_update.equipped_badges[:4]
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/equipped_badges",
                        "value": profile_update.equipped_badges,
                    }
                )

            if profile_update.equipped_analytics is not None:
                logger.debug(
                    f"Trying to update equipped analytics for user ID '{profile_update.user_id}'"
                )
                if len(profile_update.equipped_analytics) > 4:
                    logger.warning(
                        f"{profile_update.user_id} tried to equip more than 4 analytics"
                    )
                    profile_update.equipped_analytics = (
                        profile_update.equipped_analytics[:4]
                    )
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/equipped_analytics",
                        "value": profile_update.equipped_analytics,
                    }
                )

            if profile_update.unlocked_badges is not None:
                logger.debug(
                    f"Trying to update unlocked badges for user ID '{profile_update.user_id}'"
                )
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/unlocked_badges",
                        "value": profile_update.unlocked_badges,
                    }
                )

            if profile_update.unlocked_analytics is not None:
                logger.debug(
                    f"Trying to update unlocked analytics for user ID '{profile_update.user_id}'"
                )
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/unlocked_analytics",
                        "value": profile_update.unlocked_analytics,
                    }
                )

            logger.debug(
                f"Updating timestamp for last update for user ID '{profile_update.user_id}'"
            )
            patch_operations.append(
                {"op": "replace", "path": "/updated_at", "value": now_timestamp()}
            )

            logger.debug(
                f"Trying to send update operations to DB for profile '{profile_update.user_id}'"
            )
            item = await self.container.patch_item(
                item=profile_update.user_id,
                partition_key=profile_update.user_id,
                patch_operations=patch_operations,
            )

            profile = Profile.model_validate(item, extra="ignore")
            logger.debug(
                f"Successfully updated profile '{profile_update.user_id}', new record: {profile.model_dump()}"
            )
            return profile
        except exceptions.CosmosResourceNotFoundError:
            logger.warning(
                f"Error while updating profile from user ID '{profile_update.user_id}', not found"
            )
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error while updating profile from user ID '{profile_update.user_id}', unexpected: {e}"
            )
            raise RecordUpdateError()

    async def delete_profile(self, user_id: str) -> None:
        try:
            logger.debug(f"Trying to delete profile with user ID '{user_id}'")
            await self.container.delete_item(item=user_id, partition_key=user_id)
            logger.debug(f"Successfully deleted profile with user ID '{user_id}'")
        except exceptions.CosmosResourceNotFoundError:
            logger.warning(f"Error while deleting profile '{user_id}', not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(f"Error while deleting profile '{user_id}', unexpected: {e}")
            raise RecordDeletionError()
