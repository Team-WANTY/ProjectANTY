from backend.shared.db_funcs import generate_id, now_timestamp
from pydantic import BaseModel


class Image(BaseModel):
    id:str
    url:str
    uploader_user_id:str


class ImageInDB(Image):
    container_name: str  # The blob container (e.g., "avatars")

    created_at:int
    updated_at:int
