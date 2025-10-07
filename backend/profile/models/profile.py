from pydantic import BaseModel, UUID4, Field
from typing import Optional, List
from datetime import datetime

class Profile(BaseModel):
    user_id: UUID4
    created_at: datetime
    updated_at: datetime
    equipped_badges: List[UUID4]
    equipped_analytics: List[UUID4]

class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    avatar: Optional[int] = None
    analytics_shown: Optional[int] = None
    equipped_badges: Optional[List[UUID4]] = None
    equipped_analytics: Optional[List[UUID4]] = None

class ProfileInDB(Profile):
    unlocked_badges: List[UUID4] = Field(default_factory=list)
    equipped_badges: List[UUID4] = Field(default_factory=list, max_items=4) # type: ignore

    unlocked_analytics: List[UUID4] = Field(default_factory=list)
    equipped_analytics: List[UUID4] = Field(default_factory=list, max_items=4) # type: ignore
