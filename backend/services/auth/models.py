from datetime import UTC, datetime
from uuid import uuid4

from pydantic import BaseModel, Field

from .service import AuthService


def generate_id() -> str:
    """Generate a unique ID for auth records."""
    return f"auth_{uuid4().hex}"


class AuthBase(BaseModel):
    user_id: str
    updated_at: int | None = None
    is_superuser: bool
    is_active: bool


class AuthCreate(AuthBase):
    plain_text_password: str


class AuthUpdate(BaseModel):
    target_id: str
    plain_text_password: str | None


class AuthInDB(AuthBase):
    id: str = Field(default_factory=generate_id)
    hashed_password: str

    @classmethod
    def from_auth_create(cls, auth_create: AuthCreate) -> """AuthInDB""":
        return cls(
            user_id=auth_create.user_id,
            hashed_password=AuthService.get_password_hash(
                auth_create.plain_text_password
            ),
            updated_at=int(datetime.now(UTC).timestamp()),
        )
