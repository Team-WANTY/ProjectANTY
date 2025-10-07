from pydantic_settings import BaseSettings
from pydantic import SecretStr

class Settings(BaseSettings):
    cosmosdb_endpoint: SecretStr
    cosmosdb_key: SecretStr
    cosmosdb_database_name: str
    cosmosdb_user_container_name: str

    private_token_key: str
    public_token_key: str
    token_algorithm:str
    token_expiration_minutes:int

settings: Settings = Settings() #pyright: ignore