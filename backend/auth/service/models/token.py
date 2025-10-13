from pydantic import BaseModel


class Token(BaseModel):
    sub: str
    exp: int
    token_type: str
