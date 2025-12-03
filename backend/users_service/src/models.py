from pwdlib import PasswordHash
from pydantic import BaseModel, EmailStr
from shared.db import generate_id, now_timestamp
from shared.models.users import UserInDB

pwd_hasher = PasswordHash.recommended()


class UserUpdate(BaseModel):
    id: str
    username: str | None = None
    email: EmailStr | None = None


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    plain_text_password: str

    def to_user_in_db(self) -> """UserInDB""":
        return UserInDB(
            id=generate_id(),
            username=self.username,
            hashed_password=pwd_hasher.hash(self.plain_text_password),
            email=self.email,
            created_at=now_timestamp(),
            updated_at=now_timestamp(),
            is_active=True,  # assume the user is being created this shouldn't be inactive
            is_superuser=False,  # assume user being created is not a superuser
        )
