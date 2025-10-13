from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest

from service.config import settings
from service.exceptions.token import JWTTokenExpiredError
from service.models.token import Token
from service.security.token import (
    create_access_token,
    create_refresh_token,
    decode_token,
)


class TestTokenOperations:
    def test_create_access_token(self):
        """Test access token creation"""

        user_id = str(uuid4())

        token_str = create_access_token(user_id)

        assert isinstance(token_str, str)
        assert len(token_str) > 0

        payload = jwt.decode(
            jwt=token_str,
            key=settings.token_public_key,
            algorithms=[settings.token_algorithm],
        )  # , options={"verify_signature": False}
        assert payload["token_type"] == "access"
        assert payload["sub"] == str(user_id)

    def test_create_refresh_token(self):
        """Test refresh token creation"""
        user_id = str(uuid4())
        token_str = create_refresh_token(user_id)

        assert isinstance(token_str, str)
        assert len(token_str) > 0

        payload = jwt.decode(
            jwt=token_str,
            key=settings.token_public_key,
            algorithms=[settings.token_algorithm],
        )  # options={"verify_signature": False}
        assert payload["token_type"] == "refresh"
        assert payload["sub"] == str(user_id)

    def test_decode_valid_token(self):
        """Test decoding a valid token"""
        user_id = str(uuid4())
        token_str = create_access_token(user_id)

        decoded = decode_token(token_str)

        assert isinstance(decoded, Token)
        assert decoded.sub == user_id
        assert decoded.token_type == "access"

    def test_decode_expired_token(self):
        """Test decoding an expired token"""
        user_id = str(uuid4())
        expiration = datetime.now(UTC) - timedelta(minutes=1)

        token = Token(sub=user_id, exp=int(expiration.timestamp()), token_type="access")
        payload = token.model_dump()
        expired_token = jwt.encode(
            payload=payload,
            key=settings.token_private_key,
            algorithm=settings.token_algorithm,
        )

        with pytest.raises(JWTTokenExpiredError):
            decode_token(expired_token)

    def test_decode_invalid_token(self):
        """Test decoding an invalid token"""
        with pytest.raises(jwt.InvalidTokenError):
            decode_token("invalid.token.string")

    def test_token_expiration_times(self):
        """Test that tokens have correct expiration times"""
        user_id = str(uuid4())

        access_token_str = create_access_token(user_id)
        try:
            access_payload = jwt.decode(
                jwt=access_token_str,
                key=settings.token_public_key,
                algorithms=[settings.token_algorithm],
            )  # options={"verify_signature": False}
        except jwt.ExpiredSignatureError:
            pass
        access_exp = datetime.fromtimestamp(access_payload["exp"], tz=UTC)
        expected_access_exp = datetime.now(UTC) + timedelta(
            minutes=settings.access_token_expiration_minutes
        )

        # Allow 1 minute tolerance
        assert abs((access_exp - expected_access_exp).total_seconds()) < 60

        refresh_token_str = create_refresh_token(user_id)
        refresh_payload = jwt.decode(
            refresh_token_str, options={"verify_signature": False}
        )
        refresh_exp = datetime.fromtimestamp(refresh_payload["exp"], tz=UTC)
        expected_refresh_exp = datetime.now(UTC) + timedelta(
            days=settings.refresh_token_expiration_days
        )

        # Allow 1 hour tolerance for refresh tokens
        assert abs((refresh_exp - expected_refresh_exp).total_seconds()) < 3600
