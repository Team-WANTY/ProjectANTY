from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from pwdlib import PasswordHash
from shared.db import now_timestamp
from shared.exceptions.db import (
    EmptyRecordUpdateError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.users import UserInDB
from shared.simple_logging import logger

from src.exceptions import AuthOldAndNewPasswordSameError
from src.models import UserAuthUpdate

pwdhasher = PasswordHash.recommended()


class AuthDB:
    def __init__(self, container: ContainerProxy):
        self.container = container
        logger.debug("Created AuthDB")

    async def update_auth(
        self, old_user_in_db: UserInDB, auth_update_info: UserAuthUpdate
    ):
        try:
            logger.debug(
                f"Trying to update UserInDB ({old_user_in_db.model_dump()}) with: {auth_update_info.model_dump()}"
            )
            patch_operations = []

            if auth_update_info.plain_text_password is not None:
                logger.debug(
                    f"Trying to update password for user '{auth_update_info.id}'"
                )
                # Check if new password matches old password
                if pwdhasher.verify(
                    auth_update_info.plain_text_password,
                    old_user_in_db.hashed_password,
                ):
                    logger.warning(
                        f"Failed to update password for user '{auth_update_info.id}' but old password matches new password, must be different"
                    )
                    raise AuthOldAndNewPasswordSameError()

                # TODO validate password meets requirements
                # logger.warning(f"Failed to update password for user '{auth_update_info.id}' but new password did not meet requirements")

                hashed_pw = pwdhasher.hash(auth_update_info.plain_text_password)
                patch_operations.append(
                    {"op": "replace", "path": "/hashed_password", "value": hashed_pw}
                )
                logger.debug(
                    f"Successfully added password update operation for user '{auth_update_info.id}'"
                )

            if auth_update_info.is_active is not None:
                logger.debug(
                    f"Trying to update user '{auth_update_info.id}' active status"
                )
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/is_active",
                        "value": auth_update_info.is_active,
                    }
                )
                logger.debug(
                    f"Successfully added active status update operation for user '{auth_update_info.id}'"
                )

            if auth_update_info.is_superuser is not None:
                logger.debug(
                    f"Trying to update user '{auth_update_info.id}' superuser status"
                )
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/is_superuser",
                        "value": auth_update_info.is_superuser,
                    }
                )
                logger.debug(
                    f"Successfully added superuser status update operation for user '{auth_update_info.id}'"
                )

            if len(patch_operations) == 0:
                logger.debug(
                    f"No update operations pending for user '{auth_update_info.id}'"
                )
                raise EmptyRecordUpdateError

            # Always update updated_at timestamp
            logger.debug(
                f"Updating last update timestamp for user '{auth_update_info.id}'"
            )
            patch_operations.append(
                {
                    "op": "replace",
                    "path": "/updated_at",
                    "value": now_timestamp().isoformat(),
                }
            )

            logger.debug(
                f"Trying to send update operations to DB for user '{auth_update_info.id}'"
            )
            item: CosmosDict = await self.container.patch_item(
                item=auth_update_info.id,
                partition_key=auth_update_info.id,
                patch_operations=patch_operations,
            )

            user_in_db = UserInDB.model_validate(item, extra="ignore")
            logger.debug(
                f"Successfully updated user '{auth_update_info.id}', new record: {user_in_db.model_dump()}"
            )

        except exceptions.CosmosResourceNotFoundError:
            logger.debug(
                f"Error updating UserInDB with id {auth_update_info.id}: not found"
            )
            raise RecordNotFoundError()
        except AuthOldAndNewPasswordSameError:
            raise
        except RecordUpdateError:
            # no logging needed, already covered above
            raise
        except Exception as e:
            logger.error(
                f"Error updating UserInDB with id {auth_update_info.id}, unexpected error: {e}"
            )
            raise RecordUpdateError()
