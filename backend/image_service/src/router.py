import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.security import APIKeyHeader
from shared.auth import get_current_user_auth
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
)
from shared.models.auth import UserAuthInfo

from src.dependencies import get_image_service
from src.models import Image
from src.service import ImageService

logger = logging.getLogger("image_service")

images_router = APIRouter()
interservice_scheme = APIKeyHeader(name="X-Interservice-Key")

@images_router.post(
    "/avatar",
    response_model=Image,
    status_code=status.HTTP_201_CREATED,
    tags=["images"],
)
async def avatar_upload(
    user_id: str,
    file: UploadFile,
    image_service: ImageService = Depends(get_image_service),
    current_user: UserAuthInfo = Depends(get_current_user_auth)
) -> Image:
    AVATAR_CONTAINER = 'avatars'
    try:
        data = await file.read()
        created_image = await image_service.upload_img(AVATAR_CONTAINER, data, user_id, current_user)
        return created_image.model_dump()
    except HTTPException as e:
        raise e
    except RecordAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Image exists"
        )
    except RecordCreationError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating image",
        )

@images_router.get("/avatar", response_model=str, tags=["images"])
async def get_avatar(
    image_id: str, image_service: ImageService = Depends(get_image_service)
):
    try:
        image = await image_service.retrieve_img(image_id)
        return image.url
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error querying profile",
        )

@images_router.delete(
    "/avatar", status_code=status.HTTP_204_NO_CONTENT, tags=["images"]
)
async def delete_avatar(
    image_id: str,
    image_service: ImageService = Depends(get_image_service),
    current_user: UserAuthInfo = Depends(get_current_user_auth),
):
    try:
        await image_service.delete_img(image_id, current_user)
    except AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordDeletionError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting profile",
        )
