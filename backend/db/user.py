from azure.cosmos import exceptions, CosmosDict
from backend.models.user import UserCreate, UserInDB, UserUpdate
from backend.security.password import get_password_hash, verify_password
from pydantic import EmailStr
from backend.exceptions.user import (
    UserCreationError,
    UserExistsError,
    UserNotFoundError,
    UserGeneralQueryError,
    UserUpdateError,
    UserUpdateInvalidPasswordError,
    UserDeletionError,
)
from azure.cosmos.aio import ContainerProxy

from datetime import datetime, timezone


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
        except exceptions.CosmosResourceNotFoundError:
            raise UserNotFoundError()

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
            print(f"ERROR: {e}")
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

            if user_update.is_active is not None:
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/is_active",
                        "value": user_update.is_active,
                    }
                )

            if user_update.is_superuser is not None:
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/is_superuser",
                        "value": user_update.is_superuser,
                    }
                )

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

            if user_update.plain_text_password is not None:
                # Check if new password matches old password
                if verify_password(
                    user_update.plain_text_password,
                    user_in_db.hashed_password,
                ):
                    raise UserUpdateInvalidPasswordError()

                # TODO validate password meets requirements

                hashed_pw = get_password_hash(
                    user_update.plain_text_password
                )
                patch_operations.append(
                    {"op": "replace", "path": "/hashed_password", "value": hashed_pw}
                )

            if len(patch_operations) == 0:
                return user_in_db

            print("operations:", patch_operations)

            # Always update updated_at timestamp
            patch_operations.append(
                {
                    "op": "replace",
                    "path": "/updated_at",
                    "value": int(datetime.now(timezone.utc).timestamp()),
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
        except UserUpdateInvalidPasswordError:
            raise UserUpdateInvalidPasswordError()
        except Exception as e:
            print(e)
            raise UserUpdateError(e)

    async def delete_user(self, user_id: str) -> None:
        """Delete user from CosmosDB"""
        try:
            await self.container.delete_item(item=user_id, partition_key=user_id)
        except exceptions.CosmosResourceNotFoundError:
            raise UserNotFoundError()
        except Exception as e:
            raise UserDeletionError(e)
