from pydantic import BaseModel


class Message(BaseModel):
    """Message type."""
    message: str
