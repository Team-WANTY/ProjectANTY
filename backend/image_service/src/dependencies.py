from shared.simple_logging import logger
from functools import lru_cache
from sys import stdout

from azure.cosmos.aio import CosmosClient
from azure.storage.blob.aio import BlobServiceClient
from shared.settings import settings as shared_settings

from src.blob_store import BlobStorage
from src.database import ImageDB
from src.service import ImageService
from src.settings import settings

logger.debug("Connecting to Azure Blob Storage")
blob_client = BlobServiceClient.from_connection_string(settings.BLOB_CONNECTION_STRING)

logger.debug("Connected to Azure Blob Storage")

logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    shared_settings.COSMOSDB_ENDPOINT,
    shared_settings.COSMOSDB_KEY,
)
database = client.get_database_client(shared_settings.COSMOSDB_DATABASE_NAME)
images_container = database.get_container_client("images")
logger.debug("Connected to Azure CosmosDB and got images container")


@lru_cache
def get_image_service() -> ImageService:
    return ImageService(ImageDB(images_container), BlobStorage(blob_client))
