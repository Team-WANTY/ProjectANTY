from functools import lru_cache

from azure.cosmos.aio import CosmosClient
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from notification_service.src.database import NotificationsDB
from notification_service.src.service import NotificationsService

logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    shared_settings.COSMOSDB_ENDPOINT,
    shared_settings.COSMOSDB_KEY,
)
database = client.get_database_client(shared_settings.COSMOSDB_DATABASE_NAME)
notifications_container = database.get_container_client("notifications")
logger.debug("Connected to Azure CosmosDB and got notifications container")


@lru_cache
def get_db() -> NotificationsDB:
    return NotificationsDB(notifications_container)


@lru_cache
def get_service() -> NotificationsService:
    return NotificationsService(get_db())
