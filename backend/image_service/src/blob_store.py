import logging
import uuid

from azure.storage.blob.aio import BlobServiceClient
from shared.exceptions.db import (
    RecordCreationError,
    RecordDeletionError,
    RecordAlreadyExistsError,
)
from shared.db import generate_id

from src.models import Blob

from io import BytesIO
from PIL import Image

logger = logging.getLogger("image_service")


class BlobStorage:
    def __init__(self, client: BlobServiceClient):
        self.client = client
        logger.debug("Created BlobContainer")

    async def create_blob(self, container: str, data: bytes) -> Blob:
        try:
            img = Image.open(BytesIO(data)).convert("RGB")
            img.verify()  # verify file integrity
            output = BytesIO()
            img.save(output, format="JPEG", quality=80)
            output.seek(0)
            jpeg_bytes = output.getvalue()

            id = generate_id()
            blob_client = self.client.get_blob_client(container=container, blob=id)
            await blob_client.upload_blob(jpeg_bytes)
            return Blob(container=container, id=id, url=blob_client.url)
        except Exception as e:
            logger.exception(
                f"Unexpected error while creating blob in '{container}': {e}"
            )
            raise RecordCreationError()

    async def delete_blob(self, blob: Blob):
        try:
            blob_client = self.client.get_blob_client(
                container=blob.container, blob=blob.id
            )
            await blob_client.delete_blob(delete_snapshots="include")
        except Exception as e:
            logger.exception(
                f"Unexpected error while creating blob in '{blob.container}': {e}"
            )
            raise RecordDeletionError()
