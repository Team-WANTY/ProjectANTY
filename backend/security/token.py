from datetime import datetime, timedelta, timezone

import jwt
from backend.config import settings
from backend.models.token import Token
from backend.exceptions.token import JWTTokenError, JWTTokenExpiredError


def create_access_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expiration_minutes
    )
    token = Token(sub=user_id, exp=int(expiration.timestamp()), token_type="access")
    payload = token.model_dump()
    return jwt.encode(
        payload=payload,
        key=settings.token_private_key,
        algorithm=settings.token_algorithm,
    )


def create_refresh_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expiration_days
    )
    token = Token(sub=user_id, exp=int(expiration.timestamp()), token_type="refresh")
    payload = token.model_dump()
    return jwt.encode(
        payload=payload,
        key=settings.token_private_key,
        algorithm=settings.token_algorithm,
    )


def decode_token(token_str: str) -> Token:
    try:
        payload: dict = jwt.decode(
            jwt=token_str,
            key=settings.token_public_key,
            algorithms=[settings.token_algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise JWTTokenExpiredError()
    token = Token.model_validate(payload, strict=True, extra="ignore")
    if not isinstance(token, Token):
        raise JWTTokenError()

    now = int(datetime.now(timezone.utc).timestamp())
    if token.exp <= now:
        raise JWTTokenExpiredError()

    return token
