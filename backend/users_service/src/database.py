import logging
from datetime import UTC, datetime

from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from pydantic import EmailStr
from shared.exceptions.db import (
    GeneralQueryError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.users import UserInDB

from src.models import UserUpdate

logger = logging.getLogger("users_service")


class UsersDB:
    def __init__(self, container: ContainerProxy):
        self.container = container

    async def get_user_by_id(self, user_id: str) -> UserInDB:
        try:
            logging.debug(f"Trying to get user with ID '{user_id}'")
            item: CosmosDict = await self.container.read_item(
                item=user_id, partition_key=user_id
            )
            user_in_db = UserInDB.model_validate(item, extra="ignore")
            logging.debug(
                f"Successfully got user with ID '{user_id}': {user_in_db.model_dump()}"
            )
            return user_in_db
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception:
            raise GeneralQueryError()

    async def get_user_by_username(self, username: str) -> UserInDB:
        """Get user by username"""
        query = "SELECT * FROM c WHERE c.username = @username"
        parameters: list[dict[str, object]] = [{"name": "@username", "value": username}]
        try:
            logger.debug(f"Trying to get user with username '{username}'")
            async for item in self.container.query_items(
                query=query, parameters=parameters
            ):
                user_in_db = UserInDB.model_validate(item, extra="ignore")
                logger.debug(
                    f"Successfully got user with username '{username}': {user_in_db.model_dump()}"
                )
                return user_in_db  # Return first match immediately
            raise RecordNotFoundError()
        except RecordNotFoundError as e:
            raise e
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception:
            raise GeneralQueryError()

    async def get_user_by_email(self, email: EmailStr) -> UserInDB:
        """Get user by email"""
        query = "SELECT * FROM c WHERE c.email = @email"
        parameters: list[dict[str, object]] = [{"name": "@email", "value": email}]
        try:
            logger.debug(f"Trying to get user with email '{email}'")
            async for item in self.container.query_items(
                query=query, parameters=parameters
            ):
                user_in_db = UserInDB.model_validate(item, extra="ignore")
                logger.debug(
                    f"Successfully got user with email '{email}': {user_in_db.model_dump()}"
                )
                return user_in_db  # Return first match immediately
            raise RecordNotFoundError
        except RecordNotFoundError as e:
            raise e
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception:
            raise GeneralQueryError()

    async def update_user(
        self, old_user_db_record: UserInDB, user_update: UserUpdate
    ) -> UserInDB:
        """Update user in CosmosDB using patch_item for partial updates"""
        try:
            logger.debug(f"Trying to update user with ID '{user_update.id}'")
            patch_operations = []

            if user_update.email is not None:
                logger.debug(
                    f"Updating email for user with ID '{user_update.id}' to '{user_update.email}'"
                )
                # TODO: validate email if needed
                patch_operations.append(
                    {"op": "replace", "path": "/email", "value": user_update.email}
                )

            if user_update.username is not None:
                logger.debug(
                    f"Updating username for user with ID '{user_update.id}' to '{user_update.username}'"
                )
                # TODO: validate username if needed
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/username",
                        "value": user_update.username,
                    }
                )

            if len(patch_operations) == 0:
                logger.debug(f"No valid updates for user with ID '{user_update.id}'")
                return old_user_db_record

            logger.debug(
                f"Changing 'updated_at' timestamp for user with ID '{user_update.id}'"
            )
            # Always update updated_at timestamp
            patch_operations.append(
                {
                    "op": "replace",
                    "path": "/updated_at",
                    "value": int(datetime.now(UTC).timestamp()),
                }
            )

            # Perform patch update
            item = await self.container.patch_item(
                item=user_update.id,
                partition_key=user_update.id,
                patch_operations=patch_operations,
            )
            user_in_db = UserInDB.model_validate(item, extra="ignore")
            logger.debug(
                f"Successfully updated user with ID '{user_update.id}': {user_in_db.model_dump()}"
            )
            return user_in_db

        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception:
            raise RecordUpdateError()

    async def delete_user(self, user_id: str) -> None:
        """Delete user from CosmosDB"""
        try:
            logger.debug(f"Trying to delete user with ID '{user_id}'")
            await self.container.delete_item(item=user_id, partition_key=user_id)
            logger.debug(f"Successfully deleted user with ID '{user_id}'")
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception:
            raise RecordDeletionError()
