from pydantic import BaseModel


class UserAuthUpdate(BaseModel):
    id: str
    plain_text_password: str | None = None

    # RESTRICTED
    is_active: bool | None = None
    is_superuser: bool | None = None


class PasswordResetRequest(BaseModel):
    token: str
    new_password: str
