from fastapi import APIRouter, Depends, HTTPException, status
from shared.auth import get_current_user_auth
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    GeneralQueryError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.auth import UserAuthInfo
from shared.models.users import UserBase, UserInDB, UserInfo

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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Current user not found"
        )
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting current user",
        )

    # Check if user is active
    if not user_in_db.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User not active"
        )

    return user_in_db


users_router = APIRouter()


@users_router.get("/me", response_model=UserInDB, tags=["users"])
async def read_users_me(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Get current user"""
    return current_user.model_dump()

@users_router.get("/id/{user_id}", response_model=UserInfo, tags=["users"])
async def get_user(
    user_id: str,
    _current_user_auth: UserAuthInfo = Depends(get_current_user_auth),
    users_service: UsersService = Depends(get_users_service)
) -> UserInfo:
    """Get user by ID"""
    try:
        user = await users_service.get_user_by_id(user_id)
        return user.to_info()
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal query error",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error"
        )

    # @users_router.get("/{user_id}", response_model=UserBase, tags=["users"])
    # async def get_user(
    #     user_id: str, users_service: UsersService = Depends(get_users_service)
    # ) -> UserBase:
    #     """Get user by ID"""
    #     try:
    #         user = await users_service.get_user_by_id(user_id)
    #         return user.to_base()
    #     except RecordNotFoundError:
    #         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    #     except GeneralQueryError:
    #         raise HTTPException(
    #             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    #             detail="Internal query error",
    #         )
    #     except Exception:
    #         raise HTTPException(
    #             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error"
    #         )

@users_router.get("/lookup/{username}", response_model=UserBase, tags=["users"])
async def get_user_by_username(
    username: str, users_service: UsersService = Depends(get_users_service)
) -> UserBase:
    """Get user by username"""
    try:
        user = await users_service.get_user_by_username(username)
        return user
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal query error",
        )
    except Exception:
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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordUpdateError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating user",
        )
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error querying old user record",
        )
    except Exception:
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
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordDeletionError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting user",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error"
        )
