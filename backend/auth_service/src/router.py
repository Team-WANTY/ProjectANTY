import logging

from email_validator import EmailNotValidError
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import (
    APIKeyHeader,
    OAuth2PasswordBearer,
    OAuth2PasswordRequestForm,
)
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordNotFoundError,
)
from shared.exceptions.token import TokenError, TokenExpiredError
from shared.models.auth import UserAuthInfo
from shared.models.users import UserBase
from shared.settings import settings as shared_settings

from src.dependencies import get_auth_service
from src.exceptions import (
    AuthIncorrectPasswordError,
)
from src.models import PasswordResetRequest, UserAuthUpdate, UserCreate
from src.service import AuthService
from src.settings import settings

logger = logging.getLogger("auth_service")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
interservice_scheme = APIKeyHeader(name="X-Interservice-Key")


async def get_current_user_auth(
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
) -> UserAuthInfo:
    """Get current authenticated and active user from JWT token"""
    try:
        decoded_token = await auth_service.decode_token(token)
    except TokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired token"
        )
    except TokenError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token error",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error",
        )
    try:
        user_auth_info = await auth_service.get_user_auth_by_id(str(decoded_token.sub))
    except RecordNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Current user not found"
        )
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal query error",
        )

    # Check if user is active
    if not user_auth_info.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not active"
        )

    return user_auth_info


auth_router = APIRouter()


@auth_router.post(
    "/register",
    response_model=UserBase,
    status_code=status.HTTP_201_CREATED,
    tags=["authentication"],
)
async def register(
    user_create: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
) -> UserBase:
    try:
        created_user = await auth_service.register_user(user_create)
        return created_user.to_base().model_dump()
    except RecordAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User already exists"
        )
    except RecordCreationError:
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
    email_failed = False
    # TRY EMAIL
    try:
        user_auth_info = await auth_service.authenticate_user_by_email(
            form_data.username, form_data.password
        )
    except EmailNotValidError:
        email_failed = True
    except AuthIncorrectPasswordError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )
    except RecordNotFoundError:
        email_failed = True
    except GeneralQueryError:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    # TRY USERNAME
    if email_failed:
        try:
            user_auth_info = await auth_service.authenticate_user_by_username(
                form_data.username, form_data.password
            )
        except AuthIncorrectPasswordError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
            )
        except RecordNotFoundError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        except GeneralQueryError:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    if not user_auth_info.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive"
        )

    response.set_cookie(
        key="refresh_token",
        value=await auth_service.create_refresh_token(user_auth_info.id),
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRATION_DAYS * 24 * 60 * 60,
    )

    return {
        "access_token": await auth_service.create_access_token(user_auth_info.id),
        "token_type": "bearer",
    }


@auth_router.get(
    "/verify/{token}", status_code=status.HTTP_200_OK, tags=["interservice"]
)
async def verify_token(
    token: str,
    auth_service: AuthService = Depends(get_auth_service),
    x_interservice_key=Depends(interservice_scheme),
) -> UserAuthInfo:
    try:
        if x_interservice_key != shared_settings.INTERSERVICE_KEY:
            logger.error(f"Invalid interservice key: {x_interservice_key}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid key"
            )
        decoded_token = await auth_service.decode_token(token)
        if decoded_token.token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token type"
            )
        user_auth_info = await auth_service.get_user_auth_by_id(decoded_token.sub)
        return user_auth_info.model_dump()
    except HTTPException as e:
        raise e
    except TokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired token"
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error"
        )


@auth_router.get("/refresh", status_code=status.HTTP_200_OK, tags=["authentication"])
async def refresh_token(
    request: Request, auth_service: AuthService = Depends(get_auth_service)
):
    try:
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No refresh token present",
            )
        decoded_token = await auth_service.decode_token(refresh_token)
        if decoded_token.token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Server received invalid token type",
            )
    except TokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired token"
        )
    except HTTPException as e:
        raise e

    user_auth_info = await auth_service.get_user_auth_by_id(decoded_token.sub)

    if not user_auth_info.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User is set to inactive"
        )

    return {
        "access_token": await auth_service.create_access_token(user_auth_info.id),
        "token_type": "bearer",
    }


@auth_router.post(
    "/logout", status_code=status.HTTP_204_NO_CONTENT, tags=["authentication"]
)
async def logout(response: Response):
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
        new_auth_info = await auth_service.update_user_auth(
            auth_update, current_user_auth
        )
        return new_auth_info.to_base().model_dump()
    except AuthError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
