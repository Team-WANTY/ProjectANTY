from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from shared.db import now_timestamp
from shared.exceptions.db import (
    EmptyRecordUpdateError,
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.simple_logging import logger

from src.models import Comment, CommentCreate, CommentUpdate


class CommentsDB:
    def __init__(self, container: ContainerProxy):
        self.container = container
        logger.debug("Created CommentDB")

    async def create_comment(self, comment: CommentCreate):
        try:
            logger.debug(f"Trying to create comment: {comment.model_dump()}")
            new_comment = comment.to_comment()
            item: CosmosDict = await self.container.create_item(
                body=new_comment.model_dump(mode="json")
            )
            logger.debug(f"Trying to validate created item returned from DB: {item}")
            created_comment = Comment.model_validate(item, extra="ignore")
            logger.debug(
                f"Successfully created comment: {created_comment.model_dump()}"
            )
        except exceptions.CosmosResourceExistsError:
            logger.warning(
                f"Error while creating comment: {comment.model_dump()}, already exists"
            )
            raise RecordAlreadyExistsError()
        except Exception as e:
            logger.error(
                f"Error while creating comment: {comment.model_dump()}, unexpected: {e}"
            )
            raise RecordCreationError()

    async def get_comment(self, comment_id: str) -> Comment:
        try:
            logger.debug(f"Trying to get comment from user ID '{comment_id}'")
            item: CosmosDict = await self.container.read_item(
                item=comment_id, partition_key=comment_id
            )
            logger.debug(f"Trying to validate returned comment data: {item}")
            comment = Comment.model_validate(item, extra="ignore")
            logger.debug(f"Got from user ID '{comment_id}': {comment.model_dump()}")
            return comment
        except exceptions.CosmosResourceNotFoundError:
            logger.warning(
                f"Error while getting comment from ID '{comment_id}', not found"
            )
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error while getting comment from ID '{comment_id}', unexpected: {e}"
            )
            raise GeneralQueryError()

    async def get_comments_under_content_with_id(
        self, parent_content_id: str, max_items: int, continuation_token: str | None
    ):
        # get all post ids from user, sorted in descending order of creation
        query = """
            SELECT * FROM c
            WHERE c.parent_content_id = @content_id
            ORDER BY c.created_at DESC
        """
        parameters = [
            {"name": "@content_id", "value": parent_content_id},
        ]

        try:
            logger.debug(
                f"Trying to get all comment IDs under content with ID '{parent_content_id}'"
            )
            result_iterable = self.container.query_items(
                query=query,
                parameters=parameters,
                max_item_count=max_items,
            )

            items = None
            pager = result_iterable.by_page(continuation_token=continuation_token)
            async for page in pager:
                items: list[str] = [
                    Comment.model_validate(i, extra="ignore").id async for i in page
                ]
                break

            # Continuation token for the next page (or None if no more)
            new_cont: str | None = pager.continuation_token
            if items is None:
                return [], None
            return items, new_cont
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except StopAsyncIteration:
            # No pages at all — just return empty with no continuation
            return [], None
        except Exception as e:
            logger.error(
                f"Error getting comments under content with ID '{parent_content_id}': {e}"
            )
            raise GeneralQueryError()

    async def update_comment(self, comment_update: CommentUpdate):
        try:
            logger.debug(f"Trying to update comment: {comment_update.model_dump()}")
            patch_operations = []

            if comment_update.text is not None:
                logger.debug(
                    f"Trying to update text for comment with ID '{comment_update.id}' to '{comment_update.text}'"
                )
                patch_operations.append(
                    {"op": "replace", "path": "/text", "value": comment_update.text}
                )

            if comment_update.liker is not None:
                logger.debug(
                    f"Trying to update likes for comment with ID '{comment_update.id}' to '{comment_update.liker.model_dump()}'"
                )
                old_post = await self.get_comment(comment_update.id)
                likes = old_post.liker_ids
                if comment_update.liker.like:
                    likes.append(comment_update.liker.id)
                else:
                    try:
                        likes.remove(comment_update.liker.id)
                    except (
                        Exception
                    ):  # in case likes did not contain liker to begin with
                        pass
                patch_operations.append(
                    {"op": "replace", "path": "/liker_ids", "value": likes}
                )

            if len(patch_operations) == 0:
                logger.debug(
                    f"No valid update operations when updating comment with ID '{comment_update.id}'"
                )
                raise EmptyRecordUpdateError()

            logger.debug(
                f"Updating timestamp for comment update with ID '{comment_update.id}'"
            )
            patch_operations.append(
                {
                    "op": "replace",
                    "path": "/updated_at",
                    "value": now_timestamp().isoformat(),
                }
            )

            logger.debug(
                f"Trying to send update operations to DB for comment '{comment_update.id}'"
            )
            item = await self.container.patch_item(
                item=comment_update.id,
                partition_key=comment_update.id,
                patch_operations=patch_operations,
            )
            logger.debug(f"Trying to validate updated comment returned from DB: {item}")
            comment = Comment.model_validate(item, extra="ignore")
            logger.debug(
                f"Successfully updated comment '{comment_update.id}', new record: {comment.model_dump()}"
            )
        except exceptions.CosmosResourceNotFoundError:
            logger.warning(
                f"Error while updating comment with ID '{comment_update.id}', not found"
            )
            raise RecordNotFoundError()
        except EmptyRecordUpdateError:
            raise
        except Exception as e:
            logger.error(
                f"Error while updating comment with ID '{comment_update.id}', unexpected: {e}"
            )
            raise RecordUpdateError()

    async def delete_comment(self, comment_id: str):
        try:
            logger.debug(f"Trying to delete comment with ID '{comment_id}'")
            await self.container.delete_item(item=comment_id, partition_key=comment_id)
            logger.debug(f"Successfully deleted comment with ID '{comment_id}'")
        except exceptions.CosmosResourceNotFoundError:
            logger.warning(f"Error while deleting comment '{comment_id}', not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error while deleting comment '{comment_id}', unexpected: {e}"
            )
            raise RecordDeletionError()
