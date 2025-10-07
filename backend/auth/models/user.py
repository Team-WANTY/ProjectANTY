from pydantic import BaseModel, EmailStr, SecretStr, UUID4
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4
from secrets_dependencies import get_password_hash

class UserBase(BaseModel):
    email: EmailStr
    username: str
    is_superuser: bool = False
    is_active: bool = True

class UserCreate(UserBase):
    plain_text_password: SecretStr

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    plain_text_password: Optional[SecretStr] = None
    is_superuser: Optional[bool] = None
    is_active: Optional[bool] = None

class UserInDB(UserBase):
    id: UUID4
    hashed_password: SecretStr
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def from_user_create(user_create:UserCreate):
        now = datetime.now(timezone.utc)
        return UserInDB(
            email=user_create.email,
            username=user_create.username,
            id=uuid4(),
            hashed_password=SecretStr(secret_value=get_password_hash(user_create.plain_text_password.get_secret_value())),
            created_at=now,
            updated_at=now)

    def to_user(self):
        return User(**{k:v for k,v in self.model_dump().items() if k != "hashed_password"})

class User(UserBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime