import asyncio
from datetime import timedelta

import jwt
from email_validator import EmailNotValidError, validate_email
from httpx import AsyncClient
from pwdlib import PasswordHash
from shared.auth import authorize_operation
from shared.db import now_timestamp
from shared.exceptions.db import (
    GeneralQueryError,
)
from shared.exceptions.token import TokenError, TokenExpiredError
from shared.models.token import Token
from shared.models.users import UserInDB
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.database import AuthDB
from src.email import send_email
from src.exceptions import (
    AuthIncorrectPasswordError,
)
from src.models import UserAuthUpdate
from src.settings import settings

pwdhasher = PasswordHash.recommended()


class AuthService:
    def __init__(self, auth_db: AuthDB):
        self.db = auth_db
        logger.debug("Created AuthService")

    async def _get_user_from_service(self, identifier_type: str, identifier: str):
        async with AsyncClient() as client:
            response = await client.get(
                f"{shared_settings.USERS_SERVICE_URL}/{identifier_type}/{identifier}",
                headers={"X-Interservice-Key": shared_settings.INTERSERVICE_KEY},
            )
            if response.status_code != 200:
                raise GeneralQueryError()

            user_in_db = UserInDB.model_validate(response.json(), extra="ignore")
        return user_in_db

    async def authenticate_user_by_username(
        self, username: str, password: str
    ) -> UserInDB:
        logger.debug(f"Trying to authenticate user with username '{username}'")
        user_in_db = await self._get_user_from_service("username", username)
        logger.debug(f"Verifying hashed password of user with ID '{user_in_db.id}'")
        if not pwdhasher.verify(password, user_in_db.hashed_password):
            logger.error(f"Invalid password for user with ID '{user_in_db.id}'")
            raise AuthIncorrectPasswordError()
        logger.debug(
            f"Successfully authenticated user with username: '{username}': {user_in_db.model_dump()}"
        )
        return user_in_db

    async def authenticate_user_by_email(self, email: str, password: str) -> UserInDB:
        try:
            logger.debug("Trying to validate passed email")
            validate_email(email)
        except EmailNotValidError as e:
            logger.warning(
                f"Error authenticating user with email '{email}', invalid email"
            )
            raise e
        logger.debug(f"Trying to authenticate user with email '{email}'")
        user_in_db = await self._get_user_from_service("email", email)
        logger.debug(f"Verifying hashed password of user with ID '{user_in_db.id}'")
        if not pwdhasher.verify(password, user_in_db.hashed_password):
            logger.error(f"Invalid password for user with ID '{user_in_db.id}'")
            raise AuthIncorrectPasswordError()
        logger.debug(
            f"Successfully authenticated user with email '{email}': {user_in_db.model_dump()}"
        )
        return user_in_db

    async def update_user_auth(
        self, auth_update_info: UserAuthUpdate, updater: UserInDB
    ):
        logger.debug(
            f"Checking if {updater.id} is authorized to update {auth_update_info.id}"
        )
        await authorize_operation(updater, auth_update_info.id)
        if not updater.is_superuser:
            logger.debug("User it not a superuser, deleting restricted update info")
            auth_update_info.is_active = None
            auth_update_info.is_superuser = None
        logger.debug(f"Trying to get user record with ID '{auth_update_info.id}'")
        old_user_in_db = await self._get_user_from_service("id", auth_update_info.id)
        logger.debug(f"Trying to update user with ID '{auth_update_info.id}'")
        await self.db.update_auth(old_user_in_db, auth_update_info)

    async def request_password_reset(self, email: str):
        # Verify email exists
        user_in_db = await self._get_user_from_service("email", email)
        reset_token = await self.create_password_reset_token(user_in_db.id)
        reset_link = (
            f"{settings.FRONTEND_URL}/redirect/app?page=recovery&token={reset_token}"
        )
        logger.debug("Token and link generated, try to send recovery email to user.")

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None,
            send_email,
            user_in_db.email,
            "Password Reset Request",
            f"Click the following link to reset your password: {reset_link}\n\nThis link expires in 30 minutes.",
        )

    async def reset_password(self, token_str: str, new_password: str):
        try:
            logger.debug("Decoding password reset token")
            token = await self.decode_token(token_str)
            if token.token_type != "password_reset":
                raise TokenError("Invalid token type for password reset")

            user_in_db = await self._get_user_from_service("id", token.sub)

            update_data = UserAuthUpdate(
                id=user_in_db.id,
                plain_text_password=new_password,
                is_superuser=True,
            )
            updated_user = await self.update_user_auth(update_data, user_in_db)
            logger.debug(f"Password reset successful for user '{token.sub}'")
            return updated_user

        except TokenExpiredError:
            logger.warning("Password reset token expired")
            raise TokenExpiredError()
        except Exception as e:
            logger.error(f"Unexpected error resetting password: {e}")
            raise TokenError("Failed to reset password")

    # TOKEN FUNCTIONS
    @staticmethod
    async def create_access_token(user_id: str) -> str:
        try:
            logger.debug(f"Trying to create access token for user with ID '{user_id}'")
            expiration = now_timestamp() + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRATION_MINUTES
            )
            payload = Token(
                sub=user_id, exp=expiration, token_type="access"
            ).model_dump()
            token = jwt.encode(
                payload=payload,
                key=settings.TOKEN_PRIVATE_KEY,
                algorithm=settings.TOKEN_ALGORITHM,
            )
            logger.debug(
                f"Successfully created access token for user with ID '{user_id}'"
            )
            return token
        except Exception as e:
            logger.error(
                f"Error creating access token for user with ID '{user_id}', unexpected: {e}"
            )
            raise e

    @staticmethod
    async def create_refresh_token(user_id: str) -> str:
        try:
            logger.debug(f"Trying to create refresh token for user with ID '{user_id}'")
            expiration = now_timestamp() + timedelta(
                days=settings.REFRESH_TOKEN_EXPIRATION_DAYS
            )
            payload = Token(
                sub=user_id, exp=expiration, token_type="refresh"
            ).model_dump()
            token = jwt.encode(
                payload=payload,
                key=settings.TOKEN_PRIVATE_KEY,
                algorithm=settings.TOKEN_ALGORITHM,
            )
            logger.debug(
                f"Successfully created refresh token for user with ID '{user_id}'"
            )
            return token
        except Exception as e:
            logger.error(
                f"Error creating refresh token for user with ID '{user_id}', unexpected: {e}"
            )
            raise e

    @staticmethod
    async def create_password_reset_token(user_id: str) -> str:
        try:
            logger.debug(f"Creating password reset token for user '{user_id}'")
            expiration = now_timestamp() + timedelta(
                minutes=settings.PW_RESET_TOKEN_EXPIRATION_MINUTES
            )
            payload = Token(
                sub=user_id,
                exp=expiration,
                token_type="password_reset",
            ).model_dump()
            token = jwt.encode(
                payload=payload,
                key=settings.TOKEN_PRIVATE_KEY,
                algorithm=settings.TOKEN_ALGORITHM,
            )
            logger.debug(
                f"Successfully created password reset token for user '{user_id}'"
            )
            return token
        except Exception as e:
            logger.error(
                f"Error creating password reset token for user '{user_id}': {e}"
            )
            raise e

    @staticmethod
    async def decode_token(token_str: str) -> Token:
        try:
            logger.debug("Trying to decode JWT string to Token")
            payload: dict = jwt.decode(
                jwt=token_str,
                key=settings.TOKEN_PUBLIC_KEY,
                algorithms=settings.TOKEN_ALGORITHM,
            )

            token = Token.model_validate(payload, extra="ignore")
            now = now_timestamp()
            if token.exp <= now:
                raise TokenExpiredError()
            logger.debug("Successfully decoded JWT string to Token")
            return token
        except jwt.ExpiredSignatureError:
            logger.warning("Error decoding JWT string to Token, expired signature")
            raise TokenExpiredError()
        except TokenExpiredError as e:
            logger.warning("Error decoding JWT string to Token, expired signature")
            raise e
        except Exception as e:
            logger.error(f"Error decoding JWT string to Token, unexpected: {e}")
            raise TokenError()
