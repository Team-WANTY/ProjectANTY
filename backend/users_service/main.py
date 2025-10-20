import logging
from sys import stdout

logging.basicConfig(
    stream = stdout,
    level = logging.DEBUG,
    format="%(levelname)s | %(pathname)s @ %(funcName)s @ #%(lineno)d | %(message)s"
)

logger = logging.getLogger("users_service")

from azure.cosmos.aio import CosmosClient

from .settings import settings

logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    settings.cosmosdb_endpoint,
    settings.cosmosdb_key,
)
database = client.get_database_client(settings.cosmosdb_database_name)
users_container = database.get_container_client(settings.cosmosdb_users_container_name)
logger.debug("Connected to Azure CosmosDB and got users container")

from functools import lru_cache

from httpx import AsyncClient

from .database import UsersDB
from .service import UsersService

headers = {"X-Interservice-Key": settings.interservice_key}
@lru_cache
def get_users_service() -> UsersService:
    return UsersService(
        UsersDB(users_container),
        AsyncClient(headers=headers, base_url=settings.auth_service_endpoint),
    )

from fastapi import FastAPI

from .router import users_router

app = FastAPI(title="Users Service with CosmosDB")

app.include_router(users_router)
