from datetime import datetime

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

from src.models import Post, PostCreate, PostUpdate


class PostsDB:
    def __init__(self, container: ContainerProxy):
        self.container = container
        logger.debug("Created PostDB")

    async def create_post(self, post: PostCreate):
        try:
            logger.debug(f"Trying to create post: {post.model_dump()}")
            new_post = post.to_post()
            item: CosmosDict = await self.container.create_item(
                body=new_post.model_dump(mode="json")
            )
            logger.debug(f"Trying to validate created item returned from DB: {item}")
            created_post = Post.model_validate(item, extra="ignore")
            logger.debug(f"Successfully created post: {created_post.model_dump()}")
        except exceptions.CosmosResourceExistsError:
            logger.warning(
                f"Error while creating post: {post.model_dump()}, already exists"
            )
            raise RecordAlreadyExistsError()
        except Exception as e:
            logger.error(
                f"Error while creating post: {post.model_dump()}, unexpected: {e}"
            )
            raise RecordCreationError()

    async def get_post(self, post_id: str) -> Post:
        try:
            logger.debug(f"Trying to get profile from user ID '{post_id}'")
            item: CosmosDict = await self.container.read_item(
                item=post_id, partition_key=post_id
            )
            logger.debug(f"Trying to validate returned profile data: {item}")
            post = Post.model_validate(item, extra="ignore")
            logger.debug(f"Got from user ID '{post_id}': {post.model_dump()}")
            return post
        except exceptions.CosmosResourceNotFoundError:
            logger.warning(f"Error while getting post from ID '{post_id}', not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error while getting post from ID '{post_id}', unexpected: {e}"
            )
            raise GeneralQueryError()

    async def get_users_post_ids(
        self, user_id: str, max_items: int, continuation_token: str | None
    ):
        # get all post ids from user, sorted in descending order of creation
        query = """
            SELECT * FROM c
            WHERE c.creator_id = @user_id
            ORDER BY c.created_at DESC
        """
        parameters = [
            {"name": "@user_id", "value": user_id},
        ]

        try:
            logger.debug(f"Trying to get all post IDs of user with ID '{user_id}'")
            result_iterable = self.container.query_items(
                query=query,
                parameters=parameters,
                max_item_count=max_items,
            )

            items = None
            pager = result_iterable.by_page(continuation_token=continuation_token)
            async for page in pager:
                items: list[str] = [
                    Post.model_validate(i, extra="ignore").id async for i in page
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
            logger.error(f"Error getting post IDs of user with ID '{user_id}': {e}")
            raise GeneralQueryError()

    async def get_relevant_posts(
        self,
        relevant_user_ids: list[str],
        max_items: int,
        continuation_token: str | None,
    ):
        # get all post ids from user and friends, sorted in descending order of creation
        query = """
            SELECT * FROM c
            WHERE ARRAY_CONTAINS(@user_ids, c.creator_id)
            ORDER BY c.created_at DESC
        """
        parameters = [
            {"name": "@user_ids", "value": relevant_user_ids},
        ]

        try:
            result_iterable = self.container.query_items(
                query=query,
                parameters=parameters,
                max_item_count=max_items,
            )

            items = None
            pager = result_iterable.by_page(continuation_token=continuation_token)
            async for page in pager:
                items: list[str] = [
                    Post.model_validate(i, extra="ignore").id async for i in page
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
                f"Error relevant posts of user with ID'{relevant_user_ids[0]}': {e}"
            )
            raise GeneralQueryError()

    async def get_relevant_posts_after_timestamp(
        self,
        relevant_user_ids: list[str],
        timestamp: datetime,
        max_items: int,
        continuation_token: str | None,
    ):
        query = """
            SELECT * FROM c
            WHERE ARRAY_CONTAINS(@user_ids, c.creator_id) AND c.created_at >= @timestamp
            ORDER BY c.created_at ASC
        """
        parameters = [
            {"name": "@user_ids", "value": relevant_user_ids},
            {"name": "@timestamp", "value": timestamp.isoformat()},
        ]

        try:
            result_iterable = self.container.query_items(
                query=query,
                parameters=parameters,
                max_item_count=max_items,
            )

            items = None
            pager = result_iterable.by_page(continuation_token=continuation_token)
            async for page in pager:
                items: list[str] = [
                    Post.model_validate(i, extra="ignore").id async for i in page
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
                f"Error getting relevant posts of user with ID '{relevant_user_ids[0]}' after timestamp '{timestamp}': {e}"
            )
            raise GeneralQueryError()

    async def update_post(self, post_update: PostUpdate):
        try:
            logger.debug(f"Trying to update profile: {post_update.model_dump()}")
            patch_operations = []

            if post_update.text is not None:
                logger.debug(
                    f"Trying to update text for post with ID '{post_update.id}' to '{post_update.text}'"
                )
                patch_operations.append(
                    {"op": "replace", "path": "/text", "value": post_update.text}
                )

            if post_update.liker is not None:
                logger.debug(
                    f"Trying to update likes for post with ID '{post_update.id}' to '{post_update.liker.model_dump()}'"
                )
                old_post = await self.get_post(post_update.id)
                likes = old_post.liker_ids
                if post_update.liker.like:
                    likes.append(post_update.liker.id)
                else:
                    try:
                        likes.remove(post_update.liker.id)
                    except (
                        Exception
                    ):  # in case likes did not contain liker to begin with
                        pass
                patch_operations.append(
                    {"op": "replace", "path": "/liker_ids", "value": likes}
                )

            if post_update.image_ids is not None:
                logger.debug(
                    f"Trying to update images for post with ID '{post_update.id}' to '{post_update.image_ids}'"
                )
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/image_ids",
                        "value": post_update.image_ids,
                    }
                )

            if len(patch_operations) == 0:
                logger.debug(
                    f"No valid update operations when updating profile for user ID '{post_update.id}'"
                )
                raise EmptyRecordUpdateError()

            logger.debug(
                f"Updating timestamp for last update for user ID '{post_update.id}'"
            )
            patch_operations.append(
                {
                    "op": "replace",
                    "path": "/updated_at",
                    "value": now_timestamp().isoformat(),
                }
            )

            logger.debug(
                f"Trying to send update operations to DB for profile '{post_update.id}'"
            )
            item = await self.container.patch_item(
                item=post_update.id,
                partition_key=post_update.id,
                patch_operations=patch_operations,
            )
            logger.debug(f"Trying to validate updated profile returned from DB: {item}")
            post = Post.model_validate(item, extra="ignore")
            logger.debug(
                f"Successfully updated profile '{post_update.id}', new record: {post.model_dump()}"
            )
        except exceptions.CosmosResourceNotFoundError:
            logger.warning(
                f"Error while updating profile from user ID '{post_update.id}', not found"
            )
            raise RecordNotFoundError()
        except EmptyRecordUpdateError:
            raise
        except Exception as e:
            logger.error(
                f"Error while updating profile from user ID '{post_update.id}', unexpected: {e}"
            )
            raise RecordUpdateError()

    async def delete_post(self, post_id: str):
        try:
            logger.debug(f"Trying to delete post with ID '{post_id}'")
            await self.container.delete_item(item=post_id, partition_key=post_id)
            logger.debug(f"Successfully deleted post with ID '{post_id}'")
        except exceptions.CosmosResourceNotFoundError:
            logger.warning(f"Error while deleting post '{post_id}', not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(f"Error while deleting post '{post_id}', unexpected: {e}")
            raise RecordDeletionError()
