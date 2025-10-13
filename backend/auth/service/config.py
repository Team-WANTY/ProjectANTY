from typing import Any

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

from service.security.key_io import key_io

load_dotenv()


class Settings(BaseSettings):
    cosmosdb_endpoint: str
    cosmosdb_key: str
    cosmosdb_database_name: str
    cosmosdb_user_container_name: str

    token_private_key: str
    token_public_key: str
    token_algorithm: str
    access_token_expiration_minutes: int
    refresh_token_expiration_days: int

    def model_post_init(self, __context: dict[str, Any]):
        if not self.token_private_key:
            prikey = key_io.find_key(key_name="token_private_key")
            key_io.set_key_to_environment(key_name="token_private_key", key=prikey)
            self.token_private_key = prikey

        if not self.token_public_key:
            pubkey = key_io.find_key(key_name="token_public_key")
            key_io.set_key_to_environment(key_name="token_public_key", key=pubkey)
            self.token_public_key = pubkey


settings: Settings = Settings()  # ty :ignore
