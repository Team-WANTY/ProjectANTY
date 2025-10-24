import asyncio
import logging
from datetime import UTC, datetime, timedelta

import jwt
from email_validator import EmailNotValidError, validate_email
from pwdlib import PasswordHash
from shared.auth import authorize_operation
from shared.exceptions.token import TokenError, TokenExpiredError
from shared.models.auth import UserAuthInfo
from shared.models.token import Token

from src.database import AuthDB
from src.email import send_email
from src.exceptions import (
    AuthIncorrectPasswordError,
)
from src.models import UserAuthUpdate, UserCreate
from src.settings import settings

logger = logging.getLogger("auth_service")
pwdhasher = PasswordHash.recommended()

PW_RESET_TOKEN_EXPIRATION_MINUTES = 15

class AuthService:
    def __init__(self, auth_db: AuthDB):
        self.db = auth_db
        logger.debug("Created AuthService")

    async def register_user(self, user_create: UserCreate) -> UserAuthInfo:
        logger.debug(f"Trying to register new user: {user_create.model_dump()}")
        user_auth_info = await self.db.create_user(user_create)
        logger.debug(f"Successfully registered new user: {user_auth_info.model_dump()}")
        return user_auth_info

    async def authenticate_user_by_id(
        self, user_id: str, password: str
    ) -> UserAuthInfo:
        logger.debug(f"Trying to authenticate user with ID '{user_id}'")
        user_auth_info = await self.db.get_user_auth_by_id(user_id)
        if not pwdhasher.verify(password, user_auth_info.hashed_password):
            raise AuthIncorrectPasswordError()
        logger.debug(f"Successfully authenticated user with ID: '{user_id}': {user_auth_info.model_dump()}")
        return user_auth_info

    async def authenticate_user_by_username(
        self, username: str, password: str
    ) -> UserAuthInfo:
        logger.debug(f"Trying to authenticate user with username '{username}'")
        user_auth_info = await self.db.get_user_auth_by_username(username)
        if not pwdhasher.verify(password, user_auth_info.hashed_password):
            raise AuthIncorrectPasswordError()
        logger.debug(f"Successfully authenticated user with username: '{username}': {user_auth_info.model_dump()}")
        return user_auth_info

    async def authenticate_user_by_email(
        self, email: str, password: str
    ) -> UserAuthInfo:
        try:
            logger.debug("Trying to validate passed email")
            validate_email(email)
        except EmailNotValidError as e:
            logger.warning(f"Error authenticating user with email '{email}', invalid email")
            raise e
        logger.debug(f"Trying to authenticate user with email '{email}'")
        user_auth_info = await self.db.get_user_auth_by_email(email)
        if not pwdhasher.verify(password, user_auth_info.hashed_password):
            raise AuthIncorrectPasswordError()
        logger.debug(f"Successfully authenticated user with email '{email}': {user_auth_info.model_dump()}")
        return user_auth_info

    async def get_user_auth_by_id(self, user_id:str) -> UserAuthInfo:
        logger.debug(f"Trying to resolve and get user record with ID '{user_id}'")
        user_auth_info = await self.db.get_user_auth_by_id(user_id)
        logger.debug(f"Successfully got user with ID '{user_id}': {user_auth_info.model_dump()}")
        return user_auth_info

    async def get_user_auth_by_email(self, email:str) -> UserAuthInfo:
        logger.debug(f"Trying to resolve and get user record with email '{email}'")
        user_auth_info = await self.db.get_user_auth_by_email(email)
        logger.debug(f"Successfully got user with email '{email}': {user_auth_info.model_dump()}")
        return user_auth_info

    async def update_user_auth(
        self, auth_update_info: UserAuthUpdate, updater:UserAuthInfo
    ) -> UserAuthInfo:
        logger.debug(f"Checking if {updater.id} is authorized to update {auth_update_info.id}")
        await authorize_operation(updater, auth_update_info.id)
        if not updater.is_superuser:
            auth_update_info.is_active = None
            auth_update_info.is_superuser = None
        logger.debug(f"Trying to resolve and get user record with ID '{auth_update_info.id}'")
        old_user_auth_info = await self.get_user_auth_by_id(auth_update_info.id)
        logger.debug(f"Trying to update user with ID '{auth_update_info.id}'")#TODO for logging, get updater info
        new_user_auth_info = await self.db.update_auth(old_user_auth_info, auth_update_info)
        return new_user_auth_info

    async def request_password_reset(self, email:str):
        # Verify email exists
        user_auth_info = await self.get_user_auth_by_email(email)
        reset_token = await self.create_password_reset_token(user_auth_info.id)
        reset_link = f"{settings.FRONTEND_URL}/redirect/app?page=recovery&token={reset_token}"
        logger.debug(f"Token and link generated, try to send recovery email to user.")

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, send_email, user_auth_info.email, "Password Reset Request",
            f"Click the following link to reset your password: {reset_link}\n\nThis link expires in 30 minutes."
        )

    async def reset_password(self, token_str: str, new_password: str):
        try:
            logger.debug("Decoding password reset token")
            token = await self.decode_token(token_str)
            if token.token_type != "password_reset":
                raise TokenError("Invalid token type for password reset")

            user_auth_info = await self.get_user_auth_by_id(token.sub)
            update_data = UserAuthUpdate(
                id=user_auth_info.id,
                plain_text_password=new_password,
                is_superuser=True
            )
            updated_user = await self.update_user_auth(update_data, user_auth_info)
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
            expiration = datetime.now(UTC) + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRATION_MINUTES
            )
            payload = Token(sub=user_id, exp=int(expiration.timestamp()), token_type="access").model_dump()
            token = jwt.encode(
                payload=payload,
                key=settings.TOKEN_PRIVATE_KEY,
                algorithm=settings.TOKEN_ALGORITHM,
            )
            logger.debug(f"Successfully created access token for user with ID '{user_id}'")
            return token
        except Exception as e:
            logger.error(f"Error creating access token for user with ID '{user_id}', unexpected: {e}")
            raise e

    @staticmethod
    async def create_refresh_token(user_id: str) -> str:
        try:
            logger.debug(f"Trying to create refresh token for user with ID '{user_id}'")
            expiration = datetime.now(UTC) + timedelta(
                days=settings.REFRESH_TOKEN_EXPIRATION_DAYS
            )
            payload = Token(sub=user_id, exp=int(expiration.timestamp()), token_type="refresh").model_dump()
            token = jwt.encode(
                payload=payload,
                key=settings.TOKEN_PRIVATE_KEY,
                algorithm=settings.TOKEN_ALGORITHM,
            )
            logger.debug(f"Successfully created refresh token for user with ID '{user_id}'")
            return token
        except Exception as e:
            logger.error(f"Error creating refresh token for user with ID '{user_id}', unexpected: {e}")
            raise e

    @staticmethod
    async def create_password_reset_token(user_id: str) -> str:
        try:
            logger.debug(f"Creating password reset token for user '{user_id}'")
            expiration = datetime.now(UTC) + timedelta(minutes=PW_RESET_TOKEN_EXPIRATION_MINUTES)
            payload = Token(
                sub=user_id,
                exp=int(expiration.timestamp()),
                token_type="password_reset"
            ).model_dump()
            token = jwt.encode(
                payload=payload,
                key=settings.TOKEN_PRIVATE_KEY,
                algorithm=settings.TOKEN_ALGORITHM,
            )
            logger.debug(f"Successfully created password reset token for user '{user_id}'")
            return token
        except Exception as e:
            logger.error(f"Error creating password reset token for user '{user_id}': {e}")
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
            now = int(datetime.now(UTC).timestamp())
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
