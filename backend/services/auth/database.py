from datetime import UTC, datetime

from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy

from .exceptions import (
    AuthCreationError,
    AuthDeletionError,
    AuthExistsError,
    AuthGeneralQueryError,
    AuthNotFoundError,
    AuthUpdateError,
    AuthUpdateInvalidPasswordError,
)
from .models import AuthCreate, AuthInDB, AuthUpdate
from .service import AuthService


class AuthDB:
    def __init__(self, container: ContainerProxy):
        self.container = container

    async def create_auth(self, auth_create: AuthCreate) -> AuthInDB:
        try:
            auth_in_db = AuthInDB.from_auth_create(auth_create)
            item: CosmosDict = await self.container.create_item(
                body=auth_in_db.model_dump()
            )
            return AuthInDB.model_validate(item, strict=True, extra="ignore")
        except exceptions.CosmosHttpResponseError:
            raise AuthExistsError()
        except Exception as e:
            raise AuthCreationError(e)

    async def get_auth_by_user_id(self, user_id: str) -> AuthInDB:
        query = "SELECT * FROM c WHERE c.UserId = @user_id"
        parameters = [
            {"name": "@user_id", "value": user_id}
        ]
        try:
            async for item in self.container.query_items(
                query=query,
                parameters=parameters,
                enable_cross_partition_query=True  # required if partition key isn't used
            ):
                return AuthInDB.model_validate(item, strict=True, extra="ignore")
            raise AuthNotFoundError()
        except exceptions.CosmosResourceNotFoundError:
            raise AuthNotFoundError()
        except Exception as e:
            raise AuthGeneralQueryError(e)

    async def get_auth_by_id(self, auth_id: str) -> AuthInDB:
        try:
            item: CosmosDict = await self.container.read_item(
                item=auth_id, partition_key=auth_id
            )
            return AuthInDB.model_validate(item, strict=True, extra="ignore")
        except exceptions.CosmosResourceNotFoundError:
            raise AuthNotFoundError()
        except Exception as e:
            raise AuthGeneralQueryError(e)

    async def update_auth(self, auth_update: AuthUpdate) -> AuthInDB:
        try:
            auth_in_db = await self.get_user_by_id(auth_update.target_id)
            if not isinstance(auth_in_db, AuthInDB):
                raise AuthGeneralQueryError(
                    "ERROR: Returned value from UsersDB.get_user_by_id is not type UserInDB"
                )

            patch_operations = []

            if auth_update.plain_text_password is not None:
                # Check if new password matches old password
                if AuthService.verify_password(
                    auth_update.plain_text_password,
                    auth_in_db.hashed_password,
                ):
                    raise AuthUpdateInvalidPasswordError()

                # TODO validate password meets requirements

                hashed_pw = AuthService.get_password_hash(
                    auth_update.plain_text_password
                )
                patch_operations.append(
                    {"op": "replace", "path": "/hashed_password", "value": hashed_pw}
                )

            if len(patch_operations) == 0:
                return auth_in_db

            print("operations:", patch_operations)

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
                item=auth_update.target_id,
                partition_key=auth_update.target_id,
                patch_operations=patch_operations,
            )

            return AuthInDB.model_validate(item, strict=True, extra="ignore")

        except exceptions.CosmosResourceNotFoundError:
            raise AuthNotFoundError()
        except AuthUpdateInvalidPasswordError:
            raise AuthUpdateInvalidPasswordError()
        except Exception as e:
            print(e)
            raise AuthUpdateError(e)

    async def delete_user(self, auth_id: str) -> None:
        try:
            await self.container.delete_item(item=auth_id, partition_key=auth_id)
        except exceptions.CosmosResourceNotFoundError:
            raise AuthNotFoundError()
        except Exception as e:
            raise AuthDeletionError(e)
