from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import APIKeyHeader
from shared.auth import get_current_user
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.users import UserInDB
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.dependencies import get_friends_service
from src.models import Friendship
from src.service import FriendsService

interservice_scheme = APIKeyHeader(name="X-Interservice-Key")
friends_router = APIRouter()


@friends_router.post(
    "/request/{to_user_id}",
    status_code=status.HTTP_201_CREATED,
    response_model=str,
    tags=["friend_requests"],
)
async def request_friendship(
    to_user_id: str,
    me: UserInDB = Depends(get_current_user),
    service: FriendsService = Depends(get_friends_service),
):
    try:
        logger.debug(
            f"Trying to create a pending relationship '{me.id}' <-> '{to_user_id}'"
        )
        return await service.request_friendship(me, to_user_id)
    except RecordAlreadyExistsError:
        logger.error(
            f"Error creating a pending relationship '{me.id}' <-> '{to_user_id}': friendship already exists"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Friendship already exists"
        )
    except RecordCreationError:
        logger.error(
            f"Error creating a pending relationship '{me.id}' <-> '{to_user_id}': creation error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(
            f"Error creating a pending relationship '{me.id}' <-> '{to_user_id}', unexpected: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@friends_router.get(
    "/incoming", tags=["friend_requests"], response_model=tuple[list[str], str | None]
)
async def list_incoming(
    limit: int = Query(default=10, ge=1, le=200),
    continuation: str | None = None,
    me: UserInDB = Depends(get_current_user),
    service: FriendsService = Depends(get_friends_service),
) -> tuple[list[str], str | None]:
    try:
        logger.debug(
            f"Trying to get incoming friend requests for user with ID '{me.id}'"
        )
        return await service.list_incoming(me, limit, continuation)
    except RecordNotFoundError:
        logger.error(
            f"Error getting incoming friend requests for user with ID '{me.id}': no requests found"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(
            f"Error getting incoming friend requests for user with ID '{me.id}': general query error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(
            f"Error getting incoming friend requests for user with ID '{me.id}', unexpected: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@friends_router.get(
    "/outgoing", tags=["friend_requests"], response_model=tuple[list[str], str | None]
)
async def list_outgoing(
    limit: int = Query(default=10, ge=1, le=200),
    continuation: str | None = None,
    me: UserInDB = Depends(get_current_user),
    service: FriendsService = Depends(get_friends_service),
) -> tuple[list[str], str | None]:
    try:
        logger.debug(
            f"Trying to get outgoing friend requests for user with ID '{me.id}'"
        )
        return await service.list_outgoing(me, limit, continuation)
    except RecordNotFoundError:
        logger.error(
            f"Error getting outgoing friend requests for user with ID '{me.id}': no requests found"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(
            f"Error getting outgoing friend requests for user with ID '{me.id}': general query error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(
            f"Error getting outgoing friend requests for user with ID '{me.id}', unexpected: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@friends_router.get(
    "/", tags=["friendships"], response_model=tuple[list[str], str | None]
)
async def list_friendships(
    limit: int = Query(default=10, ge=1, le=200),
    continuation: str | None = None,
    me: UserInDB = Depends(get_current_user),
    service: FriendsService = Depends(get_friends_service),
) -> tuple[list[str], str | None]:
    try:
        logger.debug(f"Trying to get all friendships for user with ID '{me.id}'")
        return await service.list_friendships(me, limit, continuation)
    except RecordNotFoundError:
        logger.error(
            f"Error getting all friendships for user with ID '{me.id}': no friendships found"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(
            f"Error getting all friendships for user with ID '{me.id}': general query error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(
            f"Error getting all friendships for user with ID '{me.id}', unexpected: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@friends_router.get(
    "/id/{friendship_id}", tags=["friendships"], response_model=Friendship
)
async def get_by_id(
    friendship_id: str,
    current_user: UserInDB = Depends(get_current_user),
    service: FriendsService = Depends(get_friends_service),
):
    try:
        return await service.get_by_id(friendship_id, current_user)
    except AuthError:
        logger.warning(
            f"Error getting friendship with ID '{friendship_id}': not authorized"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(f"Error getting friendship with ID '{friendship_id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(
            f"Error getting friendship with ID '{friendship_id}': general query error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Query error"
        )
    except Exception as e:
        logger.error(
            f"Error getting friendship with ID '{friendship_id}', unexpected: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error"
        )


@friends_router.get("/search/{friend_id}", tags=["friendships"], response_model=str)
async def find_friendship(
    friend_id: str,
    current_user: UserInDB = Depends(get_current_user),
    service: FriendsService = Depends(get_friends_service),
):
    try:
        return await service.find_friendship(friend_id, current_user)
    except RecordNotFoundError:
        logger.error(
            f"Error finding friendship between '{current_user.id}' and '{friend_id}': not found"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(
            f"Error finding friendship between '{current_user.id}' and '{friend_id}': general query error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Query error"
        )
    except Exception as e:
        logger.error(
            f"Error finding friendship between '{current_user.id}' and '{friend_id}', unexpected: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unexpected error"
        )


@friends_router.get("/{user_id}", tags=["interservice"], response_model=list[str])
async def list_all_friends(
    user_id: str,
    x_interservice_key: str = Depends(interservice_scheme),
    service: FriendsService = Depends(get_friends_service),
) -> list[str]:
    try:
        logger.debug(f"Trying to get all friends for user with ID '{user_id}'")
        logger.debug("Checking if interservice key is valid")
        if x_interservice_key != shared_settings.INTERSERVICE_KEY:
            logger.warning(f"Interservice key '{x_interservice_key}' was not valid")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid key"
            )
        return await service.list_all_friends(user_id)
    except RecordNotFoundError:
        logger.error(
            f"Error getting all friends for user with ID '{user_id}': no friends found"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(
            f"Error getting all friends for user with ID '{user_id}': general query error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(
            f"Error getting all friends for user with ID '{user_id}', unexpected: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@friends_router.post(
    "/request/{request_id}/accept",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["friend_requests"],
)
async def accept_request(
    request_id: str,
    me: UserInDB = Depends(get_current_user),
    service: FriendsService = Depends(get_friends_service),
):
    try:
        logger.debug(f"Trying to accept friend request with ID '{request_id}'")
        await service.accept(me, request_id)
    except AuthError:
        logger.warning(
            f"Error trying to accept friend request with ID '{request_id}': not authorized"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(
            f"Error trying to accept friend request with ID '{request_id}': friendship not found"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Friendship not found"
        )
    except RecordUpdateError:
        logger.error(
            f"Error trying to accept friend request with ID '{request_id}': update error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(
            f"Error trying to accept friend request with ID '{request_id}', unexpected: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@friends_router.post(
    "/request/{request_id}/decline",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["friend_requests"],
)
async def decline_request(
    request_id: str,
    me: UserInDB = Depends(get_current_user),
    service: FriendsService = Depends(get_friends_service),
):
    try:
        logger.debug(f"Trying to decline friend request with ID '{request_id}'")
        await service.decline(me, request_id)
    except AuthError:
        logger.warning(
            f"Error decline friendship with ID '{request_id}': not authorized"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(
            f"Error decline friendship with ID '{request_id}': friendship not found"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Friendship not found"
        )
    except RecordDeletionError:
        logger.error(f"Errot decline friendship with ID '{request_id}': deletion error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(
            f"Errot decline friendship with ID '{request_id}', unexpected: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@friends_router.post(
    "/request/{request_id}/cancel",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["friend_requests"],
)
async def cancel_request(
    request_id: str,
    me: UserInDB = Depends(get_current_user),
    service: FriendsService = Depends(get_friends_service),
):
    try:
        logger.debug(f"Trying to cancel friend request with ID '{request_id}'")
        await service.cancel(me, request_id)
    except AuthError:
        logger.warning(
            f"Error cancel friendship with ID '{request_id}': not authorized"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(
            f"Error cancel friendship with ID '{request_id}': friendship not found"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Friendship not found"
        )
    except RecordDeletionError:
        logger.error(f"Errot cancel friendship with ID '{request_id}': deletion error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(f"Errot cancel friendship with ID '{request_id}', unexpected: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@friends_router.delete(
    "/{friend_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["friendships"]
)
async def unfriend(
    friend_id: str,
    me: UserInDB = Depends(get_current_user),
    service: FriendsService = Depends(get_friends_service),
):
    try:
        logger.debug(f"Trying to delete friendship '{me.id}' <-> '{friend_id}'")
        await service.unfriend(me, friend_id)
    except AuthError:
        logger.warning(
            f"Error deleting friendship '{me.id}' <-> '{friend_id}': not authorized"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(
            f"Error deleting friendship '{me.id}' <-> '{friend_id}': friendship not found"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Friendship not found"
        )
    except RecordDeletionError:
        logger.error(
            f"Errot deleting friendship '{me.id}' <-> '{friend_id}': deletion error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(
            f"Errot deleting friendship '{me.id}' <-> '{friend_id}', unexpected: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
