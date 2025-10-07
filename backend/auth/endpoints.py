from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from models.user import User, UserCreate, UserUpdate
from service import user_service
from config import settings
from secrets_dependencies import create_access_token, decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Get current authenticated and active user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    decoded_token = decode_token(token)
    if decode_token is None:
        raise credentials_exception
    
    user = user_service.get_user(str(decoded_token.id))
    if user is None:
        raise credentials_exception
        
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive"
        )
    
    return user

auth_router = APIRouter(prefix="/auth", tags=["authentication"])

@auth_router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(user_create: UserCreate):
    """Register a new user"""
    try:
        return user_service.create_user(user_create)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@auth_router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and get access token"""
    user = user_service.authenticate_user_by_username(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return create_access_token(user.id)

# User management routes
user_router = APIRouter(prefix="/users", tags=["users"])

@user_router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user"""
    return current_user

@user_router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: str,
):
    """Get user by ID"""
    user = user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@user_router.patch("/{user_id}", response_model=User)
async def update_user(
    target_user: User,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user (own profile or superuser can update any)"""
    if current_user.id != target_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    try:
        return user_service.update_user(target_user, user_update)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@user_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    target_user: User,
    current_user: User = Depends(get_current_user)
):
    """Delete user (superuser only)"""
    if current_user.id != target_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    try:
        user_service.delete_user(target_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

# @user_router.get("/", response_model=list[User])
# async def list_users(
#     skip: int = 0,
#     limit: int = 100,
#     current_user: User = Depends(get_current_superuser)
# ):
#     """List all users (superuser only)"""
#     if current_user.is_superuser:
#         return user_service.list_users(skip, limit)