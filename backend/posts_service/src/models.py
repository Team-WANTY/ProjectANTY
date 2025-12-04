from datetime import datetime

from pydantic import BaseModel
from shared.db import generate_id, now_timestamp


class Post(BaseModel):
    id: str
    creator_id: str
    text: str
    liker_ids: list[str] = []  # ids of users that liked the image
    created_at: datetime
    updated_at: datetime
    image_ids: list[str] = []


class PostCreate(BaseModel):
    creator_id: str
    text: str
    image_ids: list[str] = []

    def to_post(self) -> """Post""":
        return Post(
            id=generate_id(),
            creator_id=self.creator_id,
            text=self.text,
            liker_ids=[],
            image_ids=self.image_ids,
            created_at=now_timestamp(),
            updated_at=now_timestamp(),
        )


class LikerUpdate(BaseModel):
    id: str
    like: bool


class PostUpdate(BaseModel):
    id: str
    text: str | None = None
    liker: LikerUpdate | None = None  # id of liker, true if liking, false if unliking
    image_ids: list[str] | None = None
