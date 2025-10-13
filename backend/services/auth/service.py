from passlib.hash import argon2  # ty: ignore
from pydantic import EmailStr

from .database import AuthDB
from .exceptions import AuthCreationInvalidPasswordError, AuthGeneralQueryError, AuthIncorrectPasswordError
from .models import AuthBase, AuthCreate


class AuthService:
    def __init__(self, auth_db: AuthDB):
        self.db = auth_db

    async def create_auth(
        self, auth_create:AuthCreate
    ) -> AuthBase:
        try:
            pass#TODO check plain text password against requirements
        except Exception:
            raise AuthCreationInvalidPasswordError()
        auth_in_db = await self.db.create_auth(auth_create)
        return AuthBase.model_validate(auth_in_db.model_dump(), strict=True, extra="ignore")


    async def authenticate_user(
        self, user_id: str, password: str
    ) -> AuthBase:
        auth_in_db = await self.db.get_auth_by_user_id(user_id)
        if not isinstance(auth_in_db, auth_in_db):
            raise AuthGeneralQueryError(
                "Return from UsersDB.get_user_by_username not of type UserInDB"
            )
        if not self.verify_password(password, auth_in_db.hashed_password):
            raise AuthIncorrectPasswordError()
        return AuthBase.model_validate(
            auth_in_db.model_dump(), strict=True, extra="ignore"
        )

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return argon2.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password"""
        return argon2.hash(password)
