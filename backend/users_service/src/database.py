from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from pydantic import EmailStr
from shared.db import now_timestamp
from shared.exceptions.db import (
    EmptyRecordUpdateError,
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.users import UserInDB
from shared.simple_logging import logger

from src.models import UserCreate, UserUpdate


class UsersDB:
    def __init__(self, container: ContainerProxy):
        self.container = container
        logger.debug("Created UsersDB")

    async def create_user(self, user_create: UserCreate) -> str:
        """return string for profile creation"""
        try:
            logger.debug(f"Trying to create user: {user_create.model_dump()}")
            user_in_db = user_create.to_user_in_db()
            logger.debug("Converted UserCreate to UserInDB, sending to DB")
            item: CosmosDict = await self.container.create_item(
                body=user_in_db.model_dump(mode="json")
            )
            logger.debug("Created item in DB successfully, validating response")
            user_in_db = UserInDB.model_validate(item, extra="ignore")
            logger.debug(f"Successfully created user: {user_in_db.model_dump()}")
            return user_in_db.id
        except exceptions.CosmosHttpResponseError:
            logger.warning(
                f"Error creating user: {user_create.model_dump()}, already exists"
            )
            raise RecordAlreadyExistsError()
        except Exception as e:
            logger.error(
                f"Error creating user: {user_create.model_dump()}, unexpected: {e}"
            )
            raise RecordCreationError()

    async def get_user_by_id(self, user_id: str) -> UserInDB:
        try:
            logger.debug(f"Trying to get user with ID '{user_id}'")
            item: CosmosDict = await self.container.read_item(
                item=user_id, partition_key=user_id
            )
            user_in_db = UserInDB.model_validate(item, extra="ignore")
            logger.debug(
                f"Successfully got user with ID '{user_id}': {user_in_db.model_dump()}"
            )
            return user_in_db
        except exceptions.CosmosResourceNotFoundError:
            logger.error(f"Error getting user with ID '{user_id}': not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(f"Error getting user with ID '{user_id}', unexpected: {e}")
            raise GeneralQueryError()

    async def get_user_ids_given_username_part(
        self,
        partial_username: str,
        max_items: int,
        continuation_token: str | None = None,
    ) -> tuple[list[str], str | None]:
        query = "SELECT VALUE c.id FROM c WHERE CONTAINS(c.username, @partial)"
        parameters: list[dict[str, object]] = [
            {"name": "@partial", "value": partial_username}
        ]
        try:
            logger.debug(
                f"Trying to get user ID from partial username: '{partial_username}'"
            )
            result_iterable = self.container.query_items(
                query=query,
                parameters=parameters,
                max_item_count=max_items,
            )

            items = None
            pager = result_iterable.by_page(continuation_token=continuation_token)
            async for page in pager:
                items: list[str] = [id["id"] async for id in page]
                break

            # Continuation token for the next page (or None if no more)
            new_cont: str | None = pager.continuation_token
            if items is None:
                raise RecordNotFoundError()
            return items, new_cont
        except RecordNotFoundError:
            raise
        except exceptions.CosmosResourceNotFoundError:
            logger.error(
                f"Error trying to get user IDs with partial username '{partial_username}': not found"
            )
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error trying to get user IDs with partial username '{partial_username}', unexpected: {e}"
            )
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
        except RecordNotFoundError:
            logger.error(
                f"Error trying to get user with username '{username}': not found"
            )
            raise
        except exceptions.CosmosResourceNotFoundError:
            logger.error(
                f"Error trying to get user with username '{username}': not found"
            )
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error trying to get user with username '{username}', unexpected: {e}"
            )
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
        except RecordNotFoundError:
            logger.error(f"Error trying to get user with email '{email}': not found")
            raise
        except exceptions.CosmosResourceNotFoundError:
            logger.error(f"Error trying to get user with email '{email}': not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error trying to get user with email '{email}', unexpected: {e}"
            )
            raise GeneralQueryError()

    async def update_user(self, user_update: UserUpdate):
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
                raise EmptyRecordUpdateError()

            logger.debug(
                f"Changing 'updated_at' timestamp for user with ID '{user_update.id}'"
            )
            # Always update updated_at timestamp
            patch_operations.append(
                {
                    "op": "replace",
                    "path": "/updated_at",
                    "value": now_timestamp().isoformat(),
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

        except exceptions.CosmosResourceNotFoundError:
            logger.error(
                f"Error trying to update user with ID '{user_update.id}': not found"
            )
            raise RecordNotFoundError()
        except EmptyRecordUpdateError:
            raise
        except Exception as e:
            logger.error(
                f"Error trying to update user with ID '{user_update.id}', unexpected: {e}"
            )
            raise RecordUpdateError()

    async def delete_user(self, user_id: str) -> None:
        """Delete user from CosmosDB"""
        try:
            logger.debug(f"Trying to delete user with ID '{user_id}'")
            await self.container.delete_item(item=user_id, partition_key=user_id)
            logger.debug(f"Successfully deleted user with ID '{user_id}'")
        except exceptions.CosmosResourceNotFoundError:
            logger.error(f"Error trying to delete user with ID '{user_id}': not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error trying to delete user with ID '{user_id}', unexpected: {e}"
            )
            raise RecordDeletionError()
