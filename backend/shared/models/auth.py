from datetime import datetime

from pydantic import EmailStr

from .users import UserBase


class UserAuthInfo(UserBase):
    username: str
    email: EmailStr
    hashed_password: str
    updated_at: datetime
    is_superuser: bool
