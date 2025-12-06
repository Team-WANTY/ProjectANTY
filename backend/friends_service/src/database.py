from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from shared.db import generate_id, now_timestamp
from shared.exceptions.db import (
    GeneralQueryError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.simple_logging import logger

from src.models import Friendship, FriendshipStatus


class FriendshipsDB:
    def __init__(self, container: ContainerProxy):
        self.container = container
        logger.debug("Created FriendshipsDB")

    async def request_friendship(self, user_id: str, friend_id: str):
        try:
            logger.debug(
                f"Creating friendship edges between '{user_id}' and '{friend_id}'",
            )

            new_friendship = Friendship(
                id=generate_id(),
                from_user_id=user_id,
                to_user_id=friend_id,
                created_at=now_timestamp(),
                updated_at=now_timestamp(),
            )

            item1: CosmosDict = await self.container.create_item(
                body=new_friendship.model_dump(mode="json")
            )

            created_friendship = Friendship.model_validate(item1, extra="ignore")
            logger.debug(
                f"Created friendship from owner '{created_friendship.from_user_id}' -> friend '{created_friendship.to_user_id}'",
            )
        except Exception as e:
            logger.error(
                f"Error creating friendship between '{user_id}' and '{friend_id}': {e}"
            )
            raise RecordCreationError()

    async def find_friendship(self, user_id: str, friend_id: str) -> str:
        query = (
            "SELECT c.id FROM c "
            "WHERE (c.from_user_id = @user AND c.to_user_id = @friend) OR (c.to_user_id = @user AND c.from_user_id = @friend)"
            "ORDER BY c.created_at DESC"
        )
        params = [
            {"name": "@user", "value": user_id},
            {"name": "@friend", "value": friend_id},
        ]
        try:
            async for item in self.container.query_items(
                query=query, parameters=params
            ):
                return item

            raise RecordNotFoundError()

        except RecordNotFoundError:
            raise
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error getting friendship between '{user_id}' and '{friend_id}': {e}"
            )
            raise GeneralQueryError()

    async def get_by_id(self, friendship_id: str) -> Friendship:
        try:
            logger.debug(f"Fetching friendship by id '{friendship_id}'")
            result = await self.container.read_item(
                item=friendship_id, partition_key=friendship_id
            )
            fs = Friendship.model_validate(result, extra="ignore")
            logger.debug(f"Fetched friendship: {fs.model_dump()}")
            return fs
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError
        except Exception as e:
            logger.error(f"Error getting friendship by ID '{friendship_id}': {e}")
            raise GeneralQueryError()

    async def list_friendships(
        self,
        user_id: str,
        max_items: int,
        continuation_token: str | None = None,
    ) -> tuple[list[str], str | None]:
        query = (
            "SELECT c.id FROM c "
            "WHERE (c.from_user_id = @user OR c.to_user_id = @user) AND c.status = @accepted "
            "ORDER BY c.created_at DESC"
        )
        params = [
            {"name": "@user", "value": user_id},
            {"name": "@accepted", "value": FriendshipStatus.ACCEPTED},
        ]

        try:
            result_iterable = self.container.query_items(
                query=query,
                parameters=params,
                max_item_count=max_items,
            )

            friendship_ids: list[str] | None = None

            pager = result_iterable.by_page(continuation_token=continuation_token)
            async for page in pager:
                friendship_ids = [id async for id in page]
                break  # first page only

            new_cont: str | None = pager.continuation_token

            if friendship_ids is None:
                # No pages at all: just "no friends yet"
                raise RecordNotFoundError()

            return friendship_ids, new_cont

        except RecordNotFoundError:
            raise
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except StopAsyncIteration:
            # No pages at all — just return empty with no continuation
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(f"Error listing friendships of user with ID '{user_id}': {e}")
            raise GeneralQueryError()

    async def list_all_friends(
        self,
        user_id: str,
    ):
        # List friends for a given user_id with pagination.
        query = (
            "SELECT c.from_user_id, c.to_user_id, c.created_at FROM c "
            "WHERE c.from_user_id = @user OR c.to_user_id = @user "
            "ORDER BY c.created_at DESC"
        )
        params = [{"name": "@user", "value": user_id}]

        try:
            result_iterable = self.container.query_items(
                query=query,
                parameters=params,
            )

            async for item in result_iterable:
                if item["from_user_id"] == user_id:
                    yield item["to_user_id"]
                else:
                    yield item["from_user_id"]

        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(f"Error listing friends of user with ID '{user_id}': {e}")
            raise GeneralQueryError()

    async def list_incoming(
        self,
        user_id: str,
        max_items: int,
        continuation_token: str | None = None,
    ) -> tuple[list[str], str | None]:
        # List friends for a given user_id with pagination.
        query = (
            "SELECT c.id FROM c "
            "WHERE c.to_user_id = @user and c.status = @status "
            "ORDER BY c.created_at DESC"
        )
        params = [
            {"name": "@user", "value": user_id},
            {"name": "@status", "value": str(FriendshipStatus.PENDING)},
        ]

        try:
            result_iterable = self.container.query_items(
                query=query,
                parameters=params,
                max_item_count=max_items,
            )
            items = None
            pager = result_iterable.by_page(continuation_token=continuation_token)
            async for page in pager:
                items = [item async for item in page]
                break

            # Continuation token for the next page (or None if no more)
            new_cont: str | None = pager.continuation_token
            if items is None:
                raise RecordNotFoundError
            return items, new_cont
        except RecordNotFoundError:
            raise
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except StopAsyncIteration:
            # No pages at all — just return empty with no continuation
            raise RecordNotFoundError
        except Exception as e:
            logger.error(
                f"Error listing incoming requests for user with ID '{user_id}': {e}"
            )
            raise GeneralQueryError()

    async def list_outgoing(
        self,
        user_id: str,
        max_items: int,
        continuation_token: str | None = None,
    ) -> tuple[list[str], str | None]:
        # List friends for a given user_id with pagination.
        query = (
            "SELECT c.id FROM c "
            "WHERE c.from_user_id = @user and c.status = @status "
            "ORDER BY c.created_at DESC"
        )
        params = [
            {"name": "@user", "value": user_id},
            {"name": "@status", "value": str(FriendshipStatus.PENDING)},
        ]

        try:
            result_iterable = self.container.query_items(
                query=query,
                parameters=params,
                max_item_count=max_items,
            )

            items = None
            pager = result_iterable.by_page(continuation_token=continuation_token)
            async for page in pager:
                items = [item async for item in page]
                break

            # Continuation token for the next page (or None if no more)
            new_cont: str | None = pager.continuation_token

            if items is None:
                raise RecordNotFoundError()
            return items, new_cont
        except RecordNotFoundError:
            raise
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except StopAsyncIteration:
            # No pages at all — just return empty with no continuation
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error listing outgoing requests for user with ID '{user_id}': {e}"
            )
            raise GeneralQueryError()

    async def update_status(self, friendship_id: str, new_status: FriendshipStatus):
        try:
            patch_ops = [
                {"op": "replace", "path": "/status", "value": new_status},
                {
                    "op": "replace",
                    "path": "/updated_at",
                    "value": now_timestamp().isoformat(),
                },
            ]

            logger.debug(
                f"Patching friendship with ID '{friendship_id}' status to '{new_status}'"
            )
            item: CosmosDict = await self.container.patch_item(
                item=friendship_id,
                partition_key=friendship_id,
                patch_operations=patch_ops,
            )
            updated = Friendship.model_validate(item, extra="ignore")
            logger.debug(
                f"Updated friendship with ID '{friendship_id}': {updated.model_dump()}",
            )
        except RecordNotFoundError:
            raise
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error updating status of friendship with ID '{friendship_id}': {e}"
            )
            raise RecordUpdateError()

    async def delete_friendship(self, friendship_id: str) -> None:
        try:
            await self.container.delete_item(
                item=friendship_id, partition_key=friendship_id
            )

        except RecordNotFoundError:
            raise
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(f"Error deleting friendship with ID '{friendship_id}': {e}")
            raise RecordDeletionError()
