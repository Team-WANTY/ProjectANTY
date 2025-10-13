from datetime import UTC, datetime
from uuid import uuid4

from pydantic import BaseModel, EmailStr

from service.security.password import get_password_hash


class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    plain_text_password: str


class UserUpdate(BaseModel):
    target_id: str
    email: EmailStr | None = None
    username: str | None = None

class UserInDB(UserBase):
    id: str
    email: EmailStr
    username: str
    created_at: int
    updated_at: int

    @classmethod
    def from_user_create(cls, user_create: UserCreate) -> """UserInDB""":
        now: datetime = datetime.now(UTC)
        return cls(
            email=user_create.email,
            username=user_create.username,
            id=str(uuid4()),
            created_at=int(now.timestamp()),
            updated_at=int(now.timestamp()),
        )

    def to_user(self) -> User:
        data = self.model_dump()
        data.pop("hashed_password", None)
        return User.model_validate(data, strict=True, extra="ignore")
