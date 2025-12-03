from functools import lru_cache

from azure.cosmos.aio import CosmosClient
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.database import ProfileDB
from src.service import ProfileService

logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    shared_settings.COSMOSDB_ENDPOINT,
    shared_settings.COSMOSDB_KEY,
)
database = client.get_database_client(shared_settings.COSMOSDB_DATABASE_NAME)
profiles_container = database.get_container_client("profiles")
logger.debug("Connected to Azure CosmosDB and got profiles container")


@lru_cache
def get_profile_db() -> ProfileDB:
    return ProfileDB(profiles_container)


@lru_cache
def get_profiles_service() -> ProfileService:
    return ProfileService(get_profile_db())
