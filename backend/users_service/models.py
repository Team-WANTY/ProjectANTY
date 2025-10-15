from pydantic import BaseModel, EmailStr


class UserUpdate(BaseModel):
    id: str
    username: str | None = None
    email: EmailStr | None = None
