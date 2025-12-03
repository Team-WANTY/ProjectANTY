from functools import lru_cache

from azure.cosmos.aio import CosmosClient
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.database import FriendshipsDB
from src.service import FriendsService

logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    shared_settings.COSMOSDB_ENDPOINT,
    shared_settings.COSMOSDB_KEY,
)
database = client.get_database_client(shared_settings.COSMOSDB_DATABASE_NAME)
friendships_container = database.get_container_client("friendships")

logger.debug("Connected to both friends containers")


@lru_cache
def get_friends_db():
    return FriendshipsDB(friendships_container)


@lru_cache
def get_friends_service():
    return FriendsService(get_friends_db())
