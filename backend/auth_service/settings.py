from typing import Any

from pydantic_settings import BaseSettings

from shared.key_io import find_key, set_key_to_environment


class Settings(BaseSettings):
    cosmosdb_endpoint: str
    cosmosdb_key: str
    cosmosdb_database_name: str
    cosmosdb_user_container_name: str

    users_service_endpoint: str

    interservice_key: str
    token_private_key: str
    token_public_key: str
    token_algorithm: str
    access_token_expiration_minutes: int
    refresh_token_expiration_days: int

    def model_post_init(self, __context: dict[str, Any]):
        if not self.token_private_key:
            prikey = find_key(key_name="token_private_key")
            set_key_to_environment(key_name="token_private_key", key=prikey)
            self.token_private_key = prikey

        if not self.token_public_key:
            pubkey = find_key(key_name="token_public_key")
            set_key_to_environment(key_name="token_public_key", key=pubkey)
            self.token_public_key = pubkey


settings = Settings()  # ty :ignore
