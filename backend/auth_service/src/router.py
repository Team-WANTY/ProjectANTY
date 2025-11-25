from email_validator import EmailNotValidError
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import (
    APIKeyHeader,
    OAuth2PasswordBearer,
    OAuth2PasswordRequestForm,
)
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    EmptyRecordUpdateError,
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.exceptions.token import TokenError, TokenExpiredError
from shared.models.auth import UserAuthInfo
from shared.models.users import UserBase
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.dependencies import get_auth_service
from src.exceptions import (
    AuthIncorrectPasswordError,
)
from src.models import PasswordResetRequest, UserAuthUpdate, UserCreate
from src.service import AuthService
from src.settings import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
interservice_scheme = APIKeyHeader(name="X-Interservice-Key")


async def get_current_user_auth(
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
) -> UserAuthInfo:
    return await _get_current_user_auth_logic(token, auth_service)


async def _get_current_user_auth_logic(
    token: str,
    auth_service: AuthService,
) -> UserAuthInfo:
    logger.debug(f"Trying to get current UserAuthInfo from JWT token: {token}")
    try:
        logger.debug("Decoding JWT token")
        decoded_token = await auth_service.decode_token(token)
    except TokenExpiredError:
        logger.error("Error decoding JWT Token: expired token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired token"
        )
    except TokenError:
        logger.error("Error decoding JWT Token: general token error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token error",
        )
    except Exception as e:
        logger.error(f"Error decoding JWT Token, unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error",
        )
    logger.debug(f"Successfully decoded JWT token: {decoded_token.model_dump()}")
    try:
        logger.debug(f"Getting UserAuthInfo from token's `sub`: {decoded_token.sub}")
        user_auth_info = await auth_service.get_user_auth_by_id(decoded_token.sub)
    except RecordNotFoundError:
        logger.error(
            f"Error getting UserAuthInfo from token's `sub` ({decoded_token.sub}): user not found"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Current user not found"
        )
    except GeneralQueryError:
        logger.error(
            f"Error getting UserAuthInfo from token's `sub` ({decoded_token.sub}): general query error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal query error",
        )
    except Exception as e:
        logger.error(
            f"Error getting UserAutHInfo from token's `sub` ({decoded_token.sub}), unexpected error: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Check if user is active
    logger.debug(f"Checking if user '{user_auth_info.id}' is active")
    if not user_auth_info.is_active:
        logger.warning(f"User '{user_auth_info.id}' is not active")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not active"
        )

    logger.debug(
        f"Returning UserAuthInfo with id '{user_auth_info.id}': {user_auth_info.model_dump()}"
    )
    return user_auth_info


auth_router = APIRouter()


