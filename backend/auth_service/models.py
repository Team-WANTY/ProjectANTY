from pydantic import BaseModel, EmailStr

from backend.shared.models.users import UserBase, UserInDB

"""Slightly different from standard set of User models, only what is needed for auth-related read & updates"""

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
