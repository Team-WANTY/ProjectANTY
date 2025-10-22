from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from shared.exceptions.db import (
    GeneralQueryError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.exceptions.interservice import InterserviceError
from shared.exceptions.token import TokenError, TokenExpiredError
from shared.models.users import UserBase, UserInDB

from src.dependencies import get_users_service, settings
from src.models import UserUpdate
from src.service import UsersService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.auth_service_external_url}/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    users_service: UsersService = Depends(get_users_service),
) -> UserBase:
    """Get current authenticated and active user from JWT token"""
    try:
        decoded_token = await users_service.verify_token(token)
    except TokenError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token error",
        )
    except TokenExpiredError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired token"
        )
    except InterserviceError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Interservice error",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error",
        )
    try:
        user_in_db = await users_service.get_user_by_id(str(decoded_token.sub))
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
    if not user_in_db.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not active"
        )

    return user_in_db


users_router = APIRouter()


@users_router.get("/me", response_model=UserBase, tags=["users"])
async def read_users_me(current_user: UserInDB = Depends(get_current_user)):
    """Get current user"""
    return current_user.to_base()


@users_router.get("/{user_id}", response_model=UserBase, tags=["users"])
async def get_user(
    user_id: str, users_service: UsersService = Depends(get_users_service)
) -> UserBase:
    """Get user by ID"""
    try:
        user = await users_service.get_user_by_id(user_id)
        return user.to_base()
    except RecordNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal query error",
        )


@users_router.patch("/", response_model=UserBase, tags=["users"])
async def update_user(
    user_update: UserUpdate,
    current_user: UserInDB = Depends(get_current_user),
    users_service: UsersService = Depends(get_users_service),
) -> UserInDB:
    """Update user (own profile or superuser can update any)"""
    if current_user.id != user_update.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    try:
        return await users_service.update_user(
            user_update,
            current_user.is_superuser
        )  # since perms needed, return full DB record
    except RecordNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    except RecordUpdateError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error",
        )
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error",
        )


@users_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["users"])
async def delete_user(
    user_id: str,
    current_user: UserInDB = Depends(get_current_user),
    users_service: UsersService = Depends(get_users_service),
):
    """Delete user"""
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    try:
        await users_service.delete_user(
            user_id
        )  # since perms needed return full DB record
    except RecordNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    except RecordDeletionError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal deletion Error",
        )
