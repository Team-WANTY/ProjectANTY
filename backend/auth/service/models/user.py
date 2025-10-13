from datetime import UTC, datetime
from uuid import uuid4

from pydantic import BaseModel, EmailStr

from service.security.password import get_password_hash


class UserBase(BaseModel):
    email: EmailStr
    username: str


class User(UserBase):
    id: str
    created_at: int
    updated_at: int
    is_superuser: bool = False
    is_active: bool = True


class UserCreate(UserBase):
    plain_text_password: str


class UserUpdate(BaseModel):
    id: str
    email: EmailStr | None = None
    username: str | None = None
    full_name: str | None = None
    plain_text_password: str | None = None
    is_superuser: bool | None = None
    is_active: bool | None = None


class UserInDB(UserBase):
    id: str
    hashed_password: str
    created_at: int
    updated_at: int
    is_superuser: bool = False
    is_active: bool = True

    @classmethod
    def from_user_create(cls, user_create: UserCreate) -> """UserInDB""":
        now: datetime = datetime.now(UTC)
        return cls(
            email=user_create.email,
            username=user_create.username,
            id=str(uuid4()),
            hashed_password=get_password_hash(user_create.plain_text_password),
            created_at=int(now.timestamp()),
            updated_at=int(now.timestamp()),
        )

    def to_user(self) -> User:
        data = self.model_dump()
        data.pop("hashed_password", None)
        return User.model_validate(data, strict=True, extra="ignore")
