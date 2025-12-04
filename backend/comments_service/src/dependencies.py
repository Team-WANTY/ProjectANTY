from functools import lru_cache

from azure.cosmos.aio import CosmosClient
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.database import CommentsDB
from src.service import CommentsService

logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    shared_settings.COSMOSDB_ENDPOINT,
    shared_settings.COSMOSDB_KEY,
)
database = client.get_database_client(shared_settings.COSMOSDB_DATABASE_NAME)
comments_container = database.get_container_client("comments")
logger.debug("Connected to Azure CosmosDB and got comments container")


@lru_cache
def get_comments_db() -> CommentsDB:
    return CommentsDB(comments_container)


@lru_cache
def get_comments_service() -> CommentsService:
    return CommentsService(get_comments_db())
