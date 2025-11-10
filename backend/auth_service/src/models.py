from pwdlib import PasswordHash
from pydantic import BaseModel, EmailStr
from shared.db import generate_id, now_timestamp
from shared.models.users import UserInDB

"""Slightly different from standard set of User models, only what is needed for auth-related read & updates"""

pwd_hasher = PasswordHash.recommended()


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    plain_text_password: str

    def to_user_in_db(self) -> """UserInDB""":
        return UserInDB(
            id=generate_id(),
            username=self.username,
            email=self.email,
            created_at=now_timestamp(),
            updated_at=now_timestamp(),
            is_active=True,  # assume the user is being created this shouldn't be inactive
        )


class UserAuthUpdate(BaseModel):
    id: str
    plain_text_password: str | None = None

    # RESTRICTED
    is_active: bool | None = None
    is_superuser: bool | None = None


class PasswordResetRequest(BaseModel):
    token: str
    new_password: str
