from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

class Settings(BaseSettings):
    cosmosdb_endpoint: str
    cosmosdb_key: str
    cosmosdb_database_name: str
    cosmosdb_users_container_name: str

    auth_service_external_url: str
    auth_service_internal_url: str

    interservice_key: str


settings = Settings()  # ty :ignore
