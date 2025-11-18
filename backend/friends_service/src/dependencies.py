import logging
from functools import lru_cache
from sys import stdout

from azure.cosmos.aio import CosmosClient
from shared.settings import settings as shared_settings

from src.database import FriendRequestsDB, FriendshipsDB
from src.service import FriendsService


logging.basicConfig(
    stream=stdout,
    level=logging.DEBUG,
    format="%(levelname)s | %(pathname)s @ %(funcName)s @ #%(lineno)d | %(message)s",
)

logger = logging.getLogger("friends_service")


logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    shared_settings.COSMOSDB_ENDPOINT,
    shared_settings.COSMOSDB_KEY,
)
database = client.get_database_client(shared_settings.COSMOSDB_DATABASE_NAME)
friend_requests_container = database.get_container_client("friend_requests")
friendships_container = database.get_container_client("friendships")

logger.debug("Connected to both friends containers")


@lru_cache
def get_friends_service():
    return FriendsService(
        FriendRequestsDB(friend_requests_container),
        FriendshipsDB(friendships_container),
    )

