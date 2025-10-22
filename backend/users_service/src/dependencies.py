import logging
from functools import lru_cache
from sys import stdout

from azure.cosmos.aio import CosmosClient
from httpx import AsyncClient

from src.database import UsersDB
from src.service import UsersService
from src.settings import settings

# Setup logger
logging.basicConfig(
    stream = stdout,
    level = logging.DEBUG,
    format="%(levelname)s | %(pathname)s @ %(funcName)s @ #%(lineno)d | %(message)s"
)

logger = logging.getLogger("users_service")

logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    settings.cosmosdb_endpoint,
    settings.cosmosdb_key,
)

# Setup DB
database = client.get_database_client(settings.cosmosdb_database_name)
users_container = database.get_container_client(settings.cosmosdb_users_container_name)
logger.debug("Connected to Azure CosmosDB and got users container")

headers = {"X-Interservice-Key": settings.interservice_key}
@lru_cache
def get_users_service() -> UsersService:
    return UsersService(
        UsersDB(users_container),
        AsyncClient(headers=headers, base_url=settings.auth_service_internal_url),
    )
