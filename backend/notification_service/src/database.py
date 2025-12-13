from datetime import timedelta

from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from shared.db import now_timestamp
from shared.exceptions.db import (
    EmptyRecordUpdateError,
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.simple_logging import logger

from src.models import Notification, NotificationCreate


class NotificationsDB:
    def __init__(self, container: ContainerProxy):
        self.container = container
        logger.debug("Created NotificationDB")

    async def create_notification(self, notification: NotificationCreate) -> str:
        try:
            logger.debug(f"Trying to create notification: {notification.model_dump()}")
            new_notif = notification.to_notification()
            item: CosmosDict = await self.container.create_item(
                body=new_notif.model_dump(mode="json")
            )
            logger.debug(f"Trying to validate created item returned from DB: {item}")
            created_notif = Notification.model_validate(item, extra="ignore")
            logger.debug(f"Successfully created post: {created_notif.model_dump()}")
            return created_notif.id
        except exceptions.CosmosResourceExistsError:
            logger.warning(
                f"Error while creating notification: {notification.model_dump()}, already exists"
            )
            raise RecordAlreadyExistsError()
        except Exception as e:
            logger.error(
                f"Error while creating notification: {notification.model_dump()}, unexpected: {e}"
            )
            raise RecordCreationError()

    async def get_notification(self, notification_id: str) -> Notification:
        try:
            logger.debug(f"Trying to get notification with ID '{notification_id}'")
            item: CosmosDict = await self.container.read_item(
                item=notification_id, partition_key=notification_id
            )
            logger.debug(f"Trying to validate returned notification data: {item}")
            notification = Notification.model_validate(item, extra="ignore")
            logger.debug(f"Successfully got notification: {notification.model_dump()}")
            return notification
        except exceptions.CosmosResourceNotFoundError:
            logger.warning(
                f"Error while getting notification with ID '{notification_id}', not found"
            )
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error while getting notification with ID '{notification_id}', unexpected: {e}"
            )
            raise GeneralQueryError()

    async def get_users_unread_notification_ids(
        self, user_id: str, max_items: int, continuation_token: str | None
    ) -> tuple[list[str], str | None]:
        query = """
            SELECT c.id, c.read FROM c
            WHERE c.recipient_user_id = @user_id AND NOT c.read
            ORDER BY c.created_at ASC
        """
        parameters = [{"name": "@user_id", "value": user_id}]

        try:
            logger.debug(
                f"Trying to get all notification IDs of user with ID '{user_id}' continuing from token: {continuation_token}"
            )
            result_iterable = self.container.query_items(
                query=query,
                parameters=parameters,
                max_item_count=max_items,
            )

            pager = result_iterable.by_page(continuation_token=continuation_token)
            items = None
            async for page in pager:
                items: list[str] = [item["id"] async for item in page]
                break

            new_cont: str | None = pager.continuation_token
            if items is None:
                raise RecordNotFoundError()
            logger.debug(
                f"Successfully got all notification IDs: {items}, and a new continuation token: {new_cont}"
            )
            return items, new_cont
        except RecordNotFoundError:
            raise
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error getting notification IDs of user with ID '{user_id}', unexpected: {e}"
            )
            raise GeneralQueryError()

    async def get_expired_notification_ids(self):
        query = """
            SELECT c.id, c.created_at FROM c
            WHERE c.created_at < @90days_ago
        """
        parameters = [
            {
                "name": "@90days_ago",
                "value": (now_timestamp() - timedelta(days=90)).isoformat(),
            }
        ]

        try:
            logger.debug("Trying to get all expired notificiation IDs")

            async for item in self.container.query_items(
                query=query, parameters=parameters
            ):
                yield item
            logger.debug("Successfully got expired notification IDs")
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(f"Error getting expired notification IDs, unexpected: {e}")
            raise GeneralQueryError()

    async def update_notification(self, notification_id: str):
        # only 'read' needs to be updated
        try:
            logger.debug(f"Trying to update notification with ID '{notification_id}'")
            patch_operations = [{"op": "replace", "path": "/read", "value": True}]
            patch_operations.append(
                {
                    "op": "replace",
                    "path": "/updated_at",
                    "value": now_timestamp().isoformat(),
                }
            )
            logger.debug(
                f"Trying to send update operations to DB for notification with ID '{notification_id}'"
            )
            item = await self.container.patch_item(
                item=notification_id,
                partition_key=notification_id,
                patch_operations=patch_operations,
            )
            logger.debug(
                f"Trying to validate updated notification returned from DB: {item}"
            )
            notification = Notification.model_validate(item, extra="ignore")
            logger.debug(
                f"Successfully updated notification '{notification_id}', new record: {notification.model_dump()}"
            )
        except exceptions.CosmosResourceNotFoundError:
            logger.warning(
                f"Error while updating notification with ID '{notification_id}', not found"
            )
            raise RecordNotFoundError()
        except EmptyRecordUpdateError:
            raise
        except Exception as e:
            logger.error(
                f"Error while updating notification with ID '{notification_id}', unexpected: {e}"
            )
            raise RecordUpdateError()

    async def delete_notification(self, notification_id: str):
        try:
            logger.debug(f"Trying to delete notification with ID '{notification_id}'")
            await self.container.delete_item(
                item=notification_id, partition_key=notification_id
            )
            logger.debug(
                f"Successfully deleted notification with ID '{notification_id}'"
            )
        except exceptions.CosmosResourceNotFoundError:
            logger.warning(
                f"Error while deleting notification '{notification_id}', not found"
            )
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error while deleting notification '{notification_id}', unexpected: {e}"
            )
            raise RecordDeletionError()
