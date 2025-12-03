from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from httpx import AsyncClient

from exceptions.auth import AuthError
from models.users import UserInDB
from settings import settings
from simple_logging import logger

oauth2_scheme = OAuth2PasswordBearer(f"{settings.AUTH_EXTERNAL_URL}/login")


async def get_user_id_from_auth_service(token: str):
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
    return response.json()["user_id"]


async def get_user_from_id(user_id: str):
    async with AsyncClient() as client:
        logger.debug(
            f"Sending request to users service to find user with ID '{user_id}'"
        )
        response = await client.get(
            f"{settings.USERS_SERVICE_URL}/id/{user_id}",
            headers={"X-Interservice-Key": settings.INTERSERVICE_KEY},
        )
    if response.status_code != 200:
        logger.debug(
            f"Response from users service on getting user with ID '{user_id}' was not 200: {response.status_code} | {response.text}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    logger.debug(f"Returning UserInDB from ID '{user_id}'")
    data = response.json()
    return UserInDB.model_validate(data, extra="ignore")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
) -> UserInDB:
    """FastAPI dependency to verify token and get current user."""
    user_id = await get_user_id_from_auth_service(token)
    user_in_db = await get_user_from_id(user_id)

    logger.debug(
        f"Checking if returned current user with ID '{user_in_db.id}' is active"
    )
    if not user_in_db.is_active:
        logger.warning(f"Current user with ID '{user_in_db.id}' is not active")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive",
        )

    logger.debug(f"Returning current user: {user_in_db.model_dump()}")
    return user_in_db


async def authorize_operation(operator: UserInDB, operatee_id: str):
    """Is 'operator' authorized to perform protected actions on 'operatee'?"""
    logger.debug(
        f"Checking if operator ({operator.id}) is authorized to perform actions on operatee ({operatee_id})"
    )
    if not operator.is_superuser and operator.id != operatee_id:
        logger.warning(
            f"Operator ({operator.id}) is not authorized for operatee ({operatee_id})"
        )
        raise AuthError()
