from shared.auth import authorize_operation
from shared.models.users import UserInDB
from shared.simple_logging import logger

from src.database import CommentsDB
from src.models import CommentCreate, CommentUpdate


class CommentsService:
    def __init__(self, comments_db: CommentsDB):
        self.comments_db = comments_db

    async def create_comment(self, new_comment: CommentCreate, creator: UserInDB):
        logger.debug(
            f"Starting to create comment: {new_comment.model_dump()}, starting with authorization"
        )
        await authorize_operation(creator, new_comment.creator_id)
        return await self.comments_db.create_comment(new_comment)

    async def get_comment(self, comment_id: str):
        return await self.comments_db.get_comment(comment_id)

    async def get_comments_under_content_with_id(
        self, parent_content_id: str, max_items: int, continuation_token: str | None
    ):
        return await self.comments_db.get_comments_under_content_with_id(
            parent_content_id, max_items, continuation_token
        )

    async def update_comment(self, comment_update: CommentUpdate, updater: UserInDB):
        logger.debug(
            f"Starting to update comment: {comment_update.model_dump()}, starting with authorization"
        )
        comment = await self.get_comment(comment_update.id)
        await authorize_operation(updater, comment.creator_id)
        await self.comments_db.update_comment(comment_update)

    async def delete_comment(self, comment_id: str, deleter: UserInDB):
        logger.debug(
            f"Starting to delete comment: {comment_id}, starting with authorization"
        )
        comment = await self.get_comment(comment_id)
        await authorize_operation(deleter, comment.creator_id)
        await self.comments_db.delete_comment(comment_id)
