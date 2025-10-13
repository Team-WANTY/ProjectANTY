from dotenv import load_dotenv

load_dotenv()

from typing import Any
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    cosmosdb_endpoint: str
    cosmosdb_key: str
    cosmosdb_database_name: str
    cosmosdb_auth_container_name: str


settings = Settings()  # ty :ignore


from azure.cosmos.aio import CosmosClient

client = CosmosClient(
    settings.cosmosdb_endpoint,
    settings.cosmosdb_key,
)
database = client.get_database_client(settings.cosmosdb_database_name)
auth_container = database.get_container_client(settings.cosmosdb_auth_container_name)


from fastapi import FastAPI
from .router import auth_router
from .service import AuthService
from .database import AuthDB


def get_auth_service() -> AuthService:
    return AuthService(AuthDB(auth_container))


app = FastAPI(title="Auth Service with CosmosDB")

app.include_router(auth_router)


@app.get("/")
async def root():
    return {"message": "Root for authentication service"}
