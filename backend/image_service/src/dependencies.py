import logging
from functools import lru_cache
from sys import stdout

from azure.cosmos.aio import CosmosClient
from azure.storage.blob.aio import BlobServiceClient
from shared.settings import settings as shared_settings

from src.blob_store import BlobStorage
from src.database import ImageDB
from src.service import ImageService
from src.settings import settings

logging.basicConfig(
    stream=stdout,
    level=logging.INFO,
    format="%(levelname)s | %(pathname)s @ %(funcName)s @ #%(lineno)d | %(message)s",
)

logger = logging.getLogger("image_service")

logger.debug("Connecting to Azure Blob Storage")
blob_client = BlobServiceClient.from_connection_string(settings.BLOB_CONNECTION_STRING)

logger.debug("Connected to Azure Blob Storage")

logger.debug("Connecting to Azure CosmosDB")
client = CosmosClient(
    shared_settings.COSMOSDB_ENDPOINT,
    shared_settings.COSMOSDB_KEY,
)
database = client.get_database_client(shared_settings.COSMOSDB_DATABASE_NAME)
profiles_container = database.get_container_client("images")
logger.debug("Connected to Azure CosmosDB and got images container")


@lru_cache
def get_image_service() -> ImageService:
    return ImageService(ImageDB(profiles_container), BlobStorage(blob_client))
