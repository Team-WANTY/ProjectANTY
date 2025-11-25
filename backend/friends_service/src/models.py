from pydantic import BaseModel
from typing import Optional, Literal

FriendRequestStatus = Literal["pending", "accepted", "declined", "cancelled"]

class FriendRequestCreate(BaseModel):
    to_user_id: str

class FriendRequest(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str
    status: FriendRequestStatus
    created_at: int
    updated_at: int

class Friendship(BaseModel):
    id: str
    owner_id: str
    friend_id: str
    created_at: int

class RelationshipStatus(BaseModel):
    is_self: bool
    are_friends: bool
    incoming_request: Optional[FriendRequest] = None
    outgoing_request: Optional[FriendRequest] = None
