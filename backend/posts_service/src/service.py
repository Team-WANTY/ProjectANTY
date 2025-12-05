from datetime import datetime

from httpx import AsyncClient
from shared.auth import authorize_operation
from shared.models.users import UserInDB
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.database import PostsDB
from src.models import PostCreate, PostUpdate


class PostsService:
    def __init__(self, posts_db: PostsDB):
        self.posts_db = posts_db

    async def get_friends(self, user_id: str):
        async with AsyncClient() as client:
            response = await client.get(
                f"{shared_settings.FRIENDS_SERVICE_URL}/{user_id}",
                headers={"X-Interservice-Key": shared_settings.INTERSERVICE_KEY},
            )

        if response.status_code != 200:
            raise ValueError("Failed to fetch friends")

        friends = response.json()
        if not isinstance(friends, list):
            raise ValueError("Friends service response was not a list")
        return friends

    async def create_post(self, new_post: PostCreate, creator: UserInDB):
        logger.debug(
            f"Starting to create task: {new_post.model_dump()}, starting with authorization"
        )
        await authorize_operation(creator, new_post.creator_id)
        return await self.posts_db.create_post(new_post)

    async def get_post(self, post_id: str):
        return await self.posts_db.get_post(post_id)

    async def get_users_post_ids(
        self, user_id: str, max_items: int, continuation_token: str | None
    ):
        return await self.posts_db.get_users_post_ids(
            user_id, max_items, continuation_token
        )

    async def get_relevant_posts(
        self,
        user_id: str,
        getter: UserInDB,
        max_items: int,
        continuation_token: str | None,
    ):
        """Returns list of post ids: newest -> oldest.
        Used for populating posts initially.
        Requires current user due to friend list being basically exposed"""
        logger.debug(
            f"Reaching out to friends service to list all friends of user with ID '{user_id}'"
        )
        await authorize_operation(getter, user_id)
        friends = await self.get_friends(user_id)
        friends.insert(0, user_id)

        return await self.posts_db.get_relevant_posts(
            friends, max_items, continuation_token
        )

    async def get_relevant_posts_after_timestamp(
        self,
        user_id: str,
        timestamp: datetime,
        getter: UserInDB,
        max_items: int,
        continuation_token: str | None,
    ):
        """Returns list of post ids: oldest(at or after timestamp)-> newest.
        Used for updates, query this endpoint with the timestamp of the newest post and get back posts made after it.
        Requires current user due to friend list being basically exposed"""
        logger.debug(
            f"Reaching out to friends service to list all friends of user with ID '{user_id}'"
        )
        await authorize_operation(getter, user_id)
        friends = await self.get_friends(user_id)
        friends.insert(0, user_id)
        return await self.posts_db.get_relevant_posts_after_timestamp(
            friends, timestamp, max_items, continuation_token
        )

    async def update_post(self, post_update: PostUpdate, updater: UserInDB):
        logger.debug(
            f"Starting to create task: {post_update.model_dump()}, starting with authorization"
        )
        post = await self.get_post(post_update.id)
        await authorize_operation(updater, post.creator_id)
        await self.posts_db.update_post(post_update)

    async def delete_post(self, post_id: str, deleter: UserInDB):
        post = await self.get_post(post_id)
        await authorize_operation(deleter, post.creator_id)
        await self.posts_db.delete_post(post_id)
