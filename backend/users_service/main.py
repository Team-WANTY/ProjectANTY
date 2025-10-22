import logging
from sys import stdout

logging.basicConfig(
    stream = stdout,
    level = logging.DEBUG,
    format="%(levelname)s | %(pathname)s @ %(funcName)s @ #%(lineno)d | %(message)s"
)

logger = logging.getLogger("users_service")

from azure.cosmos.aio import CosmosClient

from backend.shared.settings import settings as shared_settings

logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    shared_settings.COSMOSDB_ENDPOINT,
    shared_settings.COSMOSDB_KEY,
)
database = client.get_database_client(shared_settings.COSMOSDB_DATABASE_NAME)
users_container = database.get_container_client("users")
logger.debug("Connected to Azure CosmosDB and got users container")

from functools import lru_cache

from .database import UsersDB
from .service import UsersService

headers = {"X-Interservice-Key": shared_settings.INTERSERVICE_KEY}
@lru_cache
def get_users_service() -> UsersService:
    return UsersService(
        UsersDB(users_container),
    )

from fastapi import FastAPI

from .router import users_router

app = FastAPI(title="Users Service with CosmosDB")

app.include_router(users_router)
