from datetime import datetime
from enum import StrEnum, auto

from pydantic import BaseModel
from shared.db import generate_id, now_timestamp


class ContentType(StrEnum):
    POST = auto()
    COMMENT = auto()


class Comment(BaseModel):
    id: str
    creator_id: str
    text: str
    liker_ids: list[str] = []  # ids of users that liked the image
    parent_content_id: str
    parent_content_type: ContentType
    created_at: datetime
    updated_at: datetime


class CommentCreate(BaseModel):
    creator_id: str
    text: str
    parent_content_id: str
    parent_content_type: ContentType

    def to_comment(self) -> """Comment""":
        return Comment(
            id=generate_id(),
            creator_id=self.creator_id,
            text=self.text,
            parent_content_id=self.parent_content_id,
            parent_content_type=self.parent_content_type,
            created_at=now_timestamp(),
            updated_at=now_timestamp(),
        )


class LikerUpdate(BaseModel):
    id: str
    like: bool


class CommentUpdate(BaseModel):
    id: str
    text: str | None = None
    liker: LikerUpdate | None = None  # id of liker, true if liking, false if unliking
