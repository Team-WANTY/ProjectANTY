from pydantic import BaseModel, Field
from shared.db import now_timestamp


class Profile(BaseModel):
    id: str
    bio: str = ""
    avatar_image_id: str = "0"
    created_at: int = now_timestamp()
    updated_at: int = now_timestamp()
    unlocked_badges: list[str] = Field(default_factory=list)
    unlocked_analytics: list[str] = Field(default_factory=list)
    equipped_badges: list[str] = Field(default_factory=list, max_items=4)
    equipped_analytics: list[str] = Field(default_factory=list, max_items=4)


class ProfileUpdate(BaseModel):
    user_id: str
    bio: str | None = None
    avatar_image_id: str | None = None
    equipped_badges: list[str] | None = None
    equipped_analytics: list[str] | None = None
    unlocked_badges: list[str] | None = None
    unlocked_analytics: list[str] | None = None
