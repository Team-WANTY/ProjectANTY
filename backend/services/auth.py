from backend.db.user import UsersDB
from backend.models.user import User, UserInDB
from pydantic import EmailStr
from backend.exceptions.auth import AuthError, AuthIncorrectPasswordError
from backend.security.password import verify_password


class AuthService:
    def __init__(self, user_db:UsersDB):
        self.user_db = user_db

    async def authenticate_user_by_username(self, username: str, password: str) -> User:
        """Authenticate user with username and password"""
        user_in_db = await self.user_db.get_user_by_username(username)
        if not isinstance(user_in_db, UserInDB):
            raise AuthError(
                "Return from UsersDB.get_user_by_username not of type UserInDB"
            )
        if not verify_password(password, user_in_db.hashed_password):
            raise AuthIncorrectPasswordError()
        return user_in_db.to_user()

    async def authenticate_user_by_email(self, email: EmailStr, password: str) -> User:
        """Authenticate user with username and password"""
        user_in_db = await self.user_db.get_user_by_email(email)
        if not isinstance(user_in_db, UserInDB):
            raise AuthError(
                "Return from UsersDB.get_user_by_username not of type UserInDB"
            )
        if not verify_password(password, user_in_db.hashed_password):
            raise AuthIncorrectPasswordError()
        return user_in_db.to_user()

