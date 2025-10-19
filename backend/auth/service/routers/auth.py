from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from service.config import settings
from service.dependencies import get_auth_service, get_users_service
from service.exceptions.auth import AuthError, AuthIncorrectPasswordError
from service.exceptions.user import (
    UserCreationError,
    UserEmailExistsError,
    UserInvalidCreationInputError,
    UserUsernameExistsError,
    UserNotFoundError
)
from service.models.user import User, UserCreate
from service.security.token import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from service.services.auth import AuthService
from service.services.user import UsersService

auth_router = APIRouter(prefix="/auth", tags=["authentication"])


@auth_router.post("/register", response_model=User)
async def register(
    response: Response,
    user_create: UserCreate,
    users_service: UsersService = Depends(get_users_service),
):
    """Register a new user"""
    try:
        created_user = await users_service.create_user(user_create)
        if created_user is None:
            raise UserInvalidCreationInputError()
        response.status_code = status.HTTP_201_CREATED
        return created_user
    except UserUsernameExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists"
        )
    except UserEmailExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists"
        )
    except UserInvalidCreationInputError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid input"
        )
    except UserCreationError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal creation error",
        )


@auth_router.post("/login")
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Login and get access token"""
    try:
        user = await auth_service.authenticate_user_by_username(
            form_data.username, form_data.password
        )
    except (UserNotFoundError,AuthIncorrectPasswordError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials"
        )
    except AuthError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal auth error",
        )
    if not isinstance(user, User):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal auth Error",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User is set to inactive"
        )

    response.set_cookie(
        key="refresh_token",
        value=create_refresh_token(user.id),
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.refresh_token_expiration_days * 24 * 60 * 60,
    )

    return {"access_token": create_access_token(user.id)}


@auth_router.post("/refresh")
async def refresh_token(
    request: Request, users_service: UsersService = Depends(get_users_service)
):
    refresh_token = request.cookies.get("refresh_token")
    print("COOKIES!:", request.cookies)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Server received no refresh token",
        )

    decoded_token = decode_token(refresh_token)
    if decoded_token.token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Server received invalid token type",
        )

    user = await users_service.get_user_by_id(str(decoded_token.sub))
    if not isinstance(user, User):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal auth error",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User is set to inactive"
        )

    return {"access_token": create_access_token(user.id)}
