from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import APIKeyHeader
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

from src.dependencies import get_profiles_service
from src.models import Profile, ProfileUpdate
from src.service import ProfileService

profiles_router = APIRouter()
interservice_scheme = APIKeyHeader(name="X-Interservice-Key")


@profiles_router.post(
    "/{user_id}",
    status_code=status.HTTP_201_CREATED,
    tags=["interservice"],
)
async def create_profile(
    user_id: str,
    profile_service: ProfileService = Depends(get_profiles_service),
    x_interservice_key: str = Depends(interservice_scheme),
):
    try:
        logger.debug("Starting profile creation, verifying interservice key")
        if x_interservice_key != shared_settings.INTERSERVICE_KEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid key"
            )
        await profile_service.create_profile(user_id)
    except HTTPException as e:
        raise e
    except RecordAlreadyExistsError:
        logger.error(
            f"Error creating profile for user with ID {user_id}: profile already exists for that user"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Profile exists for user"
        )
    except RecordCreationError:
        logger.error(
            f"Error creating profile for user with ID {user_id}: creation error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating profile",
        )
    except Exception as e:
        logger.error(
            f"Error creating profile for user with ID {user_id}, unexpected error: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating profile",
        )


@profiles_router.get("/{user_id}", response_model=Profile, tags=["profiles"])
async def get_profile(
    user_id: str, profile_service: ProfileService = Depends(get_profiles_service)
):
    try:
        profile = await profile_service.get_profile(user_id)
        logger.debug(f"Returning profile for user with ID {user_id}")
        return profile
    except RecordNotFoundError:
        logger.error(
            f"Error getting profile for user with ID {user_id}: no record found"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(f"Error getting profile for user with ID {user_id}: general query")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error querying profile",
        )
    except Exception as e:
        logger.error(
            f"Error getting profile for user with ID {user_id}, unexpected error: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting profile",
        )


@profiles_router.patch("/", tags=["profiles"])
async def update_profile(
    profile_update: ProfileUpdate,
    profile_service: ProfileService = Depends(get_profiles_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        logger.debug(
            f"User with ID '{current_user.id}' is trying to update profile: {profile_update.model_dump()}"
        )
        await profile_service.update_profile(profile_update, current_user)
    except AuthError:
        logger.warning(
            f"Error updating profile for user with ID {profile_update.user_id}: authorization error"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(
            f"Error updating profile for user with ID {profile_update.user_id}: record not found"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except EmptyRecordUpdateError:
        logger.warning(
            f"Error updating profile for user with ID {profile_update.user_id}: no valid update operations"
        )
        raise HTTPException(status_code=status.HTTP_204_NO_CONTENT)
    except RecordUpdateError:
        logger.error(
            f"Error updating profile for user with ID {profile_update.user_id}: update error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating profile",
        )
    except Exception as e:
        logger.error(
            f"Error updating profile for user with ID {profile_update.user_id}, unexpected error: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating profile",
        )


@profiles_router.delete(
    "/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["profiles"]
)
async def delete_profile(
    user_id: str,
    profile_service: ProfileService = Depends(get_profiles_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        await profile_service.delete_profile(user_id, current_user)
    except AuthError:
        logger.warning(
            f"Error deleting profile for user with ID {user_id}: authorization error"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(
            f"Error deleting profile for user with ID {user_id}: record not found"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordDeletionError:
        logger.error(
            f"Error deleting profile for user with ID {user_id}: deletion error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting profile",
        )
    except Exception as e:
        logger.error(
            f"Error deleting profile for user with ID {user_id}, unexpected: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting profile",
        )
