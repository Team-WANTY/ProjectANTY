from datetime import datetime
from enum import StrEnum, auto

from pydantic import BaseModel
from shared.db import generate_id, now_timestamp


class FriendshipStatus(StrEnum):
    PENDING = auto()
    ACCEPTED = auto()


class Friendship(BaseModel):
    id: str = generate_id()
    from_user_id: str
    to_user_id: str
    status: FriendshipStatus = FriendshipStatus.PENDING
    created_at: datetime = now_timestamp()
    updated_at: datetime = now_timestamp()


class FriendListResponse(BaseModel):
    friends: list[Friendship]
    continuationToken: str | None = None
