from shared.simple_logging import logger
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from PIL import UnidentifiedImageError
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

images_router = APIRouter()


@images_router.post(
    "/{container_name}",
    response_model=Image,
    status_code=status.HTTP_201_CREATED,
    tags=["images"],
)
async def image_upload(
    user_id: str,
    file: UploadFile,
    container_name: str,
    image_service: ImageService = Depends(get_image_service),
    current_user: UserAuthInfo = Depends(get_current_user_auth),
) -> Image:
    try:
        data = await file.read()
        created_image = await image_service.upload_img(
            container_name, data, user_id, current_user
        )
        return created_image
    except HTTPException as e:
        raise e
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Data uploaded was not a valid image",
        )
    except RecordAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Image exists"
        )
    except RecordCreationError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating image",
        )


@images_router.get("/{image_id}", response_model=str, tags=["images"])
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
    "/{image_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["images"]
)
async def delete_image(
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
