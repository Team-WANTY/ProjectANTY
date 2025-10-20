from datetime import UTC, datetime
from uuid import uuid4

from pwdlib import PasswordHash  # ty: ignore
from pydantic import BaseModel, EmailStr


def generate_id() -> str:
    """Generate a unique ID for records."""
    return uuid4().hex

pwd_hasher = PasswordHash.recommended()

class UserBase(BaseModel):
    """Info passed usually out of program, "base" due to containing minimum info and no sensitive data"""

    id: str
    is_active: bool


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    plain_text_password: str


class UserInDB(UserBase):
    username: str
    email: EmailStr
    hashed_password: str
    created_at: int
    updated_at: int
    is_superuser: bool

    @classmethod
    def from_user_create(cls, user_create: UserCreate) -> """UserInDB""":
        return cls(
            id=generate_id(),
            username=user_create.username,
            email=user_create.email,
            hashed_password=pwd_hasher.hash(user_create.plain_text_password),
            created_at=int(datetime.now(UTC).timestamp()),
            updated_at=int(datetime.now(UTC).timestamp()),
            is_active=True,  # assume the user is being created this shouldn't be inactive
            is_superuser=False,  # assume created user is not admin unless set
        )

    def to_base(self):
        return UserBase.model_validate(self.model_dump(), strict=True, extra="ignore")
