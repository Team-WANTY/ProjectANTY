from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm, OAU

from .models import AuthBase, AuthCreate
from .service import AuthService
from .main import get_auth_service
from .exceptions import AuthExistsError, AuthError, AuthCreationError, AuthCreationInvalidPasswordError, AuthIncorrectPasswordError

auth_router = APIRouter(prefix="/auth", tags=["authentication"])


@auth_router.post("/register", response_model=AuthBase)
async def register(
    response: Response,
    auth_create: AuthCreate,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        created_auth = await auth_service.create_auth(auth_create)
        response.status_code = status.HTTP_201_CREATED
        return created_auth
    except AuthExistsError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User's authentication information already exists"
        )
    except AuthCreationInvalidPasswordError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Password did not meet requirements"
        )
    except AuthCreationError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal creation error",
        )


@auth_router.post("/login")
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(), #accepts username or email in 'username' field
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        user_id = "" #TODO resolve username/email with user service, get back user_id
        auth = await auth_service.authenticate_user(
            user_id, form_data.password
        )
    except AuthIncorrectPasswordError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials"
        )
    except AuthError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal auth error",
        )
    if not isinstance(auth, AuthBase):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal auth error",
        )

    if not auth.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User is set to inactive"
        )

    response.set_cookie(
        key="refresh_token",
        value=create_refresh_token(user.id),
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.refresh_token_expiration_days * 24 * 60 * 60,
    )

    return {"access_token": create_access_token(user.id)}


@auth_router.post("/refresh")
async def refresh_token(
    request: Request, auth_service: UsersService = Depends(get_auth_service)
):
    refresh_token = request.cookies.get("refresh_token")
    print("COOKIES!:", request.cookies)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Server received no refresh token",
        )

    decoded_token = decode_token(refresh_token)
    if decoded_token.token_type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Server received invalid token type",
        )

    user = await auth_service.get_user_by_id(str(decoded_token.sub))
    if not isinstance(user, User):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal auth error",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User is set to inactive"
        )

    return {"access_token": create_access_token(user.id)}
