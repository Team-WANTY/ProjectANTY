from functools import lru_cache

from azure.cosmos.aio import CosmosClient
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.database import AuthDB
from src.service import AuthService

logger.debug("Connecting to Azure CosmosDB")

client = CosmosClient(
    shared_settings.COSMOSDB_ENDPOINT,
    shared_settings.COSMOSDB_KEY,
)
database = client.get_database_client(shared_settings.COSMOSDB_DATABASE_NAME)
users_container = database.get_container_client("users")
logger.debug("Connected to Azure CosmosDB and got 'users' container")


@lru_cache
def get_auth_db() -> AuthDB:
    return AuthDB(users_container)


@lru_cache
def get_auth_service() -> AuthService:
    return AuthService(get_auth_db())
