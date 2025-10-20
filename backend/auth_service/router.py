import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Header
from fastapi.security import OAuth2PasswordRequestForm
from backend.shared.models.users import UserCreate

from .exceptions import (
    AuthIncorrectPasswordError,
    TokenExpiredError,
)
from email_validator import EmailNotValidError
from .main import get_auth_service
from .models import UserBase
from .service import AuthService
from .settings import settings

logger = logging.getLogger("auth_service")

auth_router = APIRouter()


@auth_router.post(
    "/register", response_model=UserBase, status_code=status.HTTP_201_CREATED, tags=["authentication"]
)
async def register(
    response: Response,
    user_create: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        created_user = await auth_service.register_user(user_create)
        response.status_code = status.HTTP_201_CREATED
        return created_user.to_base()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@auth_router.post("/login", status_code=status.HTTP_200_OK, tags=["authentication"])
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),  # accepts username or email in 'username' field
    auth_service: AuthService = Depends(get_auth_service),
):
    email_failed = False
    #TRY EMAIL
    try:
        user_auth_info = await auth_service.authenticate_user_by_email(
            form_data.username, form_data.password
        )
    except EmailNotValidError:
        email_failed = True
    except AuthIncorrectPasswordError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    #TRY USERNAME
    if email_failed:
        try:
            logger.debug("Trying username")
            user_auth_info = await auth_service.authenticate_user_by_username(
                form_data.username, form_data.password
            )
        except AuthIncorrectPasswordError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    if not user_auth_info.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive"
        )

    response.set_cookie(
        key="refresh_token",
        value=await auth_service.create_refresh_token(user_auth_info.id),
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.refresh_token_expiration_days * 24 * 60 * 60,
    )

    return {
        "access_token": await auth_service.create_access_token(user_auth_info.id),
        "token_type": "bearer",
    }


@auth_router.get("/verify", status_code=status.HTTP_200_OK, tags=["interservice"])
async def verify_token(
    token: str,
    auth_service: AuthService = Depends(get_auth_service),
    x_interservice_key: str = Header(None)
):
    try:
        if x_interservice_key != settings.interservice_key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid key")
        decoded_token = await auth_service.decode_token(token)
        if decoded_token.token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token type"
            )
        return decoded_token.model_dump()
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


@auth_router.post("/refresh", status_code=status.HTTP_200_OK, tags=["authentication"])
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

    user = await auth_service.get_user_by_id(decoded_token.sub)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User is set to inactive"
        )

    return {
        "access_token": await auth_service.create_access_token(user.id),
        "token_type": "bearer",
    }


@auth_router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, tags=["authentication"])
async def logout(response: Response):
    # TODO invalidate refresh token if stored in DB
    response.delete_cookie(
        key="refresh_token", httponly=True, secure=True, samesite="lax"
    )
