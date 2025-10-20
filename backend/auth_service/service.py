import logging
from datetime import UTC, datetime, timedelta

import jwt
from email_validator import EmailNotValidError, validate_email
from pwdlib import PasswordHash

from backend.shared.models.token import Token
from backend.shared.models.users import UserCreate

from .database import AuthDB
from .exceptions import (
    AuthIncorrectPasswordError,
    AuthUpdateError,
    AuthUpdateInvalidPasswordError,
    TokenExpiredError,
    UserNotFoundError,
)
from .models import UserAuthInfo, UserAuthUpdate, UserInDB
from .settings import settings

logger = logging.getLogger("auth_service")
pwdhasher = PasswordHash.recommended()

class AuthService:
    def __init__(self, auth_db: AuthDB):
        self.db = auth_db
        logger.debug("Created AuthService")

    async def register_user(self, user_create: UserCreate) -> UserAuthInfo:
        try:
            logger.debug(f"Trying to register new user: {user_create.model_dump()}")
            user_auth_info = await self.db.create_user(user_create)
            logger.debug(f"Successfully registered new user: {user_auth_info.model_dump()}")
            return user_auth_info
        except Exception as e:
            logger.error(f"Error registering new user: {user_create.model_dump()}, unexpected: {e}")
            raise e

    async def authenticate_user_by_id(
        self, user_id: str, password: str
    ) -> UserAuthInfo:
        try:
            logger.debug(f"Trying to authenticate user with ID '{user_id}'")
            user_auth_info = await self.db.get_user_auth_by_id(user_id)
            if not pwdhasher.verify(password, user_auth_info.hashed_password):
                raise AuthIncorrectPasswordError()
            logger.debug(f"Successfully authenticated user with ID: '{user_id}': {user_auth_info.model_dump()}")
            return user_auth_info
        # except HTTPStatusError as e: #TODO interservice not necessary with auth service
        #     logger.error(f"Error authenticating user with ID '{user_id}', interservice error: {e}")
        #     raise AuthInterserviceError()
        except AuthIncorrectPasswordError as e:
            logger.warning(f"Error authenticating user with ID '{user_id}', invalid password")
            raise e
        except Exception as e:
            logger.error(f"Error authenticating user with ID {user_id}, unexpected:{e}")
            raise e

    async def authenticate_user_by_username(
        self, username: str, password: str
    ) -> UserAuthInfo:
        try:
            logger.debug(f"Trying to authenticate user with username '{username}'")
            user_auth_info = await self.db.get_user_auth_by_username(username)
            if not pwdhasher.verify(password, user_auth_info.hashed_password):
                raise AuthIncorrectPasswordError()
            logger.debug(f"Successfully authenticated user with username: '{username}': {user_auth_info.model_dump()}")
            return user_auth_info
        # except HTTPStatusError as e: #TODO interservice not necessary with auth service
        #     logger.error(f"Error authenticating user with username '{username}', interservice error: {e}")
        #     raise AuthInterserviceError()
        except AuthIncorrectPasswordError as e:
            logger.warning(f"Error authenticating user with username '{username}', invalid password")
            raise e
        except Exception as e:
            logger.error(f"Error authenticating user with username '{username}', unexpected: {e}")
            raise e

    async def authenticate_user_by_email(
        self, email: str, password: str
    ) -> UserAuthInfo:
        try:
            logger.debug("Trying to validate passed email")
            validate_email(email)
            logger.debug(f"Trying to authenticate user with email '{email}'")
            user_auth_info = await self.db.get_user_auth_by_email(email)
            if not pwdhasher.verify(password, user_auth_info.hashed_password):
                raise AuthIncorrectPasswordError()
            logger.debug(f"Successfully authenticated user with email '{email}': {user_auth_info.model_dump()}")
            return user_auth_info
        # except HTTPStatusError as e: #TODO interservice not necessary with auth service
        #     logger.error(f"Error authenticating user with email '{email}', interservice error: {e}")
        #     raise AuthInterserviceError()
        except EmailNotValidError as e:
            logger.warning(f"Error authenticating user with email '{email}', invalid email")
            raise e
        except AuthIncorrectPasswordError as e:
            logger.warning(f"Error authenticating user with email '{email}', invalid password")
            raise e
        except Exception as e:
            logger.error(f"Error authenticating user with email '{email}', unexpected: {e}")
            raise e

    async def get_user_by_id(self, user_id:str) -> UserAuthInfo:
        try:
            logger.debug(f"Trying to resolve and get user record with ID '{user_id}'")
            response = await self.client.post(
                "/interservice/resolve",
                params={"id": user_id},
            )
            response.raise_for_status()  # Raises exception for non-2xx responses
            json_data = response.json()
            user_auth_info = UserAuthInfo.model_validate(json_data, extra="ignore")
            logger.debug(f"Successfully got user with ID '{user_id}': {user_auth_info.model_dump()}")
            return user_auth_info
        # except HTTPStatusError as e: #TODO interservice not necessary with auth service
        #     logger.error(f"Error getting user with ID '{user_id}', interservice error: {e}")
        #     raise AuthInterserviceError()
        except Exception as e:
            logger.error(f"Error getting user with ID '{user_id}', unexpected: {e}")
            raise e

    async def update_user_auth(
        self, auth_update_info: UserAuthUpdate, updater_is_superuser:bool=False
    ) -> UserAuthInfo:
        try:
            logger.debug(f"Trying to resolve and get user record with ID '{auth_update_info.id}'")
            response = await self.client.post(
                "/interservice/resolve",
                params={"id": auth_update_info.id},
            )
            response.raise_for_status()  # Raises exception for non-2xx responses
            json_data = response.json()
            user_in_db = UserInDB.model_validate(json_data, extra="ignore")

            logger.debug(f"Trying to update user with ID '{auth_update_info.id}' (updated {"is" if updater_is_superuser else "is not"} a superuser)")#TODO for logging, get updater info
            new_user_auth_info = await self.db.update_auth(user_in_db, auth_update_info, updater_is_superuser)
        # except HTTPStatusError as e: #TODO interservice not necessary with auth service
        #     logger.error(f"Error updating user with ID '{auth_update_info.id}', interservice error: {e}")
        #     raise AuthInterserviceError()
        except AuthUpdateInvalidPasswordError as e:
            logger.error(f"Error updating user with ID '{auth_update_info.id}', invalid password")
            raise e
        except UserNotFoundError as e:
            logger.error(f"Error updating user with ID '{auth_update_info.id}', user not found")
            raise e
        except AuthUpdateError as e:
            logger.error(f"Error updating user with ID '{auth_update_info.id}', general error")
            raise e
        except Exception as e:
            logger.error(f"Error updating user with ID '{auth_update_info.id}', unexpected:{e}")
        logger.debug(f"Successfully updated user with ID '{auth_update_info.id}'")
        return new_user_auth_info

    # TOKEN FUNCTIONS
    @staticmethod
    async def create_access_token(user_id: str) -> str:
        try:
            logger.debug(f"Trying to create access token for user with ID '{user_id}'")
            expiration = datetime.now(UTC) + timedelta(
                minutes=settings.access_token_expiration_minutes
            )
            payload = Token(sub=user_id, exp=int(expiration.timestamp()), token_type="access").model_dump()
            token = jwt.encode(
                payload=payload,
                key=settings.token_private_key,
                algorithm=settings.token_algorithm,
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
                days=settings.refresh_token_expiration_days
            )
            payload = Token(sub=user_id, exp=int(expiration.timestamp()), token_type="refresh").model_dump()
            token = jwt.encode(
                payload=payload,
                key=settings.token_private_key,
                algorithm=settings.token_algorithm,
            )
            logger.debug(f"Successfully created refresh token for user with ID '{user_id}'")
            return token
        except Exception as e:
            logger.error(f"Error creating refresh token for user with ID '{user_id}', unexpected: {e}")
            raise e

    @staticmethod
    async def decode_token(token_str: str) -> Token:
        try:
            logger.debug("Trying to decode JWT string to Token")
            payload: dict = jwt.decode(
                jwt=token_str,
                key=settings.token_public_key,
                algorithms=[settings.token_algorithm],
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
            raise e
