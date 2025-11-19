from typing import Any

from cryptography.hazmat.primitives import serialization as crypto_serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from shared.key_io import set_key_to_environment

load_dotenv()


class Settings(BaseSettings):
    TOKEN_PRIVATE_KEY: str
    TOKEN_PUBLIC_KEY: str
    TOKEN_ALGORITHM: str
    ACCESS_TOKEN_EXPIRATION_MINUTES: int
    REFRESH_TOKEN_EXPIRATION_DAYS: int
    PW_RESET_TOKEN_EXPIRATION_MINUTES: int
    PROFILES_SERVICE_URL: str  # TODO temporary until Azure DNS

    FRONTEND_URL: str
    SMTP_USER: str
    SMTP_PASSWORD: str

    def model_post_init(self, __context: dict[str, Any]):
        if not self.TOKEN_PRIVATE_KEY or not self.TOKEN_PUBLIC_KEY:
            key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

            private_key = key.private_bytes(
                crypto_serialization.Encoding.PEM,
                crypto_serialization.PrivateFormat.TraditionalOpenSSL,
                crypto_serialization.NoEncryption(),
            ).decode()
            set_key_to_environment(key_name="TOKEN_PRIVATE_KEY", key=private_key)
            self.TOKEN_PRIVATE_KEY = private_key

            public_key = (
                key.public_key()
                .public_bytes(
                    crypto_serialization.Encoding.PEM,
                    crypto_serialization.PublicFormat.PKCS1,
                )
                .decode()
            )
            set_key_to_environment(key_name="TOKEN_PUBLIC_KEY", key=public_key)
            self.TOKEN_PUBLIC_KEY = public_key
        if not self.TOKEN_ALGORITHM:
            set_key_to_environment(key_name="TOKEN_ALGORITHM", key="RS256")
            self.TOKEN_ALGORITHM = "RS256"


settings = Settings()  # ty :ignore
