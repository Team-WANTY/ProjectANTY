from dotenv import load_dotenv

load_dotenv()

from typing import Any
from pydantic_settings import BaseSettings
from ..shared.key_io import find_key, set_key_to_environment


class Settings(BaseSettings):
    cosmosdb_endpoint: str
    cosmosdb_key: str
    cosmosdb_database_name: str
    cosmosdb_auth_container_name: str

    user_service_endpoint:str

    interservice_key: str
    token_private_key: str
    token_public_key: str
    token_algorithm: str
    access_token_expiration_minutes: int
    refresh_token_expiration_days: int

    def model_post_init(self, __context: dict[str, Any]):
        if not self.token_private_key:
            prikey =find_key(key_name="token_private_key")
            set_key_to_environment(key_name="token_private_key", key=prikey)
            self.token_private_key = prikey

        if not self.token_public_key:
            pubkey =find_key(key_name="token_public_key")
            set_key_to_environment(key_name="token_public_key", key=pubkey)
            self.token_public_key = pubkey


settings = Settings()  # ty :ignore


from azure.cosmos.aio import CosmosClient

client = CosmosClient(
    settings.cosmosdb_endpoint,
    settings.cosmosdb_key,
)
database = client.get_database_client(settings.cosmosdb_database_name)
auth_container = database.get_container_client(settings.cosmosdb_auth_container_name)

from fastapi import FastAPI
from httpx import AsyncClient

from .router import auth_router
from .service import AuthService
from .database import AuthDB


headers={"X-Internal-Key": settings.interservice_key}
def get_auth_service() -> AuthService:
    return AuthService(AuthDB(auth_container), AsyncClient(headers=headers, base_url=settings.user_service_endpoint))

app = FastAPI(title="Auth Service with CosmosDB")

app.include_router(auth_router)


@app.get("/")
async def root():
    return {"message": "Root for authentication service"}
