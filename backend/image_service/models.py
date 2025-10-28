from pydantic import BaseModel


class Image(BaseModel):
    id: str
    url: str
    uploader_user_id: str


class ImageInDB(Image):
    container_name: str  # The blob container (e.g., "avatars")

    created_at: int
    updated_at: int
