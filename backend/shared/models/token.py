from datetime import datetime

from pydantic import BaseModel


class Token(BaseModel):
    sub: str
    exp: datetime
    token_type: str
