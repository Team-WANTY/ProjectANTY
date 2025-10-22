from datetime import UTC, datetime
from uuid import uuid4

from pwdlib import PasswordHash
from pydantic import BaseModel, EmailStr
from shared.models.users import UserBase, UserInDB

"""Slightly different from standard set of User models, only what is needed for auth-related read & updates"""

pwd_hasher= PasswordHash.recommended()

def generate_id() -> str:
    """Generate a unique ID for records."""
    return uuid4().hex

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    plain_text_password: str

    def to_user_in_db(self) -> """UserInDB""":
        return UserInDB(
            id=generate_id(),
            username=self.username,
            email=self.email,
            hashed_password=pwd_hasher.hash(self.plain_text_password),
            created_at=int(datetime.now(UTC).timestamp()),
            updated_at=int(datetime.now(UTC).timestamp()),
            is_active=True,  # assume the user is being created this shouldn't be inactive
            is_superuser=False,  # assume created user is not admin unless set
        )


class UserAuthInfo(UserBase):
    username: str
    email: EmailStr
    hashed_password: str
    updated_at: int
    is_superuser: bool

    def to_base(self):
        return UserBase.model_validate(self.model_dump(), strict=True, extra="ignore")

    @staticmethod
    def from_in_db(user_in_db: UserInDB) -> """UserAuthInfo""":
        return UserAuthInfo.model_validate(
            user_in_db.model_dump(), strict=True, extra="ignore"
        )


class UserAuthUpdate(BaseModel):
    id: str
    plain_text_password: str | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None
