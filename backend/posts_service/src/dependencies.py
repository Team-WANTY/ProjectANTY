from functools import lru_cache

from azure.cosmos.aio import CosmosClient
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.database import PostsDB
from src.service import PostsService

logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    shared_settings.COSMOSDB_ENDPOINT,
    shared_settings.COSMOSDB_KEY,
)
database = client.get_database_client(shared_settings.COSMOSDB_DATABASE_NAME)
posts_container = database.get_container_client("posts")
logger.debug("Connected to Azure CosmosDB and got posts container")


@lru_cache
def get_posts_db() -> PostsDB:
    return PostsDB(posts_container)


@lru_cache
def get_posts_service() -> PostsService:
    return PostsService(get_posts_db())
