from pydantic import BaseModel, UUID4

class Token(BaseModel):
    id: UUID4
    expiration: int
    token_type: str