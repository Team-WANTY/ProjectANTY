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

from src.dependencies import get_comments_service
from src.models import Comment, CommentCreate, CommentUpdate
from src.service import CommentsService

comments_router = APIRouter()


@comments_router.post(
    "/", status_code=status.HTTP_201_CREATED, response_model=str, tags=["comments"]
)
async def create_comment(
    new_comment: CommentCreate,
    comments_service: CommentsService = Depends(get_comments_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        return await comments_service.create_comment(new_comment, current_user)
    except AuthError:
        logger.warning(
            f"Error creating comment: {new_comment.model_dump()}: authorization error"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordAlreadyExistsError:
        logger.error(
            f"Error creating comment: {new_comment.model_dump()}: already exists"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Exists already"
        )
    except RecordCreationError:
        logger.error(
            f"Error creating comment: {new_comment.model_dump()}: creation error"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating comment",
        )
    except Exception as e:
        logger.error(
            f"Error creating comment: {new_comment.model_dump()}, unexpected: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating comment",
        )


@comments_router.get("/{comment_id}", response_model=Comment, tags=["comments"])
async def get_comment_by_id(
    comment_id: str, comments_service: CommentsService = Depends(get_comments_service)
):
    try:
        return await comments_service.get_comment(comment_id)
    except RecordNotFoundError:
        logger.error(f"Error getting comment with ID '{comment_id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(f"Error getting comment with ID '{comment_id}': query error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(f"Error getting comment with ID '{comment_id}', unexpected: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@comments_router.get(
    "/content/{content_id}",
    response_model=tuple[list[str], str | None],
    tags=["comments"],
)
async def get_comments_under_content_with_id(
    content_id: str,
    max_items: int,
    continuation_token: str | None = None,
    comments_service: CommentsService = Depends(get_comments_service),
) -> tuple[list[str], str | None]:
    try:
        return await comments_service.get_comments_under_content_with_id(
            content_id, max_items, continuation_token
        )
    except RecordNotFoundError:
        logger.error(
            f"Error getting comments under content with ID '{content_id}': not found"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except GeneralQueryError:
        logger.error(
            f"Error getting comments under content with ID '{content_id}': query error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(
            f"Error getting comments under content with ID '{content_id}', unexpected: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@comments_router.patch("/", tags=["comments"])
async def update_comment(
    comment_update: CommentUpdate,
    comments_service: CommentsService = Depends(get_comments_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        await comments_service.update_comment(comment_update, current_user)
    except AuthError:
        logger.error(
            f"Error updating comment with ID '{comment_update.id}': not authorized"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except EmptyRecordUpdateError:
        logger.error(
            f"Error updating comment with ID '{comment_update.id}': no valid update operations"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No valid update operations"
        )
    except RecordNotFoundError:
        logger.error(f"Error updating comment with ID '{comment_update.id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordUpdateError:
        logger.error(
            f"Error updating comment with ID '{comment_update.id}': query error"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(
            f"Error updating comment with ID '{comment_update.id}', unexpected: {e}"
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@comments_router.delete("/{comment_id}", tags=["comments"])
async def delete_comment(
    comment_id: str,
    comments_service: CommentsService = Depends(get_comments_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        await comments_service.delete_comment(comment_id, current_user)
    except AuthError:
        logger.error(f"Error deleting comment with ID '{comment_id}': not authorized")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(f"Error deleting comment with ID '{comment_id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordDeletionError:
        logger.error(f"Error deleting comment with ID '{comment_id}': query error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(f"Error deleting comment with ID '{comment_id}', unexpected: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
