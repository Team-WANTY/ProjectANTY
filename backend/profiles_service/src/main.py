import logging
from sys import stdout

logging.basicConfig(
    stream = stdout,
    level = logging.DEBUG,
    format="%(levelname)s | %(pathname)s @ %(funcName)s @ #%(lineno)d | %(message)s"
)

logger = logging.getLogger("profiles_service")

from azure.cosmos.aio import CosmosClient

from backend.shared.settings import settings as shared_settings

logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    shared_settings.COSMOSDB_ENDPOINT,
    shared_settings.COSMOSDB_KEY,
)
database = client.get_database_client(shared_settings.COSMOSDB_DATABASE_NAME)
profiles_container = database.get_container_client("profiles")
logger.debug("Connected to Azure CosmosDB and got profiles container")

from functools import lru_cache

from .database import ProfileDB
from .service import ProfileService


# not needed due to generalized
# headers = {"X-Interservice-Key": shared_settings.INTERSERVICE_KEY}
# AsyncClient(headers=headers, base_url=???)
@lru_cache
def get_profiles_service() -> ProfileService:
    return ProfileService(
        ProfileDB(profiles_container),
    )

from fastapi import FastAPI

from .router import profiles_router

app = FastAPI(title="Profiles Service with CosmosDB")

app.include_router(profiles_router)
