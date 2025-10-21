import logging
from datetime import UTC, datetime

from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from pwdlib import PasswordHash
from pydantic import EmailStr
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.users import UserInDB

from src.models import UserAuthInfo, UserAuthUpdate, UserCreate

logger = logging.getLogger("auth_service")

pwdhasher = PasswordHash.recommended()

class AuthDB:
    def __init__(self, container: ContainerProxy):
        self.container = container
        logger.debug("Created AuthDB")

    async def create_user(self, user_create: UserCreate) -> UserInDB:
        try:
            logger.debug(f"Trying to create user: {user_create.model_dump()}")
            user_in_db = user_create.to_user_in_db()
            item: CosmosDict = await self.container.create_item(
                body=user_in_db.model_dump()
            )
            user_auth_info =  UserAuthInfo.model_validate(item, strict=True, extra="ignore")
            logger.debug(f"Successfully created user: {user_auth_info.model_dump()}")
            return user_auth_info
        except exceptions.CosmosHttpResponseError:
            logger.warning(f"Error while creating user: {user_create.model_dump()}, already exists")
            raise RecordAlreadyExistsError()
        except Exception as e:
            logger.error(f"Error while creating user: {user_create.model_dump()}, unexpected: {e}")
            raise RecordCreationError()

    async def get_user_auth_by_id(self, user_id: str) -> UserAuthInfo:
        try:
            logger.debug(f"Trying to get user with id '{user_id}'")
            item: CosmosDict = await self.container.read_item(
                item=user_id, partition_key=user_id
            )
            user_auth_info = UserAuthInfo.model_validate(item, extra="ignore")
            logger.debug(f"Got from id '{user_id}': {user_auth_info.model_dump()}")
            return user_auth_info
        except exceptions.CosmosResourceNotFoundError:
            logger.debug(f"User with id '{user_id}' not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            raise GeneralQueryError()

    async def get_user_auth_by_username(self, username: str) -> UserInDB:
        """Get user by username"""
        query = "SELECT * FROM c WHERE c.username = @username"
        parameters: list[dict[str, object]] = [{"name": "@username", "value": username}]
        try:
            logger.debug(f"Trying to get user with username '{username}'")
            async for item in self.container.query_items(
                query=query, parameters=parameters
            ):
                user_auth_info = UserAuthInfo.model_validate(item, extra="ignore")  # Return first match immediately
                logger.debug(f"Got from username '{username}: {user_auth_info.model_dump()}'")
                return user_auth_info
            raise RecordNotFoundError()
        except RecordNotFoundError as e:
            logger.debug(f"User with username '{username}' not found")
            raise e
        except exceptions.CosmosResourceNotFoundError:
            logger.debug(f"User with username '{username}' not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            raise GeneralQueryError()

    async def get_user_auth_by_email(self, email: EmailStr) -> UserInDB:
        """Get user by email"""
        query = "SELECT * FROM c WHERE c.email = @email"
        parameters: list[dict[str, object]] = [{"name": "@email", "value": email}]
        try:
            logger.debug(f"Trying to get user with email '{email}'")
            async for item in self.container.query_items(
                query=query, parameters=parameters
            ):
                user_auth_info = UserAuthInfo.model_validate(item, extra="ignore")  # Return first match immediately
                logger.debug(f"Got from email {email}: {user_auth_info.model_dump()}")
            raise RecordNotFoundError()
        except RecordNotFoundError as e:
            logger.debug(f"User with email '{email}' not found")
            raise e
        except exceptions.CosmosResourceNotFoundError:
            logger.debug(f"User with email '{email}' not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            raise GeneralQueryError()

    async def update_auth(
        self, old_user_auth_info: UserAuthInfo, auth_update_info: UserAuthUpdate, updater_is_super:bool
    ) -> UserAuthInfo:
        try:
            patch_operations = []

            logger.debug(f"Trying to update user with id '{auth_update_info.id}' as {"superuser" if updater_is_super else "owner"}, old record:{old_user_auth_info.model_dump()} | update information: {auth_update_info.model_dump()}")
            if auth_update_info.plain_text_password is not None:
                logger.debug(f"Trying to update password for user '{auth_update_info.id}'")
                # Check if new password matches old password
                if pwdhasher.verify(
                    auth_update_info.plain_text_password,
                    old_user_auth_info.hashed_password,
                ):
                    logger.warning(f"Failed to update password for user '{auth_update_info.id}' but old password matches new password, must be different")
                    raise RecordUpdateError()

                # TODO validate password meets requirements
                # logger.warning(f"Failed to update password for user '{auth_update_info.id}' but new password did not meet requirements")

                hashed_pw = pwdhasher.hash(auth_update_info.plain_text_password)
                patch_operations.append({"op": "replace", "path": "/hashed_password", "value": hashed_pw})
                logger.debug(f"Successfully added password update operation for user '{auth_update_info.id}'")

            if auth_update_info.is_active is not None:
                logger.debug(f"Trying to update user '{auth_update_info.id}' active status")
                if updater_is_super:
                    patch_operations.append({"op": "replace", "path":"/is_active", "value":auth_update_info.is_active})
                    logger.debug(f"Successfully added active status update operation for user '{auth_update_info.id}'")
                else:
                    logger.debug(f"Failed to update active status for user '{auth_update_info.id}' but updater is not superuser")

            if auth_update_info.is_superuser is not None:
                logger.debug(f"Trying to update user '{auth_update_info.id}' superuser status")
                if updater_is_super:
                    patch_operations.append({"op": "replace", "path":"/is_superuser", "value":auth_update_info.is_superuser})
                    logger.debug(f"Successfully added superuser status update operation for user '{auth_update_info.id}'")
                else:
                    logger.debug(f"Failed to update superuser status for user '{auth_update_info.id}' but updater is not superuser")

            if len(patch_operations) == 0:
                logger.debug(f"No update operations pending for user '{auth_update_info.id}'")
                return old_user_auth_info

            # Always update updated_at timestamp
            patch_operations.append(
                {
                    "op": "replace",
                    "path": "/updated_at",
                    "value": int(datetime.now(UTC).timestamp()),
                }
            )
            logger.debug(f"Successfully added 'updated at' timestamp update operation for user '{auth_update_info.id}'")

            logger.debug(f"Trying to send update operations to DB for user '{auth_update_info.id}'")
            item: CosmosDict = await self.container.patch_item(
                item=auth_update_info.id,
                partition_key=auth_update_info.id,
                patch_operations=patch_operations,
            )

            user_auth_info = UserAuthInfo.model_validate(item, extra="ignore")
            logger.debug(f"Successfully updated user '{auth_update_info.id}', new record: {user_auth_info.model_dump()}")
            return user_auth_info

        except exceptions.CosmosResourceNotFoundError:
            logger.debug(f"User with id {auth_update_info.id} not found")
            raise RecordNotFoundError()
        except RecordUpdateError as e:
            #no logging needed, already covered above
            raise e
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            raise RecordUpdateError()
