from datetime import datetime

from pydantic import UUID4, BaseModel, HttpUrl


class Badge(BaseModel):
    id: UUID4
    title: str
    description: str
    image: HttpUrl
    awarded_on: datetime | None = None  # For user-specific display