@auth_router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    tags=["authentication"],
)
async def register(
    user_create: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        logger.debug("Trying to register/create user")
        await auth_service.register_user(user_create)
    except RecordAlreadyExistsError:
        logger.error(
            f"Error registering/creating user ({user_create.model_dump()}): user info already exists"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User info already exists"
        )
    except RecordCreationError:
        logger.error(
            f"Error registering/creating user ({user_create.model_dump()}): general creation error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error registering user",
        )
    except Exception as e:
        logger.error(
            f"Error registering/creating user ({user_create.model_dump()}), unexpected error: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error registering user",
        )


@auth_router.post("/login", tags=["authentication"])
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),  # accepts username or email in 'username' field
    auth_service: AuthService = Depends(get_auth_service),
):
    logger.debug("Trying to login user")
    email_failed = False
    # TRY EMAIL
    try:
        logger.debug(f"Attempting login with '{form_data.username}' as email")
        user_auth_info = await auth_service.authenticate_user_by_email(
            form_data.username, form_data.password
        )
    except EmailNotValidError:
        logger.debug(
            f"Failed logging in with '{form_data.username}' as email: not a valid email"
        )
        email_failed = True
    except AuthIncorrectPasswordError:
        logger.debug(
            f"Failed logging in with '{form_data.username}' as email: invalid password"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    except RecordNotFoundError:
        logger.debug(
            f"Failed logging in with '{form_data.username}' as email: user with email not found"
        )
        email_failed = True
    except GeneralQueryError:
        logger.debug(
            f"Failed logging in with '{form_data.username}' as email: general query error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.debug(
            f"Failed logging in with '{form_data.username}' as email, unexpected error: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # TRY USERNAME
    if email_failed:
        try:
            logger.debug(f"Attempting login with '{form_data.username} as username'")
            user_auth_info = await auth_service.authenticate_user_by_username(
                form_data.username, form_data.password
            )
        except AuthIncorrectPasswordError:
            logger.error(
                f"Failed logging in with '{form_data.username}' as username: invalid password"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
            )
        except RecordNotFoundError:
            logger.error(
                f"Failed logging in with '{form_data.username}' as username: user with username not found"
            )
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        except GeneralQueryError:
            logger.error(
                f"Failed logging in with '{form_data.username}' as username: general query error"
            )
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.error(
                f"Failed logging in with '{form_data.username}' as username, unexpected error: {e}"
            )
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    logger.debug(f"Checking is user with id '{user_auth_info.id}' is active")
    if not user_auth_info.is_active:
        logger.warning(f"User with id '{user_auth_info.id}' is not active")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive"
        )

    logger.debug("Successfully logged in!")
    logger.debug(f"Creating refresh token for user with id '{user_auth_info.id}'")
    response.set_cookie(
        key="refresh_token",
        value=await auth_service.create_refresh_token(user_auth_info.id),
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60,
    )

    logger.debug(f"Returning access token for user with id '{user_auth_info.id}'")
    return {
        "access_token": await auth_service.create_access_token(user_auth_info.id),
        "token_type": "bearer",
    }


@auth_router.get(
    "/verify/{token}",
    response_model=UserAuthInfo,
    status_code=status.HTTP_200_OK,
    tags=["interservice"],
)
async def verify_token(
    token: str,
    auth_service: AuthService = Depends(get_auth_service),
    x_interservice_key=Depends(interservice_scheme),
) -> UserAuthInfo:
    try:
        logger.debug(f"Trying to verify token '{token}'")
        logger.debug("Checking if interservice key is valid")
        if x_interservice_key != shared_settings.INTERSERVICE_KEY:
            logger.warning(f"Interservice key '{x_interservice_key}' was not valid")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid key"
            )
        logger.debug(f"Trying to decode token '{token}'")
        decoded_token = await auth_service.decode_token(token)
        # TODO generalize to verify any sort of token?
        logger.debug(
            f"Checking if decoded token ({decoded_token.model_dump()}) is an access token"
        )
        if decoded_token.token_type != "access":
            logger.warning(
                f"Decoded token ({decoded_token.model_dump()}) is not an access token"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token type"
            )
        logger.debug(
            f"Getting UserAuthInfo of user with id '{decoded_token.sub}' from token"
        )
        user_auth_info = await auth_service.get_user_auth_by_id(decoded_token.sub)
        logger.debug(
            f"Returning UserAuthInfo with id '{user_auth_info.id}': {user_auth_info.model_dump()}"
        )
        return user_auth_info
    except HTTPException as e:
        # logging covered above
        raise e
    except TokenExpiredError:
        logger.error(f"Error trying to verify token '{token}': token expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired token"
        )
    except TokenError:
        logger.error(f"Error trying to verify token '{token}: token error'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token error"
        )
    except RecordNotFoundError:
        logger.error(f"Error trying to verify token '{token}': user record not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    except GeneralQueryError:
        logger.error(
            f"Error trying to verify token '{token}': user general query error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f"Error trying to verify token '{token}', unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error"
        )


@auth_router.get("/refresh", status_code=status.HTTP_200_OK, tags=["authentication"])
async def refresh_token(
    request: Request, auth_service: AuthService = Depends(get_auth_service)
):
    try:
        logger.debug("Trying to refresh access token, getting refresh token cookie")
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            logger.debug("No refresh token cookie present")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No refresh token present",
            )
        logger.debug(f"Trying to decode refresh token '{refresh_token}'")
        decoded_token = await auth_service.decode_token(refresh_token)
        if decoded_token.token_type != "refresh":
            logger.warning(
                f"Decoded token ({decoded_token.model_dump()}) is not a refresh token"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Server received invalid token type",
            )

        logger.debug(
            f"Trying to get UserAuthInfo for user with id '{decoded_token.sub}' from token"
        )
        user_auth_info = await auth_service.get_user_auth_by_id(decoded_token.sub)

        logger.debug(f"Checking if user with id '{user_auth_info.id}' is active")
        if not user_auth_info.is_active:
            logger.warning(f"User with id '{user_auth_info.id}' is not active")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User is set to inactive",
            )

        logger.debug(
            f"Returning refreshed access token for user with id '{user_auth_info.id}'"
        )
        return {
            "access_token": await auth_service.create_access_token(user_auth_info.id),
            "token_type": "bearer",
        }
    except HTTPException as e:
        # logging covered
        raise e
    except TokenExpiredError:
        logger.error("Error trying to refresh access token: expired token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired token"
        )
    except TokenError:
        logger.error("Error trying to refresh access token: token error")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token error"
        )
    except RecordNotFoundError:
        logger.error("Error trying to refresh access token: user record not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    except GeneralQueryError:
        logger.error("Error trying to refresh access token: user general query error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f"Error trying to refresh access token, unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error"
        )


@auth_router.post(
    "/logout", status_code=status.HTTP_204_NO_CONTENT, tags=["authentication"]
)
async def logout(response: Response):
    logger.debug("Trying to logout user")

    # TODO invalidate refresh token if stored in DB
    response.delete_cookie(
        key="refresh_token", httponly=True, secure=True, samesite="lax"
    )


@auth_router.post(
    "/request-password-reset", status_code=status.HTTP_200_OK, tags=["authentication"]
)
async def request_password_reset(
    email: str,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        await auth_service.request_password_reset(email)
    except EmailNotValidError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email format"
        )
    except Exception:
        return {
            "message": "If an account with that email exists, a reset link was sent."
        }

    return {"message": "If an account with that email exists, a reset link was sent."}


@auth_router.post(
    "/reset-password", status_code=status.HTTP_200_OK, tags=["authentication"]
)
async def reset_password(
    reset_request: PasswordResetRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        await auth_service.reset_password(
            reset_request.token, reset_request.new_password
        )
        return {"message": "Password reset successful"}
    except TokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password reset token expired",
        )
    except TokenError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password reset token",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error",
        )


