import logging
from sys import stdout

logging.basicConfig(
    stream = stdout,
    level = logging.DEBUG,
    format="%(levelname)s | %(pathname)s @ %(funcName)s @ #%(lineno)d | %(message)s"
)

logger = logging.getLogger("auth_service")

from azure.cosmos.aio import CosmosClient

from .settings import settings

logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    settings.cosmosdb_endpoint,
    settings.cosmosdb_key,
)
database = client.get_database_client(settings.cosmosdb_database_name)
users_container = database.get_container_client(settings.cosmosdb_users_container_name)
logger.debug("Connected to Azure CosmosDB and got 'users' container")

from functools import lru_cache

from .database import AuthDB
from .service import AuthService


@lru_cache
def get_auth_db() -> AuthDB:
    return AuthDB(users_container)

@lru_cache
def get_auth_service() -> AuthService:
    return AuthService(
        get_auth_db(),
    )


from fastapi import FastAPI

from .router import auth_router

app = FastAPI(title="Auth Service with CosmosDB")

app.include_router(auth_router)
