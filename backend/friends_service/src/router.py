import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from shared.auth import get_current_user_auth
from shared.models.auth import UserAuthInfo
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)

from src.dependencies import get_friends_service
from src.models import (
    FriendRequestCreate,
    FriendRequest,
    Friendship,
    RelationshipStatus,
)
from src.service import FriendsService

logger = logging.getLogger("friends_service")

friends_router = APIRouter()

class FriendListResponse(BaseModel):
    friends: List[Friendship]
    continuationToken: Optional[str] = None


# Friend Requests


@friends_router.post(
    "/requests", status_code=status.HTTP_201_CREATED, tags=["friend_requests"], response_model=FriendRequest
)
async def send_request(
    req: FriendRequestCreate,
    me: UserAuthInfo = Depends(get_current_user_auth),
    service: FriendsService = Depends(get_friends_service),
):
    if me.id == req.to_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot send a friend request to yourself",
        )

    try:
        fr = await service.send_request(me, req)
        return fr
    except AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except  RecordAlreadyExistsError as e:
        # Duplicate pending or "already friends" case
        detail = str(e) or "There is already a friend request for this person"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )
    except RecordCreationError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating friend request",
        )
    except GeneralQueryError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e) or "Error sending friend request",
        )


@friends_router.get(
    "/requests/incoming",
    tags=["friend_requests"],
    response_model=List[FriendRequest],
)
async def list_incoming(
    status_param: Optional[str] = Query(default="pending"),
    me: UserAuthInfo = Depends(get_current_user_auth),
    service: FriendsService = Depends(get_friends_service),
):
    try:
        data = await service.list_incoming(me, status_param)
        return data
    except AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing incoming friend requests",
        )


@friends_router.get(
    "/requests/outgoing",
    tags=["friend_requests"],
    response_model=List[FriendRequest],
)
async def list_outgoing(
    status_param: Optional[str] = Query(default="pending"),
    me: UserAuthInfo = Depends(get_current_user_auth),
    service: FriendsService = Depends(get_friends_service),
):
    try:
        data = await service.list_outgoing(me, status_param)
        return data
    except AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing outgoing friend requests",
        )


@friends_router.post(
    "/requests/{request_id}/accept",
    status_code=status.HTTP_200_OK,
    tags=["friend_requests"],
    response_model=Friendship,
)
async def accept_request(
    request_id: str,
    me: UserAuthInfo = Depends(get_current_user_auth),
    service: FriendsService = Depends(get_friends_service),
) -> Friendship:
    try:
        fs = await service.accept(me, request_id)
        return fs
    except AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordUpdateError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error accepting friend request",
        )
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error accepting friend request",
        )


@friends_router.post(
    "/requests/{request_id}/decline",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["friend_requests"],
)
async def decline_request(
    request_id: str,
    me: UserAuthInfo = Depends(get_current_user_auth),
    service: FriendsService = Depends(get_friends_service),
):
    try:
        await service.decline(me, request_id)
    except AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordUpdateError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error declining friend request",
        )
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error declining friend request",
        )


@friends_router.post(
    "/requests/{request_id}/cancel",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["friend_requests"],
)
async def cancel_request(
    request_id: str,
    me: UserAuthInfo = Depends(get_current_user_auth),
    service: FriendsService = Depends(get_friends_service),
):
    try:
        await service.cancel(me, request_id)
    except AuthError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordUpdateError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error cancelling friend request",
        )
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error cancelling friend request",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error cancelling friend request",
        )


# Friendships

@friends_router.get(
    "/me",
    tags=["friendships"],
    response_model=FriendListResponse,
)
async def list_friends(
    limit: int = Query(default=10, ge=1, le=200),
    continuation: Optional[str] = Query(default=None),
    me: UserAuthInfo = Depends(get_current_user_auth),
    service: FriendsService = Depends(get_friends_service),
):
    try:
        items, cont = await service.list_friends(me, limit, continuation)
        return FriendListResponse(friends=items, continuationToken=cont)
    except AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing friends",
        )


@friends_router.delete(
    "/{friend_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["friendships"],
)
async def unfriend(
    friend_id: str,
    me: UserAuthInfo = Depends(get_current_user_auth),
    service: FriendsService = Depends(get_friends_service),
):
    try:
        await service.unfriend(me, friend_id)
    except AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordDeletionError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting friendship",
        )
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting friendship",
        )


@friends_router.get(
    "/status",
    tags=["friendships"],
    response_model=RelationshipStatus,
)
async def relationship_status(
    user_id: str,
    me: UserAuthInfo = Depends(get_current_user_auth),
    service: FriendsService = Depends(get_friends_service),
):
    try:
        status_obj = await service.status(me, user_id)
        return status_obj
    except AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting relationship status",
        )
