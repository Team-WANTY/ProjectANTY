from datetime import UTC, datetime, timedelta

import jwt
from httpx import AsyncClient, HTTPError
from pydantic import EmailStr

from auth_service.database import AuthDB
from auth_service.exceptions import (
    AuthIncorrectPasswordError,
    AuthInterserviceError,
    TokenExpiredError,
)
from auth_service.models import UserAuthInfo, UserAuthUpdate, UserInDB
from auth_service.settings import settings
from shared.models.token import Token
from shared.models.users import UserCreate


class AuthService:
    def __init__(self, auth_db: AuthDB, user_service_http_client: AsyncClient):
        self.db = auth_db
        self.user_client = user_service_http_client

    async def register_user(self, user_create: UserCreate) -> UserAuthInfo:
        try:
            response = await self.user_client.post(
                "/users/interservice/create_user", json=user_create.model_dump()
            )
            response.raise_for_status()  # TODO catch specific errors for existing, password failed requirements
            json_data = response.json()
        except HTTPError as e:
            raise AuthInterserviceError(e)
        user_auth_info = UserAuthInfo.model_validate(
            json_data, strict=True, extra="ignore"
        )
        return user_auth_info

    async def authenticate_user_by_id(
        self, user_id: str, password: str
    ) -> UserAuthInfo:
        try:
            response = await self.client.post(
                "/interservice/resolve",
                params={"id": user_id},
            )
            response.raise_for_status()  # Raises exception for non-2xx responses
            json_data = response.json()
        except HTTPError:
            raise AuthInterserviceError()
        user_auth_info = UserAuthInfo.model_validate(
            json_data, strict=True, extra="ignore"
        )
        if not self.verify_password(password, user_auth_info.hashed_password):
            raise AuthIncorrectPasswordError()
        return user_auth_info

    async def authenticate_user_by_username(
        self, username: str, password: str
    ) -> UserAuthInfo:
        try:
            response = await self.client.post(
                "/interservice/resolve",
                params={"username": username},
            )
            response.raise_for_status()  # Raises exception for non-2xx responses
            json_data = response.json()
        except HTTPError:
            raise AuthInterserviceError()
        user_auth_info = UserAuthInfo.model_validate(
            json_data, strict=True, extra="ignore"
        )
        if not self.verify_password(password, user_auth_info.hashed_password):
            raise AuthIncorrectPasswordError()
        return user_auth_info

    async def authenticate_user_by_email(
        self, email: EmailStr, password: str
    ) -> UserAuthInfo:
        try:
            response = await self.client.post(
                "/interservice/resolve",
                params={"email": email},
            )
            response.raise_for_status()  # Raises exception for non-2xx responses
            json_data = response.json()
        except HTTPError:
            raise AuthInterserviceError()
        user_auth_info = UserAuthInfo.model_validate(
            json_data, strict=True, extra="ignore"
        )
        if not self.verify_password(password, user_auth_info.hashed_password):
            raise AuthIncorrectPasswordError()
        return user_auth_info

    async def get_user_by_id(self, user_id) -> UserAuthInfo:
        try:
            response = await self.client.post(
                "/interservice/resolve",
                params={"id": user_id},
            )
            response.raise_for_status()  # Raises exception for non-2xx responses
            json_data = response.json()
        except HTTPError:
            raise AuthInterserviceError()
        user_auth_info = UserAuthInfo.model_validate(
            json_data, strict=True, extra="ignore"
        )
        return user_auth_info

    async def update_user_auth_superuser(
        self, auth_update_info: UserAuthUpdate
    ) -> UserAuthInfo:
        try:
            response = await self.client.post(
                "/interservice/resolve",
                params={"id": auth_update_info.id},
            )
            response.raise_for_status()  # Raises exception for non-2xx responses
            json_data = response.json()
        except HTTPError:
            raise AuthInterserviceError()
        user_in_db = UserInDB.model_validate(json_data, strict=True, extra="ignore")
        new_user_auth_info = await self.db.update_auth(user_in_db, auth_update_info)
        return new_user_auth_info

    async def update_user_auth_owner(
        self, auth_update_info: UserAuthUpdate
    ) -> UserAuthInfo:
        try:
            response = await self.client.post(
                "/interservice/resolve",
                params={"id": auth_update_info.id},
            )
            response.raise_for_status()  # Raises exception for non-2xx responses
            json_data = response.json()
        except HTTPError:
            raise AuthInterserviceError()
        user_in_db = UserInDB.model_validate(json_data, strict=True, extra="ignore")
        auth_update_info.is_active = None
        auth_update_info.is_superuser = None
        new_user_auth_info = await self.db.update_auth(user_in_db, auth_update_info)
        return new_user_auth_info

    # TOKEN FUNCTIONS
    @staticmethod
    async def create_access_token(user_id: str) -> str:
        expiration = datetime.now(UTC) + timedelta(
            minutes=settings.access_token_expiration_minutes
        )
        token = Token(sub=user_id, exp=int(expiration.timestamp()), token_type="access")
        payload = token.model_dump()
        return jwt.encode(
            payload=payload,
            key=settings.token_private_key,
            algorithm=settings.token_algorithm,
        )

    @staticmethod
    async def create_refresh_token(user_id: str) -> str:
        expiration = datetime.now(UTC) + timedelta(
            days=settings.refresh_token_expiration_days
        )
        token = Token(
            sub=user_id, exp=int(expiration.timestamp()), token_type="refresh"
        )
        payload = token.model_dump()
        return jwt.encode(
            payload=payload,
            key=settings.token_private_key,
            algorithm=settings.token_algorithm,
        )

    @staticmethod
    async def decode_token(token_str: str) -> Token:
        try:
            payload: dict = jwt.decode(
                jwt=token_str,
                key=settings.token_public_key,
                algorithms=[settings.token_algorithm],
            )
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError()

        token = Token.model_validate(payload, strict=True, extra="ignore")
        now = int(datetime.now(UTC).timestamp())
        if token.exp <= now:
            raise TokenExpiredError()

        return token
