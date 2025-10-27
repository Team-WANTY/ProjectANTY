import logging
from functools import lru_cache
from sys import stdout

from azure.cosmos.aio import CosmosClient
from shared.settings import settings as shared_settings

from src.database import UsersDB
from src.service import UsersService

logging.basicConfig(
    stream = stdout,
    level = logging.ERROR,
    format="%(levelname)s | %(pathname)s @ %(funcName)s @ #%(lineno)d | %(message)s"
)

logger = logging.getLogger("users_service")

logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    shared_settings.COSMOSDB_ENDPOINT,
    shared_settings.COSMOSDB_KEY,
)
database = client.get_database_client(shared_settings.COSMOSDB_DATABASE_NAME)
users_container = database.get_container_client("users")
logger.debug("Connected to Azure CosmosDB and got users container")

# Suppress Azure Core pipeline logs below WARNING
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)
logging.getLogger("azure.core.pipeline").setLevel(logging.WARNING)
logging.getLogger("azure").setLevel(logging.WARNING)

logging.getLogger("httpx").setLevel(logging.WARNING)

headers = {"X-Interservice-Key": shared_settings.INTERSERVICE_KEY}
@lru_cache
def get_users_service() -> UsersService:
    return UsersService(
        UsersDB(users_container),
    )
