from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from shared.exceptions.token import TokenError, TokenExpiredError
from shared.models.token import Token

from src.service import AuthService
from src.settings import settings


@pytest.mark.asyncio
class TestTokenOperations:
    async def test_create_access_token(self):
        user_id = str(uuid4())
        token_str = await AuthService.create_access_token(user_id)  # <-- await

        assert isinstance(token_str, str)
        assert len(token_str) > 0

        payload = jwt.decode(
            jwt=token_str,
            key=settings.token_public_key,
            algorithms=[settings.token_algorithm],
        )
        assert payload["token_type"] == "access"
        assert payload["sub"] == str(user_id)

    async def test_create_refresh_token(self):
        user_id = str(uuid4())
        token_str = await AuthService.create_refresh_token(user_id)  # <-- await

        assert isinstance(token_str, str)
        assert len(token_str) > 0

        payload = jwt.decode(
            jwt=token_str,
            key=settings.token_public_key,
            algorithms=[settings.token_algorithm],
        )
        assert payload["token_type"] == "refresh"
        assert payload["sub"] == str(user_id)

    async def test_decode_valid_token(self):
        user_id = str(uuid4())
        token_str = await AuthService.create_access_token(user_id)

        decoded = await AuthService.decode_token(token_str)  # <-- await

        assert isinstance(decoded, Token)
        assert decoded.sub == user_id
        assert decoded.token_type == "access"

    async def test_decode_expired_token(self):
        user_id = str(uuid4())
        expiration = datetime.now(UTC) - timedelta(minutes=1)

        token = Token(sub=user_id, exp=int(expiration.timestamp()), token_type="access")
        payload = token.model_dump()
        expired_token = jwt.encode(
            payload=payload,
            key=settings.token_private_key,
            algorithm=settings.token_algorithm,
        )

        with pytest.raises(TokenExpiredError):
            await AuthService.decode_token(expired_token)  # <-- await

    async def test_decode_invalid_token(self):
        with pytest.raises(TokenError):
            await AuthService.decode_token("invalid.token.string")  # <-- await

    async def test_token_expiration_times(self):
        user_id = str(uuid4())

        access_token_str = await AuthService.create_access_token(user_id)  # <-- await
        access_payload = jwt.decode(
            jwt=access_token_str,
            key=settings.token_public_key,
            algorithms=[settings.token_algorithm],
        )
        access_exp = datetime.fromtimestamp(access_payload["exp"], tz=UTC)
        expected_access_exp = datetime.now(UTC) + timedelta(
            minutes=settings.access_token_expiration_minutes
        )
        assert abs((access_exp - expected_access_exp).total_seconds()) < 60

        refresh_token_str = await AuthService.create_refresh_token(user_id)  # <-- await
        refresh_payload = jwt.decode(
            jwt=refresh_token_str,
            key=settings.token_public_key,
            algorithms=[settings.token_algorithm],
        )
        refresh_exp = datetime.fromtimestamp(refresh_payload["exp"], tz=UTC)
        expected_refresh_exp = datetime.now(UTC) + timedelta(
            days=settings.refresh_token_expiration_days
        )
        assert abs((refresh_exp - expected_refresh_exp).total_seconds()) < 3600
