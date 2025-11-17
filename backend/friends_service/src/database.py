import logging
from typing import List, Optional, Tuple

from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy

from shared.db import generate_id, now_timestamp
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
    
)

from src.models import (
    FriendRequest,
    Friendship,
    FriendRequestStatus,
    FriendRequestCreate,
    RelationshipStatus
)

logger = logging.getLogger("friends_service")


# Friend Requests DB  (PK: /to_user_id)

class FriendRequestsDB:
    def __init__(self, container: ContainerProxy):
        self.container = container

    async def create(self, from_user_id: str, data: FriendRequestCreate,
    ) -> FriendRequest:

        existing_req = await self.get_pending_between(from_user_id, data.to_user_id)
        if existing_req is not None:
            logger.warning("Duplicate pending friend request")
            raise RecordAlreadyExistsError("Pending friend request already exist")
        reverse_req = await self.get_pending_between(data.to_user_id, from_user_id)
        if reverse_req is not None:
            logger.warning("The person you're trying to send a friend request already sent you one.")
            raise RecordAlreadyExistsError(f"User already sent you a friend request")
        
        """
        Create a new friend request.
        Partition key: to_user_id
        """
        now = now_timestamp()
        doc = {
            "id": generate_id(),
            "from_user_id": from_user_id,
            "to_user_id": data.to_user_id,
            "status": "pending",
            "message": data.message,
            "created_at": now,
            "updated_at": now,
        }



        try:
            item: CosmosDict = await self.container.create_item(body=doc)
            return FriendRequest.model_validate(item, extra="ignore")
        except RecordAlreadyExistsError:
            # Bubble up for router to turn into 403
            raise
        except exceptions.ResourceExistsError:
            raise RecordAlreadyExistsError()
        except Exception as e:
            raise RecordCreationError()

    async def get_by_id(self, request_id: str) -> FriendRequest:
        # Get a friend request by ID
        query = "SELECT * FROM c WHERE c.id = @id"
        params = [{"name": "@id", "value": request_id}]
        try:
            logger.debug("Fetching friend request by id '%s'", request_id)
            result: Optional[dict] = None
            async for item in self.container.query_items(query=query, parameters=params):
                result = item
                break

            if result is None:
                logger.warning("Friend request '%s' not found", request_id)
                raise RecordNotFoundError()

            fr = FriendRequest.model_validate(result, extra="ignore")
            logger.debug("Fetched friend request '%s'", request_id)
            return fr
        except RecordNotFoundError:
            raise
        except Exception as e:
            raise GeneralQueryError()
        
    async def get_pending_between(self, from_user_id: str, to_user_id: str) -> FriendRequest | None:
        # Return a pending friend request from from_user_id -> to_user_id if it exists
        query = """
                SELECT * FROM c
                WHERE c.from_user_id = @from
                    AND c.to_user_id = @to
                    AND c.status = 'pending'
                """
        params = [
            {"name": "@from", "value": from_user_id},
            {"name": "@to", "value": to_user_id},
        ]

        async for item in self.container.query_items(
            query=query,
            parameters=params,
            partition_key=to_user_id,
        ):
            return FriendRequest.model_validate(item, extra="ignore")
        return None
    
    async def list_incoming(self, to_user_id: str, status: FriendRequestStatus | None = "pending",
    ) -> List[FriendRequest]:
        # List incoming friend requests for a the user
        query = "SELECT * FROM c WHERE c.to_user_id = @to"
        params = [{"name": "@to", "value": to_user_id}]
        if status:
            query += " AND c.status = @status"
            params.append({"name": "@status", "value": status})

        try:
            results: List[FriendRequest] = []
            async for item in self.container.query_items(
                query=query, parameters=params, partition_key=to_user_id
            ):
                results.append(FriendRequest.model_validate(item, extra="ignore"))
            return results
        except Exception as e:
            raise GeneralQueryError()

    async def list_outgoing(self, to_user_id: str, status: FriendRequestStatus | None = "pending",
    ) -> List[FriendRequest]:
        # List outgoing friend requests for the user.
        user_id = to_user_id  # naming quirk kept for service compatibility
        query = "SELECT * FROM c WHERE c.from_user_id = @from"
        params = [{"name": "@from", "value": user_id}]
        if status:
            query += " AND c.status = @status"
            params.append({"name": "@status", "value": status})

        try:
            results: List[FriendRequest] = []
            async for item in self.container.query_items(
                query=query,
                parameters=params,
            ):
                results.append(FriendRequest.model_validate(item, extra="ignore"))
            return results
        except Exception as e:
            raise GeneralQueryError()

    async def _update_status(self, request_id: str, new_status: FriendRequestStatus,
    ) -> FriendRequest:
        # Internal helper: set status + updated_at. Only transitions from pending.
        try:
            fr = await self.get_by_id(request_id)

            if fr.status != "pending":
                logger.debug(
                    "Friend request '%s' is already in status '%s'; no update",
                    request_id,
                    fr.status,
                )
                return fr

            patch_ops = [
                {"op": "replace", "path": "/status", "value": new_status},
                {"op": "replace", "path": "/updated_at", "value": now_timestamp()},
            ]

            logger.debug(
                "Patching friend request '%s' status to '%s'", request_id, new_status
            )
            item: CosmosDict = await self.container.patch_item(
                item=fr.id,
                partition_key=fr.to_user_id,
                patch_operations=patch_ops,
            )
            updated = FriendRequest.model_validate(item, extra="ignore")
            logger.debug(
                "Updated friend request '%s' to status '%s'",
                request_id,
                new_status,
            )
            return updated
        except RecordNotFoundError:
            raise
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception as e:
            raise RecordUpdateError()

    async def set_status_accepted(self, request_id: str) -> FriendRequest:

        return await self._update_status(request_id, "accepted")

    async def set_status_declined(self, request_id: str) -> FriendRequest:
        return await self._update_status(request_id, "declined")

    async def set_status_canceled(self, request_id: str) -> FriendRequest:
        return await self._update_status(request_id, "cancelled")


