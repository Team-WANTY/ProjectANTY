from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from shared.auth import get_current_user
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    EmptyRecordUpdateError,
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.users import UserInDB
from shared.simple_logging import logger

from src.dependencies import get_posts_service
from src.models import Post, PostCreate, PostUpdate
from src.service import PostsService

posts_router = APIRouter()


@posts_router.post("/", status_code=status.HTTP_201_CREATED, tags=["posts"])
async def create_post(
    new_post: PostCreate,
    posts_service: PostsService = Depends(get_posts_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        await posts_service.create_post(new_post, current_user)
    except AuthError:
        logger.warning(
            f"Error creating post: {new_post.model_dump()}: authorization error"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordAlreadyExistsError:
        logger.error(f"Error creating post: {new_post.model_dump()}: already exists")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Exists already"
        )
    except RecordCreationError:
        logger.error(f"Error creating post: {new_post.model_dump()}: creation error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating post",
        )
    except Exception as e:
        logger.error(f"Error creating post: {new_post.model_dump()}, unexpected: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating post",
        )


@posts_router.get("/{post_id}", response_model=Post, tags=["posts"])
async def get_post_by_id(
    post_id: str, posts_service: PostsService = Depends(get_posts_service)
):
    try:
        return await posts_service.get_post(post_id)
    except RecordNotFoundError:
        logger.error(f"Error getting post with ID '{post_id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(f"Error getting post with ID '{post_id}': query error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(f"Error getting post with ID '{post_id}', unexpected: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@posts_router.get(
    "/user/{user_id}", response_model=tuple[list[str], str], tags=["posts"]
)
async def get_users_post_ids(
    user_id: str,
    max_items: int,
    continuation_token: str | None = None,
    posts_service: PostsService = Depends(get_posts_service),
):
    try:
        return await posts_service.get_users_post_ids(
            user_id, max_items, continuation_token
        )
    except RecordNotFoundError:
        logger.error(f"Error getting post of user with ID '{user_id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(f"Error getting post of user with ID '{user_id}': query error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(f"Error getting post of user with ID '{user_id}', unexpected: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@posts_router.get(
    "/relevant/{user_id}", response_model=tuple[list[str], str], tags=["posts"]
)
async def get_users_relevant_post_ids(
    user_id: str,
    max_items: int,
    timestamp: datetime | None = None,
    continuation_token: str | None = None,
    posts_service: PostsService = Depends(get_posts_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        if timestamp is None:
            return await posts_service.get_relevant_posts(
                user_id, current_user, max_items, continuation_token
            )
        else:
            return await posts_service.get_relevant_posts_after_timestamp(
                user_id, timestamp, current_user, max_items, continuation_token
            )
    except AuthError:
        logger.error(
            f"Error getting relevant posts of user with ID '{user_id}': not authorized"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except ValueError:
        logger.error(
            f"Error getting relevant posts of user with ID '{user_id}': friend query failed"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend query failed, no friends?",
        )
    except RecordNotFoundError:
        logger.error(
            f"Error getting relevant posts of user with ID '{user_id}': not found"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(
            f"Error getting relevant posts of user with ID '{user_id}': query error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(
            f"Error getting relevant posts of user with ID '{user_id}', unexpected: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@posts_router.patch("/", tags=["posts"])
async def update_post(
    post_update: PostUpdate,
    posts_service: PostsService = Depends(get_posts_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        await posts_service.update_post(post_update, current_user)
    except AuthError:
        logger.error(f"Error updating post with ID '{post_update.id}': not authorized")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except EmptyRecordUpdateError:
        logger.error(
            f"Error updating post with ID '{post_update.id}': no valid update operations"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No valid update operations"
        )
    except RecordNotFoundError:
        logger.error(f"Error updating post with ID '{post_update.id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordUpdateError:
        logger.error(f"Error updating post with ID '{post_update.id}': query error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(f"Error updating post with ID '{post_update.id}', unexpected: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@posts_router.delete("/{post_id}", tags=["posts"])
async def delete_post(
    post_id: str,
    posts_service: PostsService = Depends(get_posts_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        await posts_service.delete_post(post_id, current_user)
    except AuthError:
        logger.error(f"Error deleting post with ID '{post_id}': not authorized")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(f"Error deleting post with ID '{post_id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordDeletionError:
        logger.error(f"Error deleting post with ID '{post_id}': query error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(f"Error deleting post with ID '{post_id}', unexpected: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
