from datetime import datetime
from enum import StrEnum, auto

from pydantic import BaseModel


class FriendshipStatus(StrEnum):
    PENDING = auto()
    ACCEPTED = auto()


class Friendship(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str
    status: FriendshipStatus = FriendshipStatus.PENDING
    created_at: datetime
    updated_at: datetime


class FriendListResponse(BaseModel):
    friends: list[Friendship]
    continuationToken: str | None = None