@auth_router.patch("/", response_model=UserBase, tags=["authentication"])
async def update_auth(
    auth_update: UserAuthUpdate,
    auth_service: AuthService = Depends(get_auth_service),
    current_user_auth: UserAuthInfo = Depends(get_current_user_auth),
) -> UserBase:
    try:
        logger.debug(
            f"Trying to update UserAuthInfo of user '{auth_update.id}' with '{auth_update.model_dump()}'"
        )
        new_auth_info = await auth_service.update_user_auth(
            auth_update, current_user_auth
        )
        return new_auth_info
    except AuthError:
        logger.warning(
            f"Error updating UserAuthInfo of user '{auth_update.id}': unauthorized updater with id '{current_user_auth.id}'"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    except RecordNotFoundError:
        logger.error(
            f"Error updating UserAuthInfo of user '{auth_update.id}': user record not found"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except EmptyRecordUpdateError:
        logger.warning(
            f"Error updating UserAuthInfo of user '{auth_update.id}': no valid operations"
        )
        raise HTTPException(status_code=status.HTTP_204_NO_CONTENT)
    except RecordUpdateError:
        logger.error(
            f"Error updating UserAuthInfo of user '{auth_update.id}': update error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Update error"
        )
    except Exception as e:
        logger.error(
            f"Error updating UserAuthInfo with id {auth_update.id}, unexpected error: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Update error"
        )
