import logging
from functools import lru_cache
from sys import stdout

from azure.cosmos.aio import CosmosClient
from shared.settings import settings as shared_settings

from src.database import ProfileDB
from src.service import ProfileService

logging.basicConfig(
    stream = stdout,
    level = logging.ERROR,
    format="%(levelname)s | %(pathname)s @ %(funcName)s @ #%(lineno)d | %(message)s"
)

logger = logging.getLogger("profiles_service")


logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    shared_settings.COSMOSDB_ENDPOINT,
    shared_settings.COSMOSDB_KEY,
)
database = client.get_database_client(shared_settings.COSMOSDB_DATABASE_NAME)
profiles_container = database.get_container_client("profiles")
logger.debug("Connected to Azure CosmosDB and got profiles container")

# Suppress Azure Core pipeline logs below WARNING
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)
logging.getLogger("azure.core.pipeline").setLevel(logging.WARNING)
logging.getLogger("azure").setLevel(logging.WARNING)

logging.getLogger("httpx").setLevel(logging.WARNING)

# not needed due to generalized
# headers = {"X-Interservice-Key": shared_settings.INTERSERVICE_KEY}
# AsyncClient(headers=headers, base_url=???)
@lru_cache
def get_profiles_service() -> ProfileService:
    return ProfileService(
        ProfileDB(profiles_container),
    )
