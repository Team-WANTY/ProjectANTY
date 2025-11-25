from functools import lru_cache

from azure.cosmos.aio import CosmosClient
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.database import TaskDB
from src.service import TasksService

logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    shared_settings.COSMOSDB_ENDPOINT,
    shared_settings.COSMOSDB_KEY,
)
database = client.get_database_client(shared_settings.COSMOSDB_DATABASE_NAME)
tasks_container = database.get_container_client("tasks")
logger.debug("Connected to Azure CosmosDB and got tasks container")


@lru_cache
def get_tasks_service() -> TasksService:
    return TasksService(TaskDB(tasks_container))
