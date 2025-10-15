from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import EmailStr, ValidationError

from ..shared.user_models import UserCreate
from .models import UserAuthInfo, UserBase
from .main import get_auth_service, settings
from .service import AuthService
from .exceptions import AuthInterserviceError, AuthIncorrectPasswordError, TokenExpiredError

auth_router = APIRouter(prefix="/auth", tags=["authentication"])


@auth_router.post("/register", response_model=UserBase, status_code=status.HTTP_201_CREATED)
async def register(
    response: Response,
    user_create: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        created_user = await auth_service.register_user(user_create)
        response.status_code = status.HTTP_201_CREATED
        return created_user
    except :
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User taken"
        )
    except :
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email taken"
        )
    except :
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Password did not meet requirements"
        )
    except AuthInterserviceError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Interservice error"
        )
    except Exception:
        #TODO add logging
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error",
        )


@auth_router.post("/login", status_code=status.HTTP_200_OK)
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(), #accepts username or email in 'username' field
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        try:
            email = EmailStr._validate(form_data.username)
            user_auth_info = await auth_service.authenticate_user_by_email(
                email, form_data.password
            )
        except ValidationError:
            username = form_data.username
            user_auth_info = await auth_service.authenticate_user_by_username(
                username, form_data.password
            )
    except AuthIncorrectPasswordError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials"
        )
    except AuthInterserviceError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Interservice error",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error",
        )

    if not user_auth_info.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User is set to inactive"
        )

    response.set_cookie(
        key="refresh_token",
        value= await auth_service.create_refresh_token(user_auth_info.id),
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.refresh_token_expiration_days * 24 * 60 * 60,
    )

    return {"access_token": await auth_service.create_access_token(user_auth_info.id),"token_type":"bearer"}

@auth_router.post("/verify", status_code=status.HTTP_200_OK)
async def verify_token(token: str, auth_service: AuthService = Depends(get_auth_service),
):
    try:
        decoded_token = await auth_service.decode_token(token)
        if decoded_token.token_type != "access":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token type")
        return decoded_token.model_dump()
    except HTTPException as e:
        raise e
    except TokenExpiredError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired token")
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")

@auth_router.post("/refresh", status_code=status.HTTP_200_OK)
async def refresh_token(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service)
):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token present",
        )

    try:
        decoded_token = await auth_service.decode_token(refresh_token)
        if decoded_token.token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Server received invalid token type",
            )
    except TokenExpiredError:
        raise HTTPException(
            status_code = status.HTTP_401_UNAUTHORIZED,
            detail="Expired token"
        )

    user = await auth_service.get_user_by_id(decoded_token.sub)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is set to inactive"
        )

    return {"access_token": await auth_service.create_access_token(user.id), "token_type":"bearer"}

@auth_router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    #TODO invalidate refresh token if stored in DB
    response.delete_cookie(key="refresh_token", httponly=True, secure=True, samesite="lax")
