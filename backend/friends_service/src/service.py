from shared.auth import authorize_operation
from shared.exceptions.db import RecordAlreadyExistsError, RecordNotFoundError
from shared.models.users import UserInDB

from src.database import FriendshipsDB
from src.models import FriendshipStatus


class FriendsService:
    def __init__(self, friendships_db: FriendshipsDB):
        self.db = friendships_db

    async def request_friendship(self, me: UserInDB, requestee_id: str):
        if me.id == requestee_id:
            raise RecordAlreadyExistsError()
        try:
            await self.db.find_friendship(me.id, requestee_id)
            raise RecordAlreadyExistsError()
        except RecordNotFoundError:
            pass
        await self.db.request_friendship(me.id, requestee_id)

    async def list_outgoing(
        self, me: UserInDB, limit: int, continuation: str | None
    ) -> tuple[list[str], str | None]:
        return await self.db.list_outgoing(
            user_id=me.id, max_items=limit, continuation_token=continuation
        )

    async def list_incoming(
        self, me: UserInDB, limit: int, continuation: str | None
    ) -> tuple[list[str], str]:
        return await self.db.list_incoming(
            user_id=me.id, max_items=limit, continuation_token=continuation
        )

    async def list_friendships(
        self, me: UserInDB, limit: int, continuation: str | None
    ) -> tuple[list[str], str | None]:
        return await self.db.list_friendships(
            user_id=me.id, max_items=limit, continuation_token=continuation
        )

    async def list_all_friends(self, user_id: str):
        return [friend_id async for friend_id in self.db.list_all_friends(user_id)]

    async def accept(self, me: UserInDB, friendship_id: str):
        # authorize updater can update friendship
        friendship = await self.db.get_by_id(friendship_id)
        if (
            friendship.status != FriendshipStatus.ACCEPTED
            and friendship.to_user_id == me.id
        ):
            await authorize_operation(me, friendship.to_user_id)
            # update friendship to accepted
            await self.db.update_status(friendship_id, FriendshipStatus.ACCEPTED)

    async def unfriend(self, me: UserInDB, friend_id: str):
        friendship_id = await self.db.find_friendship(me.id, friend_id)
        await self.db.delete_friendship(friendship_id)
