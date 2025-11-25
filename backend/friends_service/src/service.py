import logging

from shared.auth import authorize_operation
from shared.models.auth import UserAuthInfo

from src.database import FriendRequestsDB, FriendshipsDB
from src.models import (FriendRequestCreate, FriendRequest, Friendship, RelationshipStatus)
from shared.exceptions.db import RecordAlreadyExistsError
logger = logging.getLogger("friends_service")


class FriendsService:
    def __init__(self, friend_requests_db: FriendRequestsDB, friendships_db: FriendshipsDB):
        self.friend_requests_db = friend_requests_db
        self.friendships_db = friendships_db

    # Friend Requests
    async def send_request(self, me: UserAuthInfo, req: FriendRequestCreate) -> FriendRequest:
        from_user_id = me.id
        to_user_id = req.to_user_id
        
        # Check to see if the other user already have a relationship with current user
        relationship = await self.friendships_db.get_relationship_status(from_user_id, to_user_id)
        if relationship.are_friends:
            raise RecordAlreadyExistsError("You are already friends with this user")
        
        return await self.friend_requests_db.create(from_user_id, data=req)

    async def list_incoming(self, me: UserAuthInfo, status_filter: str | None = "pending") -> list[FriendRequest]:
        user_id = me.id
        await authorize_operation(me, user_id)
        return await self.friend_requests_db.list_incoming(to_user_id=user_id, status=status_filter)

    async def list_outgoing(self, me: UserAuthInfo, status_filter: str | None = "pending") -> list[FriendRequest]:
        user_id = me.id
        await authorize_operation(me, user_id)
        return await self.friend_requests_db.list_outgoing(to_user_id=user_id, status=status_filter)

    async def accept(self, me: UserAuthInfo, request_id: str) -> Friendship:
        fr = await self.friend_requests_db.get_by_id(request_id)
        await authorize_operation(me, fr.to_user_id)
        await self.friend_requests_db.set_status_accepted(request_id)
        friendship = await self.friendships_db.create_friendship(
            user_id=fr.from_user_id,
            friend_id=fr.to_user_id,
        )
        return friendship

    async def decline(self, me: UserAuthInfo, request_id: str) -> None:
        fr = await self.friend_requests_db.get_by_id(request_id)
        await authorize_operation(me, fr.to_user_id)
        await self.friend_requests_db.set_status_declined(request_id)

    async def cancel(self, me: UserAuthInfo, request_id: str) -> None:
        fr = await self.friend_requests_db.get_by_id(request_id)
        await authorize_operation(me, fr.from_user_id)
        await self.friend_requests_db.set_status_canceled(request_id)

    # Friendships

    async def list_friends(self, me: UserAuthInfo, limit: int, continuation: str | None,
    ) -> tuple[list[Friendship], str | None]:
        # List friends for the current user with pagination.
        user_id = me.id
        await authorize_operation(me, user_id)
        return await self.friendships_db.list_friends(owner_id=user_id, max_items=limit, continuation_token=continuation)

    async def unfriend(self, me: UserAuthInfo, friend_id: str,) -> None:
        # Remove a friendship between the current user and friend_id.
        user_id = me.id
        await authorize_operation(me, user_id)
        await self.friendships_db.delete_friendship(user_id=user_id, friend_id=friend_id)

    async def status(self, me: UserAuthInfo, other_user_id: str) -> RelationshipStatus:
        # Get the relationship status between the current user and other_user_id.
        user_id = me.id
        await authorize_operation(me, user_id)
        return await self.friendships_db.get_relationship_status(user_id=user_id, other_user_id=other_user_id)
