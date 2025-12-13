from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from shared.auth import get_current_user
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.users import UserInDB
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.dependencies import get_service
from src.models import Notification, NotificationCreate
from src.service import NotificationsService

interservice_scheme = APIKeyHeader(name="X-Interservice-Key")
notifications_router = APIRouter()

# TODO schedule a daily check for expired notifications, if any delete them


@notifications_router.post(
    "/", status_code=status.HTTP_201_CREATED, response_model=str, tags=["interservice"]
)
async def create_notification(
    new_notification: NotificationCreate,
    service: NotificationsService = Depends(get_service),
    x_interservice_key: str = Depends(interservice_scheme),
):
    try:
        if x_interservice_key != shared_settings.INTERSERVICE_KEY:
            raise AuthError
        return await service.create_notification(new_notification)
    except AuthError:
        logger.warning(
            f"Error creating notification: {new_notification.model_dump()}: authorization error"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordAlreadyExistsError:
        logger.error(
            f"Error creating notification: {new_notification.model_dump()}: already exists"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Exists already"
        )
    except RecordCreationError:
        logger.error(
            f"Error creating notification: {new_notification.model_dump()}: creation error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(
            f"Error creating notification: {new_notification.model_dump()}, unexpected: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@notifications_router.get(
    "/{post_id}", response_model=Notification, tags=["notifications"]
)
async def get_notification_by_id(
    notification_id: str,
    service: NotificationsService = Depends(get_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        return await service.get_notification(notification_id, current_user)
    except AuthError:
        logger.warning(
            f"Error getting notification with ID '{notification_id}': authorization error"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(
            f"Error getting notification with ID '{notification_id}': not found"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(
            f"Error getting notification with ID '{notification_id}': query error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(
            f"Error getting notification with ID '{notification_id}', unexpected: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@notifications_router.get(
    "/user/{user_id}",
    response_model=tuple[list[str], str | None],
    tags=["notifications"],
)
async def get_users_unread_notification_ids(
    user_id: str,
    max_items: int,
    continuation_token: str | None = None,
    service: NotificationsService = Depends(get_service),
    current_user: UserInDB = Depends(get_current_user),
) -> tuple[list[str], str | None]:
    try:
        return await service.get_users_unread_notification_ids(
            user_id, current_user, max_items, continuation_token
        )
    except AuthError:
        logger.warning(
            f"Error getting post of user with ID '{user_id}': authorization error"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(f"Error getting post of user with ID '{user_id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(f"Error getting post of user with ID '{user_id}': query error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(f"Error getting post of user with ID '{user_id}', unexpected: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@notifications_router.patch("/{notification_id}", tags=["posts"])
async def read_notification(
    notification_id: str,
    service: NotificationsService = Depends(get_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        await service.update_notification(notification_id, current_user)
    except AuthError:
        logger.error(
            f"Error updating notification with ID '{notification_id}': not authorized"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(
            f"Error updating notification with ID '{notification_id}': not found"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordUpdateError:
        logger.error(
            f"Error updating notification with ID '{notification_id}': query error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(
            f"Error updating notification with ID '{notification_id}', unexpected: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
