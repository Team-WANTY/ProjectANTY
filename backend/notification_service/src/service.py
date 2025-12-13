from datetime import datetime

from httpx import AsyncClient
from shared.auth import authorize_operation
from shared.models.users import UserInDB
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.database import NotificationsDB
from src.models import Notification, NotificationCreate


class NotificationsService:
    def __init__(self, posts_db: PostsDB):
        self.db = posts_db

    async def create_notification(self, new_notifications: NotificationCreate) -> str:
        logger.debug(f"Starting to create notification: {new_notifications.model_dump()}")
        return await self.db.create_notification(new_notifications)

    async def get_notification(self, notification_id: str) -> Notification:
        logger.debug(f"Starting to get notification with ID '{notification_id}'")
        return await self.db.get_notification(notification_id)

    async def get_users_unread_notification_ids(self, user_id: str, max_items: int, continuation_token: str | None) -> tuple[list[str], str | None]:
        logger.debug(f"Starting to get unread notification from user with ID '{user_id}'")
        return await self.db.get_users_unread_notification_ids(user_id, max_items, continuation_token)

    async def get_expired_notification_ids(self):
        logger.debug(f"Starting to get expired notifications")
        async for item in self.db.get_expired_notification_ids():
            yield item

    async def update_notification(self, notification_id: str):
        logger.debug(f"Starting to update notification with ID '{notification_id}'")
        await self.db.update_notification(notification_id)

    async def delete_notification(self, notification_id: str):
        logger.debug(f"Starting to delete notification with ID '{notification_id}'")
        await self.db.delete_notification(notification_id)
