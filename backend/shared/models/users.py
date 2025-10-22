from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Info passed usually out of program, "base" due to containing minimum info and no sensitive data"""

    id: str
    is_active: bool

class UserInDB(UserBase):
    username: str
    email: EmailStr
    hashed_password: str
    created_at: int
    updated_at: int
    is_superuser: bool

    def to_base(self):
        return UserBase.model_validate(self.model_dump(), extra="ignore")
