from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    cosmosdb_endpoint: str
    cosmosdb_key: str
    cosmosdb_database_name: str
    cosmosdb_user_container_name: str

    auth_service_endpoint: str

    interservice_key: str


settings = Settings()  # ty :ignore
