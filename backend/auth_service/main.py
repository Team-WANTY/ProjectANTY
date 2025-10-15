from azure.cosmos.aio import CosmosClient

from auth_service.settings import settings

client = CosmosClient(
    settings.cosmosdb_endpoint,
    settings.cosmosdb_key,
)
database = client.get_database_client(settings.cosmosdb_database_name)
auth_container = database.get_container_client(settings.cosmosdb_user_container_name)

from httpx import AsyncClient

from auth_service.database import AuthDB
from auth_service.service import AuthService

headers = {"X-Internal-Key": settings.interservice_key}


def get_auth_service() -> AuthService:
    return AuthService(
        AuthDB(auth_container),
        AsyncClient(headers=headers, base_url=settings.users_service_endpoint),
    )


from fastapi import FastAPI

from auth_service.router import auth_router

app = FastAPI(title="Auth Service with CosmosDB")

app.include_router(auth_router)
