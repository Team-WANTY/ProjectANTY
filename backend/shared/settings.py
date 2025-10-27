import secrets
from typing import Any

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

from key_io import set_key_to_environment

load_dotenv()



class Settings(BaseSettings):
    AUTH_SERVICE_URL: str #TODO temporary while auth service not deployed
    AUTH_EXTERNAL_URL: str
    INTERSERVICE_KEY: str

    COSMOSDB_ENDPOINT: str
    COSMOSDB_KEY: str
    COSMOSDB_DATABASE_NAME: str

    def model_post_init(self, __context: dict[str, Any]):

        if not self.INTERSERVICE_KEY:
            key = secrets.token_hex(64)
            set_key_to_environment(key_name="INTERSERVICE_KEY", key=key)

settings = Settings()#ty: ignore
