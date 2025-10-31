import logging
from functools import lru_cache
from sys import stdout

from azure.cosmos.aio import CosmosClient
from shared.settings import settings as shared_settings

from src.database import TaskDB
from src.service import TasksService

logging.basicConfig(
    stream=stdout,
    level=logging.DEBUG,
    format="%(levelname)s | %(pathname)s @ %(funcName)s @ #%(lineno)d | %(message)s",
)

logger = logging.getLogger("tasks_service")


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
