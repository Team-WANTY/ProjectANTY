from datetime import datetime
from typing import Optional

from pydantic import UUID4, BaseModel, HttpUrl


class Badge(BaseModel):
    id: UUID4
    title: str
    description: str
    image: HttpUrl
    awarded_on: Optional[datetime] = None  # For user-specific display
