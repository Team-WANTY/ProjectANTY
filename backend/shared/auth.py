from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from httpx import AsyncClient

from exceptions.auth import AuthError
from models.auth import UserAuthInfo
from settings import settings
from simple_logging import logger

oauth2_scheme = OAuth2PasswordBearer(f"{settings.AUTH_EXTERNAL_URL}/login")


async def get_auth_info_from_service(token: str) -> UserAuthInfo:
    """Call the Auth microservice to validate the token and return user info."""
    async with AsyncClient() as client:
        logger.debug(f"Sending request to auth service to verify token '{token}'")
        response = await client.get(
            f"{settings.AUTH_SERVICE_URL}/verify/{token}",
            headers={"X-Interservice-Key": settings.INTERSERVICE_KEY},
        )
    if response.status_code != 200:
        logger.debug(
            f"Response from auth service on verifying token {token} was not 200: {response.status_code} | {response.text}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    data = response.json()
    logger.debug(f"Returning UserAuthInfo from token '{token}'")
    return UserAuthInfo.model_validate(data, extra="ignore")


async def get_current_user_auth(
    token: str = Depends(oauth2_scheme),
) -> UserAuthInfo:
    """FastAPI dependency to verify token and get current user."""
    user_auth_info = await get_auth_info_from_service(token)

    logger.debug(
        f"Checking if returned current user with ID '{user_auth_info.id}' is active"
    )
    if not user_auth_info.is_active:
        logger.warning(f"Current user with ID '{user_auth_info.id}' is not active")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
        )

    logger.debug(f"Returning current user: {user_auth_info.model_dump()}")
    return user_auth_info


async def authorize_operation(operator: UserAuthInfo, operatee_id: str):
    """Is 'operator' authorized to perform protected actions on 'operatee'?"""
    logger.debug(
        f"Checking if operator ({operator.id}) is authorized to perform actions on operatee ({operatee_id})"
    )
    if not operator.is_superuser and operator.id != operatee_id:
        logger.warning(
            f"Operator ({operator.id}) is not authorized for operatee ({operatee_id})"
        )
        raise AuthError()
