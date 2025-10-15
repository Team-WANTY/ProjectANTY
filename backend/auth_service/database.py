from datetime import UTC, datetime

from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from passlib.hash import argon2  # ty: ignore
from pydantic import EmailStr

from auth_service.exceptions import (
    AuthDBError,
    AuthUpdateError,
    AuthUpdateInvalidPasswordError,
    UserNotFoundError,
)
from auth_service.models import UserAuthInfo, UserAuthUpdate
from shared.models.users import UserInDB


class AuthDB:
    def __init__(self, container: ContainerProxy):
        self.container = container

    async def get_user_auth_by_id(self, user_id: str) -> UserAuthInfo:
        try:
            item: CosmosDict = await self.container.read_item(
                item=user_id, partition_key=user_id
            )
            return UserAuthInfo.model_validate(item, strict=True, extra="ignore")
        except exceptions.CosmosResourceNotFoundError:
            raise UserNotFoundError()
        except Exception as e:
            raise AuthDBError(e)

    async def get_user_auth_by_username(self, username: str) -> UserInDB:
        """Get user by username"""
        query = "SELECT * FROM c WHERE c.username = @username"
        parameters: list[dict[str, object]] = [{"name": "@username", "value": username}]
        try:
            async for item in self.container.query_items(
                query=query, parameters=parameters
            ):
                return UserAuthInfo.model_validate(
                    item, strict=True, extra="ignore"
                )  # Return first match immediately
            raise UserNotFoundError()
        except exceptions.CosmosResourceNotFoundError:
            raise UserNotFoundError()
        except Exception as e:
            raise AuthDBError(e)

    async def get_user_auth_by_email(self, email: EmailStr) -> UserInDB:
        """Get user by email"""
        query = "SELECT * FROM c WHERE c.email = @email"
        parameters: list[dict[str, object]] = [{"name": "@email", "value": email}]
        try:
            async for item in self.container.query_items(
                query=query, parameters=parameters
            ):
                return UserAuthInfo.model_validate(
                    item, strict=True, extra="ignore"
                )  # Return first match immediately
            raise UserNotFoundError()
        except UserNotFoundError as e:
            raise e
        except exceptions.CosmosResourceNotFoundError:
            raise UserNotFoundError()
        except Exception as e:
            raise AuthDBError(e)

    async def update_auth(
        self, old_user_db_record: UserInDB, auth_update_info: UserAuthUpdate
    ) -> UserAuthInfo:
        try:
            patch_operations = []

            if auth_update_info.plain_text_password is not None:
                # Check if new password matches old password
                if argon2.verify(
                    auth_update_info.plain_text_password,
                    old_user_db_record.hashed_password,
                ):
                    raise AuthUpdateInvalidPasswordError()

                # TODO validate password meets requirements

                hashed_pw = argon2.hash(auth_update_info.plain_text_password)
                patch_operations.append(
                    {"op": "replace", "path": "/hashed_password", "value": hashed_pw}
                )

            if auth_update_info.is_active is not None:
                pass  # TODO check if updater_id is of a super user

            if auth_update_info.is_superuser is not None:
                pass  # TODO check if updater_id is of a super user

            if len(patch_operations) == 0:
                return UserAuthInfo.from_in_db(old_user_db_record)
                
            # Always update updated_at timestamp
            patch_operations.append(
                {
                    "op": "replace",
                    "path": "/updated_at",
                    "value": int(datetime.now(UTC).timestamp()),
                }
            )

            # Perform patch update
            item: CosmosDict = await self.container.patch_item(
                item=auth_update_info.id,
                partition_key=auth_update_info.id,
                patch_operations=patch_operations,
            )

            return UserAuthInfo.model_validate(item, strict=True, extra="ignore")

        except exceptions.CosmosResourceNotFoundError:
            raise UserNotFoundError()
        except AuthUpdateInvalidPasswordError:
            raise AuthUpdateInvalidPasswordError()
        except Exception as e:
            raise AuthUpdateError(e)
