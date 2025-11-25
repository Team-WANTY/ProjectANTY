from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from pwdlib import PasswordHash
from pydantic import EmailStr
from shared.db import now_timestamp
from shared.exceptions.db import (
    EmptyRecordUpdateError,
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.auth import UserAuthInfo
from shared.simple_logging import logger

from src.models import UserAuthUpdate, UserCreate

pwdhasher = PasswordHash.recommended()


class AuthDB:
    def __init__(self, container: ContainerProxy):
        self.container = container
        logger.debug("Created AuthDB")

    async def create_user(self, user_create: UserCreate):
        try:
            logger.debug(f"Trying to create user: {user_create.model_dump()}")
            user_in_db = user_create.to_user_in_db()
            logger.debug("Converted UserCreate to UserInDB, sending to DB")
            item: CosmosDict = await self.container.create_item(
                body=user_in_db.model_dump()
            )
            logger.debug("Created item in DB successfully, validating response")
            user_auth_info = UserAuthInfo.model_validate(item, extra="ignore")
            logger.debug(f"Successfully created user: {user_auth_info.model_dump()}")
        except exceptions.CosmosHttpResponseError:
            logger.warning(
                f"Error creating user: {user_create.model_dump()}, already exists"
            )
            raise RecordAlreadyExistsError()
        except RecordAlreadyExistsError:
            raise
        except Exception as e:
            logger.error(
                f"Error creating user: {user_create.model_dump()}, unexpected: {e}"
            )
            raise RecordCreationError()

    async def get_user_auth_by_id(self, user_id: str) -> UserAuthInfo:
        try:
            logger.debug(f"Trying to get user with id '{user_id}'")
            item: CosmosDict = await self.container.read_item(
                item=user_id, partition_key=user_id
            )
            logger.debug("Read item from DB, validating response")
            user_auth_info = UserAuthInfo.model_validate(item, extra="ignore")
            logger.debug(f"Got user from id '{user_id}': {user_auth_info.model_dump()}")
            return user_auth_info
        except exceptions.CosmosResourceNotFoundError:
            logger.error(f"Error getting user auth with id '{user_id}': not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error getting user auth with id '{user_id}', unexpected: {e}"
            )
            raise GeneralQueryError()

    async def get_user_auth_by_username(self, username: str) -> UserAuthInfo:
        """Get user by username"""
        query = "SELECT * FROM c WHERE c.username = @username"
        parameters: list[dict[str, object]] = [{"name": "@username", "value": username}]
        try:
            logger.debug(f"Trying to get user with username '{username}'")
            async for item in self.container.query_items(
                query=query, parameters=parameters
            ):
                logger.debug("Queried items from DB, validating response")
                user_auth_info = UserAuthInfo.model_validate(
                    item, extra="ignore"
                )  # Return first match immediately
                logger.debug(
                    f"Got from username '{username}: {user_auth_info.model_dump()}'"
                )
                return user_auth_info
            raise RecordNotFoundError()
        except RecordNotFoundError as e:
            logger.debug(
                f"Error getting UserAuthInfo with username '{username}': not found"
            )
            raise e
        except exceptions.CosmosResourceNotFoundError:
            logger.debug(
                f"Error getting UserAuthInfo with username '{username}': not found"
            )
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error getting UserAuthInfo with username '{username}', Unexpected error: {e}"
            )
            raise GeneralQueryError()

    async def get_user_auth_by_email(self, email: EmailStr) -> UserAuthInfo:
        """Get user by email"""
        query = "SELECT * FROM c WHERE c.email = @email"
        parameters: list[dict[str, object]] = [{"name": "@email", "value": email}]
        try:
            logger.debug(f"Trying to get UserAuthInfo with email '{email}'")
            async for item in self.container.query_items(
                query=query, parameters=parameters
            ):
                logger.debug("Queried items from DB, validating response")
                user_auth_info = UserAuthInfo.model_validate(
                    item, extra="ignore"
                )  # Return first match immediately
                logger.debug(f"Got from email {email}: {user_auth_info.model_dump()}")
                return user_auth_info
            raise RecordNotFoundError()
        except RecordNotFoundError as e:
            logger.debug(f"Error getting UserAuthInfo with email '{email}': not found")
            raise e
        except exceptions.CosmosResourceNotFoundError:
            logger.debug(f"Error getting UserAuthInfo with email '{email}': not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error getting UserAuthInfo with email '{email}', unexpected error: {e}"
            )
            raise GeneralQueryError()

    async def update_auth(
        self, old_user_auth_info: UserAuthInfo, auth_update_info: UserAuthUpdate
    ) -> UserAuthInfo:
        try:
            logger.debug(
                f"Trying to update UserAuthInfo ({old_user_auth_info.model_dump()}) with: {auth_update_info.model_dump()}"
            )
            patch_operations = []

            if auth_update_info.plain_text_password is not None:
                logger.debug(
                    f"Trying to update password for user '{auth_update_info.id}'"
                )
                # Check if new password matches old password
                if pwdhasher.verify(
                    auth_update_info.plain_text_password,
                    old_user_auth_info.hashed_password,
                ):
                    logger.warning(
                        f"Failed to update password for user '{auth_update_info.id}' but old password matches new password, must be different"
                    )
                    raise RecordUpdateError()

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
                    "value": now_timestamp(),
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

            user_auth_info = UserAuthInfo.model_validate(item, extra="ignore")
            logger.debug(
                f"Successfully updated user '{auth_update_info.id}', new record: {user_auth_info.model_dump()}"
            )
            return user_auth_info

        except exceptions.CosmosResourceNotFoundError:
            logger.debug(
                f"Error updating UserAuthInfo with id {auth_update_info.id}: not found"
            )
            raise RecordNotFoundError()
        except RecordUpdateError:
            # no logging needed, already covered above
            raise
        except Exception as e:
            logger.error(
                f"Error updating UserAuthInfo with id {auth_update_info.id}, unexpected error: {e}"
            )
            raise RecordUpdateError()
