import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from shared.auth import get_current_user_auth
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.auth import UserAuthInfo
from shared.settings import settings

from src.dependencies import get_profiles_service
from src.models import Profile, ProfileUpdate
from src.service import ProfileService

logger = logging.getLogger("profiles_service")

profiles_router = APIRouter()
interservice_scheme = APIKeyHeader(name="X-Interservice-Key")

@profiles_router.post("/{user_id}", status_code=status.HTTP_201_CREATED, response_model=Profile, tags=["interservice"])
async def create_profile(
    user_id:str,
    profile_service: ProfileService = Depends(get_profiles_service),
    x_interservice_key: str = Depends(interservice_scheme)
):
    try:
        if x_interservice_key != settings.INTERSERVICE_KEY:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid key")
        created_profile = await profile_service.create_profile(user_id)
        return created_profile.model_dump()
    except HTTPException as e:
        raise e
    except RecordAlreadyExistsError:
        raise HTTPException(
            status_code = status.HTTP_403_FORBIDDEN, detail="Profile exists for user"
        )
    except RecordCreationError:
        raise HTTPException(
            status_code = status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error creating profile"
        )

@profiles_router.get("/{user_id}", response_model=Profile, tags=["profiles"])
async def get_profile(
    user_id:str,
    profile_service: ProfileService = Depends(get_profiles_service)
):
    try:
        profile = await profile_service.get_profile(user_id)
        return profile.model_dump()
    except RecordNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND
        )
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error querying profile"
        )

@profiles_router.patch("/{user_id}", response_model=Profile, tags=["profiles"])
async def update_profile(
    profile_update: ProfileUpdate,
    profile_service:ProfileService = Depends(get_profiles_service),
    current_user:UserAuthInfo=Depends(get_current_user_auth)
):
    try:
        profile = await profile_service.update_profile(profile_update, current_user)
        return profile
    except AuthError:
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED
        )
    except RecordNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND
        )
    except RecordUpdateError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error updating profile"
        )

@profiles_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["profiles"])
async def delete_profile(
    user_id:str,
    profile_service:ProfileService = Depends(get_profiles_service),
    current_user:UserAuthInfo=Depends(get_current_user_auth)
):
    try:
        await profile_service.delete_profile(user_id, current_user)
    except AuthError:
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED
        )
    except RecordNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND
        )
    except RecordDeletionError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error deleting profile"
        )
