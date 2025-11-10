import logging

from shared.auth import authorize_operation
from shared.models.auth import UserAuthInfo

from src.blob_store import BlobStorage
from src.database import ImageDB
from src.models import Image

logger = logging.getLogger("image_service")

class ImageService:

    def __init__(self, image_db: ImageDB, image_blob: BlobStorage):
        self.db = image_db
        self.blob = image_blob

    async def upload_img(self, container: str, image: bytes, user_id: str, updater: UserAuthInfo) -> Image:
        await authorize_operation(updater, user_id)
        blob = await self.blob.create_blob(container=container, data=image)
        img = await self.db.create_image(blob.to_image(user_id))
        return img

    async def retrieve_img(self, id: str) -> Image:
        return await self.db.get_image(id)

    async def delete_img(self, id: str, updater: UserAuthInfo):
        img = await self.retrieve_img(id)
        await authorize_operation(updater, img.uploader_user_id)
        await self.blob.delete_blob(img)
        await self.db.delete_image(id)
