from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    """Info passed usually out of program, "base" due to containing minimum info and no sensitive data"""

    id: str

class UserInDB(UserBase):
    username: str
    email: EmailStr
    created_at: datetime
    updated_at: datetime
