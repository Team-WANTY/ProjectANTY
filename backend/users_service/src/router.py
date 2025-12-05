from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import (
    APIKeyHeader,
)
from pydantic import EmailStr
from shared.auth import get_current_user
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    EmptyRecordUpdateError,
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.users import UserInDB
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.dependencies import get_users_service
from src.models import UserCreate, UserUpdate
from src.service import UsersService

interservice_scheme = APIKeyHeader(name="X-Interservice-Key")

users_router = APIRouter()


@users_router.get("/me", response_model=UserInDB, tags=["users"])
async def read_users_me(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Get current user"""
    return current_user


@users_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    tags=["users"],
)
async def create_user(
    user_create: UserCreate,
    users_service: UsersService = Depends(get_users_service),
):
    try:
        logger.debug("Trying to register/create user")
        await users_service.create_user(user_create)
    except RecordAlreadyExistsError:
        logger.error(
            f"Error creating user ({user_create.model_dump()}): user already exists"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists"
        )
    except RecordCreationError:
        logger.error(
            f"Error creating user ({user_create.model_dump()}): general creation error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user",
        )
    except Exception as e:
        logger.error(
            f"Error creating user ({user_create.model_dump()}), unexpected error: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user",
        )


@users_router.get("/id/{user_id}", response_model=UserInDB, tags=["interservice"])
async def get_user(
    user_id: str,
    users_service: UsersService = Depends(get_users_service),
    x_interservice_key=Depends(interservice_scheme),
) -> UserInDB:
    if x_interservice_key != shared_settings.INTERSERVICE_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    try:
        return await users_service.get_user_by_id(user_id)
    except AuthError:
        logger.warning(
            f"Error trying to get user with ID '{user_id}': authorization error"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(f"Error getting user with ID '{user_id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(f"Error getting user with ID '{user_id}': query error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal query error",
        )
    except Exception as e:
        logger.error(f"Error getting user with ID '{user_id}', unexpected: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error"
        )

@users_router.get(
    "/username/{username}", response_model=UserInDB, tags=["interservice"]
)
async def get_user_by_username(
    username: str,
    users_service: UsersService = Depends(get_users_service),
    x_interservice_key=Depends(interservice_scheme),
) -> UserInDB:
    if x_interservice_key != shared_settings.INTERSERVICE_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    try:
        return await users_service.get_user_by_username(username)
    except AuthError:
        logger.warning(
            f"Error trying to get user with username '{username}': authorization error"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(f"Error getting user with username '{username}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(f"Error getting user with username '{username}': query error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal query error",
        )
    except Exception as e:
        logger.error(f"Error getting user with username '{username}', unexpected: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error"
        )


@users_router.get("/email/{email}", response_model=UserInDB, tags=["interservice"])
async def get_user_by_email(
    email: EmailStr,
    users_service: UsersService = Depends(get_users_service),
    x_interservice_key=Depends(interservice_scheme),
) -> UserInDB:
    if x_interservice_key != shared_settings.INTERSERVICE_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    try:
        return await users_service.get_user_by_email(email)
    except AuthError:
        logger.warning(
            f"Error trying to get user with email '{email}': authorization error"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(f"Error getting user with email '{email}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(f"Error getting user with email '{email}': query error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal query error",
        )
    except Exception as e:
        logger.error(f"Error getting user with email '{email}', unexpected: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error"
        )


@users_router.patch("/", status_code=status.HTTP_204_NO_CONTENT, tags=["users"])
async def update_user(
    user_update: UserUpdate,
    current_user: UserInDB = Depends(get_current_user),
    users_service: UsersService = Depends(get_users_service),
):
    """Update user (own profile or superuser can update any)"""
    try:
        await users_service.update_user(
            user_update, current_user
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
    current_user: UserInDB = Depends(get_current_user),
    users_service: UsersService = Depends(get_users_service),
):
    """Delete user"""
    try:
        await users_service.delete_user(
            user_id, current_user
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
