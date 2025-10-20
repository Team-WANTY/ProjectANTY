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

client = CosmosClient(
    settings.cosmosdb_endpoint,
    settings.cosmosdb_key,
)
database = client.get_database_client(settings.cosmosdb_database_name)
auth_container = database.get_container_client(settings.cosmosdb_user_container_name)

#from httpx import AsyncClient #TODO interservice not necessary with auth service

from functools import lru_cache

from .database import AuthDB
from .service import AuthService

#headers = {"X-Internal-Key": settings.interservice_key} #TODO interservice not necessary with auth service

@lru_cache
def get_auth_db() -> AuthDB:
    return AuthDB(auth_container)

@lru_cache
def get_auth_service() -> AuthService:
    return AuthService(
        get_auth_db(),
        #AsyncClient(headers=headers, base_url=settings.users_service_endpoint), #TODO interservice not necessary with auth service
    )


from fastapi import FastAPI

from .router import auth_router

app = FastAPI(title="Auth Service with CosmosDB")

app.include_router(auth_router)
