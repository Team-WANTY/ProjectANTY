from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from shared.models.users import UserBase, UserCreate, UserInDB
from users_service.exceptions import (
    UserCreationError,
    UserDeletionError,
    UserEmailExistsError,
    UserExistsError,
    UserGeneralQueryError,
    UserInterserviceError,
    UserNotFoundError,
    UserTokenError,
    UserUpdateError,
    UserUsernameExistsError,
)
from users_service.main import get_users_service, settings
from users_service.models import UserUpdate
from users_service.service import UsersService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    users_service: UsersService = Depends(get_users_service),
) -> UserInDB:
    """Get current authenticated and active user from JWT token"""
    try:
        user_id = await users_service.verify_token(token)
    except UserTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired token"
        )
    except UserInterserviceError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error",
        )
    try:
        user_in_db = await users_service.get_user_by_id(str(user_id))
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Current user not found"
        )
    except UserGeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal query error",
        )

    # Check if user is active
    if not user_in_db.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User is set to inactive"
        )

    return user_in_db


users_router = APIRouter(prefix="/users", tags=["users"])


@users_router.get("/me", response_model=UserBase)
async def read_users_me(current_user: UserInDB = Depends(get_current_user)):
    """Get current user"""
    return current_user.to_base()


@users_router.get("/{user_id}", response_model=UserBase)
async def get_user(
    user_id: str, users_service: UsersService = Depends(get_users_service)
):
    """Get user by ID"""
    try:
        user = await users_service.get_user_by_id(user_id)
        return user.to_base()
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    except UserGeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal query error",
        )


@users_router.patch("/", response_model=UserBase)
async def update_user(
    user_update: UserUpdate,
    current_user: UserInDB = Depends(get_current_user),
    users_service: UsersService = Depends(get_users_service),
):
    """Update user (own profile or superuser can update any)"""
    if current_user.id != user_update.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    try:
        return await users_service.update_user(
            user_update
        )  # since perms needed, return full DB record
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    except UserUpdateError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error",
        )
    except UserGeneralQueryError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error",
        )


@users_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_user: UserInDB = Depends(get_current_user),
    users_service: UsersService = Depends(get_users_service),
):
    """Delete user (superuser only)"""
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions"
        )
    try:
        await users_service.delete_user(
            user_id
        )  # since perms needed return full DB record
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    except UserDeletionError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal deletion Error",
        )


@users_router.post("/interservice/create_user", status_code=status.HTTP_201_CREATED)
async def create_user(
    user_create: UserCreate,
    request: Request,
    users_service: UsersService = Depends(get_users_service),
):
    internal_key = request.headers.get("X-Internal-Key")
    if internal_key != settings.interservice_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    try:
        user_in_db = await users_service.create_user(user_create)
    except UserUsernameExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail={"exists": "username"}
        )
    except UserEmailExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail={"exists": "email"}
        )
    except UserExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail={"exists": "user"}
        )
    except UserCreationError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error"
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error"
        )
    return user_in_db.model_dump()
