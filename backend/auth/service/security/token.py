from datetime import UTC, datetime, timedelta

import jwt

from service.config import settings
from service.exceptions.token import JWTTokenError, JWTTokenExpiredError
from service.models.token import Token


def create_access_token(user_id: str) -> str:
    expiration = datetime.now(UTC) + timedelta(
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
    expiration = datetime.now(UTC) + timedelta(
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

    now = int(datetime.now(UTC).timestamp())
    if token.exp <= now:
        raise JWTTokenExpiredError()

    return token
