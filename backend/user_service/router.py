from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from .main import get_users_service
from .exceptions import (
    UserDeletionError,
    UserGeneralQueryError,
    UserNotFoundError,
    UserUpdateError,
    UserUpdateInvalidPasswordError,
)
from .models import User, UserUpdate
from .service import UsersService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    users_service: UsersService = Depends(get_users_service),
) -> User:
    """Get current authenticated and active user from JWT token"""
    try:
        decoded_token = await users_service.verify_token(token)
    except JWTTokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired token"
        )
    except JWTTokenError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal token error",
        )
    if decoded_token.token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Server did not recieve access token",
        )

    try:
        user = await users_service.get_user_by_id(str(decoded_token.sub))
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Current user not found"
        )
    except UserGeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal query error",
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User is set to inactive"
        )

    return user


user_router = APIRouter(prefix="/users", tags=["users"])


@user_router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user"""
    return current_user


@user_router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: str, users_service: UsersService = Depends(get_users_service)
):
    """Get user by ID"""
    try:
        user = await users_service.get_user_by_id(user_id)
        if not isinstance(user, User):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )
        return user
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    except UserGeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal query error",
        )


@user_router.patch("/", response_model=User)
async def update_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    users_service: UsersService = Depends(get_users_service),
):
    """Update user (own profile or superuser can update any)"""
    if current_user.id != user_update.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    try:
        return await users_service.update_user(user_update)
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    except UserUpdateInvalidPasswordError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid password"
        )
    except UserUpdateError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal update error",
        )
    except UserGeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal query error",
        )


@user_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    users_service: UsersService = Depends(get_users_service),
):
    """Delete user (superuser only)"""
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    try:
        await users_service.delete_user(user_id)
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    except UserDeletionError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal deletion Error",
        )


# @user_router.get("/", response_model=list[User])
# async def list_users(
#     skip: int = 0,
#     limit: int = 100,
#     current_user: User = Depends(get_current_superuser)
# ):
#     """List all users (superuser only)"""
#     if current_user.is_superuser:
#         return auth.list_users(skip, limit)