# Friendships DB  (PK: /owner_id)


class FriendshipsDB:
    def __init__(self, container: ContainerProxy):
        self.container = container

    async def create_friendship(self, user_id: str, friend_id: str) -> Friendship:
        """
        Create a bidirectional friendship:
        - one edge for owner_id=user_id
        - one edge for owner_id=friend_id
        """
        now = now_timestamp()
        doc1 = {
            "id": generate_id(),
            "owner_id": user_id,
            "friend_id": friend_id,
            "created_at": now,
        }
        doc2 = {
            "id": generate_id(),
            "owner_id": friend_id,
            "friend_id": user_id,
            "created_at": now,
        }

        try:
            logger.debug(
                "Creating friendship edges between '%s' and '%s'",
                user_id,
                friend_id,
            )

            item1: CosmosDict = await self.container.upsert_item(body=doc1)
            # Mirror edge
            await self.container.upsert_item(body=doc2)

            friendship = Friendship.model_validate(item1, extra="ignore")
            logger.debug(
                "Created friendship edge '%s' owner '%s' -> friend '%s'",
                friendship.id,
                friendship.owner_id,
                friendship.friend_id,
            )
            return friendship
        except Exception as e:
            raise RecordCreationError()

    async def _get_edge(
        self,
        owner_id: str,
        friend_id: str,
    ) -> Optional[Friendship]:
        # Helper: get a single edge (if any) for owner_id -> friend_id.
        query = "SELECT * FROM c WHERE c.owner_id = @owner AND c.friend_id = @friend"
        params = [
            {"name": "@owner", "value": owner_id},
            {"name": "@friend", "value": friend_id},
        ]
        try:
            async for item in self.container.query_items(
                query=query,
                parameters=params,
                partition_key=owner_id,
            ):
                return Friendship.model_validate(item, extra="ignore")
            return None
        except Exception as e:
            raise GeneralQueryError()

    async def list_friends(
        self,
        owner_id: str,
        max_items: int = 50,
        continuation_token: Optional[str] = None,
    ) -> Tuple[List[Friendship], Optional[str]]:
        # List friends for a given owner_id with pagination.
        query = (
            "SELECT * FROM c "
            "WHERE c.owner_id = @owner "
            "ORDER BY c.created_at DESC"
        )
        params = [{"name": "@owner", "value": owner_id}]

        try:
            result_iterable = self.container.query_items(
                query=query,
                parameters=params,
                partition_key=owner_id,
                max_item_count=max_items,
            )

            pager = result_iterable.by_page(continuation_token=continuation_token)
            page = await pager.__anext__()  # first page of results

            items: List[Friendship] = [
                Friendship.model_validate(i, extra="ignore")
                async for i in page
            ]

            # Continuation token for the next page (or None if no more)
            new_cont: Optional[str] = pager.continuation_token

            return items, new_cont
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except StopAsyncIteration:
            # No pages at all — just return empty with no continuation
            return [], None
        except Exception as e:
            raise GeneralQueryError()

    async def delete_friendship(self, user_id: str, friend_id: str) -> None:
        """
        Delete friendship in both directions:
        - owner_id=user_id, friend_id=friend_id
        - owner_id=friend_id, friend_id=user_id
        """
        try:
            found_any = False

            # user_id -> friend_id
            query1 = (
                "SELECT * FROM c WHERE c.owner_id = @owner AND c.friend_id = @friend"
            )
            params1 = [
                {"name": "@owner", "value": user_id},
                {"name": "@friend", "value": friend_id},
            ]
            async for item in self.container.query_items(
                query=query1,
                parameters=params1,
                partition_key=user_id,
            ):
                edge = Friendship.model_validate(item, extra="ignore")
                await self.container.delete_item(
                    item=edge.id, partition_key=user_id
                )
                found_any = True

            # friend_id -> user_id
            query2 = (
                "SELECT * FROM c WHERE c.owner_id = @owner AND c.friend_id = @friend"
            )
            params2 = [
                {"name": "@owner", "value": friend_id},
                {"name": "@friend", "value": user_id},
            ]
            async for item in self.container.query_items(
                query=query2,
                parameters=params2,
                partition_key=friend_id,
            ):
                edge = Friendship.model_validate(item, extra="ignore")
                await self.container.delete_item(
                    item=edge.id, partition_key=friend_id
                )
                found_any = True

            if not found_any:
                raise RecordNotFoundError()

        except RecordNotFoundError:
            raise
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception as e:
            raise RecordDeletionError()

    async def get_relationship_status(
        self,
        user_id: str,
        other_user_id: str,
    ) -> RelationshipStatus:
        # Compute basic relationship status between user and other_user_id

        if user_id == other_user_id:
            return RelationshipStatus(
                is_self=True,
                are_friends=False,
                incoming_request=None,
                outgoing_request=None,
            )

        try:
            are_friends = False

            # Check edge user_id -> other_user_id
            edge1 = await self._get_edge(user_id, other_user_id)
            if edge1 is not None:
                are_friends = True
            else:
                # Fallback: in case only the reverse edge exists
                edge2 = await self._get_edge(other_user_id, user_id)
                if edge2 is not None:
                    are_friends = True

            status = RelationshipStatus(
                is_self=False,
                are_friends=are_friends,
                incoming_request=None,
                outgoing_request=None,
            )
            return status
        except GeneralQueryError:
            # Already logged by _get_edge
            raise
        except Exception as e:
            raise GeneralQueryError()
