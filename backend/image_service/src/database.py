from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
)
from shared.simple_logging import logger

from src.models import Image


class ImageDB:
    def __init__(self, container: ContainerProxy):
        self.container = container

    async def create_image(self, new_image: Image) -> Image:
        try:
            logger.debug(f"Trying to create image: {new_image.model_dump()}")
            item: CosmosDict = await self.container.create_item(
                body=new_image.model_dump(mode="json")
            )
            created_image = Image.model_validate(item, extra="ignore")
            logger.debug(f"Successfully created image: {created_image.model_dump()}")
            return created_image
        except exceptions.ResourceExistsError:
            logger.warning(
                f"Error while creating image: {new_image.model_dump()}, already exists"
            )
            raise RecordAlreadyExistsError()
        except Exception as e:
            logger.error(
                f"Error while creating image: {new_image.model_dump()}, unexpected: {e}"
            )
            raise RecordCreationError()

    async def get_image(self, image_id: str) -> Image:
        try:
            logger.debug(f"Trying to get data from image ID '{image_id}'")
            item: CosmosDict = await self.container.read_item(
                item=image_id, partition_key=image_id
            )
            img = Image.model_validate(item, extra="ignore")
            logger.debug(f"Got from image ID '{image_id}': {img.model_dump()}")
            return img
        except exceptions.ResourceNotFoundError:
            logger.warning(
                f"Error while getting data from image ID '{image_id}', not found"
            )
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(
                f"Error while getting url from image ID '{image_id}', unexpected: {e}"
            )
            raise GeneralQueryError()

    async def delete_image(self, image_id: str) -> None:
        try:
            logger.debug(f"Trying to delete image with ID '{image_id}'")
            await self.container.delete_item(item=image_id, partition_key=image_id)
            logger.debug(f"Successfully deleted image with ID '{image_id}'")
        except exceptions.CosmosResourceNotFoundError:
            logger.warning(f"Error while deleting image '{image_id}', not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(f"Error while deleting image '{image_id}', unexpected: {e}")
            raise RecordDeletionError()
