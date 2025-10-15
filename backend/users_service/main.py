from users_service.settings import settings
from azure.cosmos.aio import CosmosClient

client = CosmosClient(
    settings.cosmosdb_endpoint,
    settings.cosmosdb_key,
)
database = client.get_database_client(settings.cosmosdb_database_name)
auth_container = database.get_container_client(settings.cosmosdb_user_container_name)

from httpx import AsyncClient

from users_service.database import UsersDB
from users_service.service import UsersService

headers = {"X-Internal-Key": settings.interservice_key}


def get_users_service() -> UsersService:
    return UsersService(
        UsersDB(auth_container),
        AsyncClient(headers=headers, base_url=settings.auth_service_endpoint),
    )

from fastapi import FastAPI

from users_service.router import users_router

app = FastAPI(title="Users Service with CosmosDB")

app.include_router(users_router)


@app.get("/")
async def root():
    return {"message": "Root for users service"}
