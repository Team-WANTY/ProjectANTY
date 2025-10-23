from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from httpx import AsyncClient

from exceptions.auth import AuthError
from models.auth import UserAuthInfo
from models.users import UserInDB
from settings import settings

oauth2_scheme = OAuth2PasswordBearer(f"{settings.AUTH_SERVICE_URL}/login")


async def get_auth_info_from_service(token: str) -> UserAuthInfo:
    """Call the Auth microservice to validate the token and return user info."""
    async with AsyncClient() as client:
        response = await client.get(
            f"{settings.AUTH_SERVICE_URL}/verify/{token}",
            headers={"X-Interservice-Key":settings.INTERSERVICE_KEY},
        )
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    data = response.json()
    return UserAuthInfo.model_validate(data, extra="ignore")


async def get_current_user_auth(
    token: str = Depends(oauth2_scheme),
) -> UserAuthInfo:
    """FastAPI dependency to verify token and get current user."""
    user_auth_info = await get_auth_info_from_service(token)

    if not user_auth_info.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
        )

    return user_auth_info

async def authorize_operation(operator:UserAuthInfo|UserInDB, operatee_id:str):
    """Is 'operator' authorized to perform protected actions on 'operatee'?"""
    if not operator.is_superuser and operator.id != operatee_id:
        raise AuthError()

