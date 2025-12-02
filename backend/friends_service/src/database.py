from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from shared.db import now_timestamp
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
                from_user_id=user_id,
                to_user_id=friend_id,
                status=FriendshipStatus.PENDING,
            )

            item1: CosmosDict = await self.container.create_item(
                body=new_friendship.model_dump(mode="json")
            )

            friendship = Friendship.model_validate(item1, extra="ignore")
            logger.debug(
                f"Created friendship from owner '{friendship.from_user_id}' -> friend '{friendship.to_user_id}'",
            )
        except Exception:
            raise RecordCreationError()

    async def find_friendship(self, user_id: str, friend_id: str) -> Friendship:
        query = (
            "SELECT * FROM c "
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
                return Friendship.model_validate(item, extra="ignore")

            raise RecordNotFoundError()

        except RecordNotFoundError:
            raise
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception:
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
        except Exception:
            raise GeneralQueryError()

    async def list_friendships(
        self,
        user_id: str,
        max_items: int,
        continuation_token: str | None = None,
    ) -> tuple[list[Friendship], str | None]:
        # List friends for a given user_id with pagination.
        query = (
            "SELECT * FROM c "
            "WHERE c.from_user_id = @user OR c.to_user_id = @user"
            "ORDER BY c.created_at DESC"
        )
        params = [{"name": "@user", "value": user_id}]

        try:
            result_iterable = self.container.query_items(
                query=query,
                parameters=params,
                max_item_count=max_items,
            )

            items = None
            pager = result_iterable.by_page(continuation_token=continuation_token)
            async for page in pager:
                items: list[Friendship] = [
                    Friendship.model_validate(i, extra="ignore") async for i in page
                ]
                break

            # Continuation token for the next page (or None if no more)
            new_cont: str | None = pager.continuation_token
            if items is None:
                return [], None
            return items, new_cont
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except StopAsyncIteration:
            # No pages at all — just return empty with no continuation
            return [], None
        except Exception:
            raise GeneralQueryError()

    async def list_incoming(
        self,
        user_id: str,
        max_items: int,
        continuation_token: str | None = None,
    ) -> tuple[list[Friendship], str | None]:
        # List friends for a given user_id with pagination.
        query = (
            "SELECT * FROM c "
            "WHERE c.to_user_id = @user and c.status = @status"
            "ORDER BY c.created_at DESC"
        )
        params = [
            {"name": "@user", "value": user_id},
            {"name": "@status", "value": FriendshipStatus.PENDING},
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
                items: list[Friendship] = [
                    Friendship.model_validate(i, extra="ignore") async for i in page
                ]
                break

            # Continuation token for the next page (or None if no more)
            new_cont: str | None = pager.continuation_token
            if items is None:
                return [], None
            return items, new_cont
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except StopAsyncIteration:
            # No pages at all — just return empty with no continuation
            return [], None
        except Exception:
            raise GeneralQueryError()

    async def list_outgoing(
        self,
        user_id: str,
        max_items: int,
        continuation_token: str | None = None,
    ) -> tuple[list[Friendship], str | None]:
        # List friends for a given user_id with pagination.
        query = (
            "SELECT * FROM c "
            "WHERE c.from_user_id = @user and c.status = @status"
            "ORDER BY c.created_at DESC"
        )
        params = [
            {"name": "@user", "value": user_id},
            {"name": "@status", "value": FriendshipStatus.PENDING},
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
                items: list[Friendship] = [
                    Friendship.model_validate(i, extra="ignore") async for i in page
                ]
                break

            # Continuation token for the next page (or None if no more)
            new_cont: str | None = pager.continuation_token

            if items is None:
                return [], None
            return items, new_cont
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except StopAsyncIteration:
            # No pages at all — just return empty with no continuation
            return [], None
        except Exception:
            raise GeneralQueryError()

    async def update_status(self, friendship_id: str, new_status: FriendshipStatus):
        try:
            patch_ops = [
                {"op": "replace", "path": "/status", "value": new_status},
                {"op": "replace", "path": "/updated_at", "value": now_timestamp()},
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
        except Exception:
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
        except Exception:
            raise RecordDeletionError()
