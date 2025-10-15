from datetime import UTC, datetime

from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from pydantic import EmailStr

from shared.models.users import UserCreate, UserInDB
from users_service.models import UserUpdate

from users_service.exceptions import (
    UserCreationError,
    UserDeletionError,
    UserExistsError,
    UserGeneralQueryError,
    UserNotFoundError,
    UserUpdateError,
)


class UsersDB:
    def __init__(self, container: ContainerProxy):
        self.container = container

    async def create_user(self, user_create: UserCreate) -> UserInDB:
        """Create a new user in CosmosDB"""
        try:
            user_in_db = UserInDB.from_user_create(user_create=user_create)
            item: CosmosDict = await self.container.create_item(
                body=user_in_db.model_dump()
            )
            return UserInDB.model_validate(item, strict=True, extra="ignore")
        except exceptions.CosmosHttpResponseError:
            raise UserExistsError()
        except Exception as e:
            raise UserCreationError(e)

    async def get_user_by_id(self, user_id: str) -> UserInDB:
        try:
            item: CosmosDict = await self.container.read_item(
                item=user_id, partition_key=user_id
            )
            return UserInDB.model_validate(item, strict=True, extra="ignore")
        except exceptions.CosmosResourceNotFoundError:
            raise UserNotFoundError()
        except Exception as e:
            raise UserGeneralQueryError(e)

    async def get_user_by_username(self, username: str) -> UserInDB:
        """Get user by username"""
        query = "SELECT * FROM c WHERE c.username = @username"
        parameters: list[dict[str, object]] = [{"name": "@username", "value": username}]
        try:
            async for item in self.container.query_items(
                query=query, parameters=parameters
            ):
                return UserInDB.model_validate(
                    item, strict=True, extra="ignore"
                )  # Return first match immediately
            raise UserNotFoundError()
        except UserNotFoundError as e:
            raise e
        except exceptions.CosmosResourceNotFoundError:
            raise UserNotFoundError()
        except Exception as e:
            raise UserGeneralQueryError(e)

    async def get_user_by_email(self, email: EmailStr) -> UserInDB:
        """Get user by email"""
        query = "SELECT * FROM c WHERE c.email = @email"
        parameters: list[dict[str, object]] = [{"name": "@email", "value": email}]
        try:
            async for item in self.container.query_items(
                query=query, parameters=parameters
            ):
                return UserInDB.model_validate(
                    item, strict=True, extra="ignore"
                )  # Return first match immediately
            raise UserNotFoundError()
        except UserNotFoundError as e:
            raise e
        except exceptions.CosmosResourceNotFoundError:
            raise UserNotFoundError()
        except Exception as e:
            raise UserGeneralQueryError(e)

    async def update_user(self, user_update: UserUpdate) -> UserInDB:
        """Update user in CosmosDB using patch_item for partial updates"""
        try:
            user_in_db = await self.get_user_by_id(str(user_update.id))
            if not isinstance(user_in_db, UserInDB):
                raise UserGeneralQueryError(
                    "ERROR: Returned value from UsersDB.get_user_by_id is not type UserInDB"
                )

            patch_operations = []

            if user_update.email is not None:
                # TODO: validate email if needed
                patch_operations.append(
                    {"op": "replace", "path": "/email", "value": user_update.email}
                )

            if user_update.username is not None:
                # TODO: validate username if needed
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/username",
                        "value": user_update.username,
                    }
                )

            if len(patch_operations) == 0:
                return user_in_db

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

            return UserInDB.model_validate(item, strict=True, extra="ignore")

        except exceptions.CosmosResourceNotFoundError:
            raise UserNotFoundError()
        except Exception as e:
            raise UserUpdateError(e)

    async def delete_user(self, user_id: str) -> None:
        """Delete user from CosmosDB"""
        try:
            await self.container.delete_item(item=user_id, partition_key=user_id)
        except exceptions.CosmosResourceNotFoundError:
            raise UserNotFoundError()
        except Exception as e:
            raise UserDeletionError(e)
