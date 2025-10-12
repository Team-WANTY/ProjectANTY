from azure.cosmos.aio import CosmosClient
from backend.config import settings

client = CosmosClient(
    settings.cosmosdb_endpoint,
    settings.cosmosdb_key,
)
database = client.get_database_client(settings.cosmosdb_database_name)

users_container = database.get_container_client(settings.cosmosdb_user_container_name)
