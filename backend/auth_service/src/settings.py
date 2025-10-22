from typing import Any

from cryptography.hazmat.primitives import serialization as crypto_serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from shared.key_io import set_key_to_environment

load_dotenv()

class Settings(BaseSettings):
    cosmosdb_endpoint: str
    cosmosdb_key: str
    cosmosdb_database_name: str
    cosmosdb_users_container_name: str

    interservice_key: str
    token_private_key: str
    token_public_key: str
    token_algorithm: str
    access_token_expiration_minutes: int
    refresh_token_expiration_days: int

    model_config = SettingsConfigDict(env_file=".env")

    def model_post_init(self, __context: dict[str, Any]):

        if not self.token_private_key or not self.token_public_key:
            key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048
            )

            private_key = key.private_bytes(
                crypto_serialization.Encoding.PEM,
                crypto_serialization.PrivateFormat.TraditionalOpenSSL,
                crypto_serialization.NoEncryption()
            ).decode()
            set_key_to_environment(key_name="token_private_key", key=private_key)
            self.token_private_key = private_key

            public_key = key.public_key().public_bytes(
                crypto_serialization.Encoding.PEM,
                crypto_serialization.PublicFormat.PKCS1
            ).decode()
            set_key_to_environment(key_name="token_public_key", key=public_key)
            self.token_public_key = public_key


settings = Settings()  # ty :ignore
