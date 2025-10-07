from pydantic import BaseModel, UUID4, HttpUrl
from datetime import datetime
from typing import Optional

class Badge(BaseModel):
    id: UUID4
    title: str
    description: str
    image: HttpUrl
    awarded_on: Optional[datetime] = None  # For user-specific display