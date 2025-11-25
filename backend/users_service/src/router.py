from fastapi import APIRouter, Depends, HTTPException, status
from shared.auth import get_current_user_auth
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    EmptyRecordUpdateError,
    GeneralQueryError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.auth import UserAuthInfo
from shared.models.users import UserBase, UserInDB
from shared.simple_logging import logger

from src.dependencies import get_users_service
from src.models import UserUpdate
from src.service import UsersService


async def get_current_user(
    current_user_auth: UserAuthInfo = Depends(get_current_user_auth),
    users_service: UsersService = Depends(get_users_service),
) -> UserInDB:
    """Get current authenticated and active user from JWT token"""
    try:
        user_in_db = await users_service.get_user_by_id(current_user_auth.id)
    except RecordNotFoundError:
        logger.error(
            f"Error trying to get current user from UserAuthInfo '{current_user_auth.model_dump()}': not found"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Current user not found"
        )
    except GeneralQueryError:
        logger.error(
            f"Error trying to get current user from UserAuthInfo '{current_user_auth.model_dump()}': query error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting current user",
        )
    except Exception as e:
        logger.error(
            f"Error trying to get current user from UserAuthInfo '{current_user_auth.model_dump()}', unexpected: {e}"
        )

    # Check if user is active
    if not user_in_db.is_active:
        logger.warning(
            f"Current user with UserAuthInfo '{current_user_auth.model_dump()}' not active"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User not active"
        )

    return user_in_db


users_router = APIRouter()


@users_router.get("/me", response_model=UserInDB, tags=["users"])
async def read_users_me(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Get current user"""
    return current_user


@users_router.get("/{user_id}", response_model=UserBase, tags=["users"])
async def get_user(
    user_id: str, users_service: UsersService = Depends(get_users_service)
) -> UserBase:
    """Get user by ID"""
    try:
        user = await users_service.get_user_by_id(user_id)
        return user
    except RecordNotFoundError:
        logger.error(f"Error getting user with ID '{user_id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(f"Error getting user with id '{user_id}': query error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal query error",
        )
    except Exception as e:
        logger.error(f"Error getting user with id '{user_id}', unexpected: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error"
        )


@users_router.patch("/", response_model=UserInDB, tags=["users"])
async def update_user(
    user_update: UserUpdate,
    current_user_auth: UserAuthInfo = Depends(get_current_user_auth),
    users_service: UsersService = Depends(get_users_service),
) -> UserInDB:
    """Update user (own profile or superuser can update any)"""
    try:
        return await users_service.update_user(
            user_update, current_user_auth
        )  # TODO should return full record since authorization needed?
    except AuthError:
        logger.warning(
            f"Error trying to update user with ID '{user_update.id}': authorization error"
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    except RecordNotFoundError:
        logger.error(
            f"Error trying to update user with ID '{user_update.id}': not found"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except EmptyRecordUpdateError:
        logger.warning(
            f"Error trying to update user with ID '{user_update.id}': no valid operations"
        )
        raise HTTPException(status_code=status.HTTP_204_NO_CONTENT)

    except RecordUpdateError:
        logger.error(
            f"Error trying to update user with ID '{user_update.id}': update error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating user",
        )
    except GeneralQueryError:
        logger.error(
            f"Error trying to update user with ID '{user_update.id}': query error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error querying old user record",
        )
    except Exception as e:
        logger.error(
            f"Error trying to update user with ID '{user_update.id}', unexpected: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error"
        )


@users_router.delete(
    "/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["users"]
)
async def delete_user(
    user_id: str,
    current_user_auth: UserAuthInfo = Depends(get_current_user_auth),
    users_service: UsersService = Depends(get_users_service),
):
    """Delete user"""
    try:
        await users_service.delete_user(
            user_id, current_user_auth
        )  # TODO should return full record since authorization needed?
    except AuthError:
        logger.warning(
            f"Error trying to delete user with ID '{user_id}': authorization error"
        )
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    except RecordNotFoundError:
        logger.error(f"Error trying to delete user with ID '{user_id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordDeletionError:
        logger.warning(
            f"Error trying to delete user with ID '{user_id}': deletion error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting user",
        )
    except Exception as e:
        logger.warning(
            f"Error trying to delete user with ID '{user_id}', unexpected: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error"
        )
