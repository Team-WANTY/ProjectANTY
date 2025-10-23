from pydantic import EmailStr

from .users import UserBase, UserInDB


class UserAuthInfo(UserBase):
    username: str
    email: EmailStr
    hashed_password: str
    updated_at: int
    is_superuser: bool

    def to_base(self):
        return UserBase.model_validate(self.model_dump(), extra="ignore")

    @staticmethod
    def from_in_db(user_in_db: UserInDB) -> """UserAuthInfo""":
        return UserAuthInfo.model_validate(
            user_in_db.model_dump(), extra="ignore"
        )
