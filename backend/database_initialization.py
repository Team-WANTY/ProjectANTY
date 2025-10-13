from azure.cosmos.aio import CosmosClient

from service.config import settings

client = CosmosClient(
    settings.cosmosdb_endpoint,
    settings.cosmosdb_key,
)
database = client.get_database_client(settings.cosmosdb_database_name)

users_container = database.get_container_client(settings.cosmosdb_users_container_name)
authentication_container = database.get_container_cliient(settings.cosmosdb_authentication_container_name)