from datetime import datetime

from pydantic import UUID4, BaseModel, Field


class Profile(BaseModel):
    user_id: UUID4
    created_at: datetime
    updated_at: datetime
    equipped_badges: list[UUID4]
    equipped_analytics: list[UUID4]


class ProfileUpdate(BaseModel):
    bio: str | None = None
    avatar: int | None = None
    analytics_shown: int | None = None
    equipped_badges: list[UUID4] | None = None
    equipped_analytics: list[UUID4] | None = None


class ProfileInDB(Profile):
    unlocked_badges: list[UUID4] = Field(default_factory=list)
    equipped_badges: list[UUID4] = Field(default_factory=list, max_items=4)  # type: ignore

    unlocked_analytics: list[UUID4] = Field(default_factory=list)
    equipped_analytics: list[UUID4] = Field(default_factory=list, max_items=4)  # type: ignore
