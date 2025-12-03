from datetime import timedelta
from unittest.mock import patch

import jwt
import pytest
from email_validator import EmailNotValidError
from shared.db import now_timestamp
from shared.exceptions.auth import AuthError
from shared.exceptions.db import EmptyRecordUpdateError
from shared.exceptions.token import TokenError, TokenExpiredError
from shared.models.token import Token

from src.exceptions import (
    AuthIncorrectPasswordError,
)
from src.models import UserAuthUpdate
from src.settings import settings


class TestServiceGetUserFromService:
    pass


class TestServiceAuthenticateUserByUsername:
    @pytest.mark.asyncio
    async def test_authenticate_by_username_success(
        self, mock_auth_service, mock_db, sample_user_in_db
    ):
        with patch(
            "src.service.AuthService._get_user_from_service",
            return_value=sample_user_in_db,
        ):
            with patch("src.service.pwdhasher.verify", return_value=True):
                result = await mock_auth_service.authenticate_user_by_username(
                    "testuser", "password"
                )

        assert result == sample_user_in_db

    @pytest.mark.asyncio
    async def test_authenticate_by_username_wrong_password(
        self, mock_auth_service, mock_db, sample_user_in_db
    ):
        with patch(
            "src.service.AuthService._get_user_from_service",
            return_value=sample_user_in_db,
        ):
            with patch("src.service.pwdhasher.verify", return_value=False):
                with pytest.raises(AuthIncorrectPasswordError):
                    await mock_auth_service.authenticate_user_by_username(
                        "testuser", "wrong_password"
                    )


class TestServiceAuthenticateUserByEmail:
    @pytest.mark.asyncio
    async def test_authenticate_by_email_success(
        self, mock_auth_service, mock_db, sample_user_in_db
    ):
        with patch(
            "src.service.AuthService._get_user_from_service",
            return_value=sample_user_in_db,
        ):
            with patch("src.service.pwdhasher.verify", return_value=True):
                result = await mock_auth_service.authenticate_user_by_email(
                    "testing@gmail.com", "password"
                )

        assert result == sample_user_in_db

    @pytest.mark.asyncio
    async def test_authenticate_by_email_wrong_password(
        self, mock_auth_service, mock_db, sample_user_in_db
    ):
        with patch(
            "src.service.AuthService._get_user_from_service",
            return_value=sample_user_in_db,
        ):
            with patch("src.service.pwdhasher.verify", return_value=False):
                with pytest.raises(AuthIncorrectPasswordError):
                    await mock_auth_service.authenticate_user_by_email(
                        "testing@gmail.com", "wrong_password"
                    )

    @pytest.mark.asyncio
    async def test_authenticate_by_email_invalid_email(
        self, mock_auth_service, mock_db
    ):
        """Test authentication by invalid email"""
        with pytest.raises(EmailNotValidError):
            await mock_auth_service.authenticate_user_by_email(
                "not-an-email", "password"
            )


class TestServiceUpdateUserAuth:
    @pytest.mark.asyncio
    async def test_update_own_password(
        self, mock_auth_service, mock_db, sample_user_in_db
    ):
        auth_update = UserAuthUpdate(
            id="user123", plain_text_password="NewPassword123!"
        )
        new_sample_user_in_db = sample_user_in_db.model_copy(deep=True)
        new_sample_user_in_db.hashed_password = "hashed_password"
        mock_db.update_auth.return_value = new_sample_user_in_db

        with patch(
            "src.service.AuthService._get_user_from_service",
            return_value=sample_user_in_db,
        ):
            await mock_auth_service.update_user_auth(auth_update, sample_user_in_db)

    @pytest.mark.asyncio
    async def test_update_other_user_password_fail(
        self, mock_auth_service, mock_db, sample_user_in_db
    ):
        auth_update = UserAuthUpdate(
            id="user321", plain_text_password="NewPassword123!"
        )

        with patch("src.service.authorize_operation", side_effect=AuthError()):
            with pytest.raises(AuthError):
                await mock_auth_service.update_user_auth(auth_update, sample_user_in_db)

    @pytest.mark.asyncio
    async def test_regular_user_cannot_update_restricted(
        self, mock_auth_service, mock_db, sample_user_in_db
    ):
        auth_update = UserAuthUpdate(id="user123", is_active=False, is_superuser=True)

        mock_db.update_auth.side_effect = EmptyRecordUpdateError()

        with patch("src.service.authorize_operation"):
            with patch(
                "src.service.AuthService._get_user_from_service",
                return_value=sample_user_in_db,
            ):
                with pytest.raises(EmptyRecordUpdateError):
                    await mock_auth_service.update_user_auth(
                        auth_update, sample_user_in_db
                    )

        mock_db.update_auth.assert_awaited_once_with(
            sample_user_in_db,
            UserAuthUpdate(id="user123", is_active=None, is_superuser=None),
        )

    @pytest.mark.asyncio
    async def test_regular_user_can_update_restricted(
        self, mock_auth_service, mock_db, sample_user_in_db, sample_superuser
    ):
        auth_update = UserAuthUpdate(id="user123", is_active=False, is_superuser=True)
        new_sample_user_in_db = sample_user_in_db.model_copy(deep=True)
        new_sample_user_in_db.is_active = False
        new_sample_user_in_db.is_superuser = True
        mock_db.update_auth.return_value = new_sample_user_in_db

        with patch("src.service.authorize_operation", return_value=None):
            with patch(
                "src.service.AuthService._get_user_from_service",
                return_value=sample_user_in_db,
            ):
                await mock_auth_service.update_user_auth(auth_update, sample_superuser)

    @pytest.mark.asyncio
    async def test_update_unauthorized(self, mock_auth_service, sample_user_in_db):
        """Test unauthorized update attempt"""
        auth_update = UserAuthUpdate(
            id="otheruser456", plain_text_password="NewPassword123!"
        )

        with patch("src.service.authorize_operation", side_effect=AuthError()):
            with pytest.raises(AuthError):
                await mock_auth_service.update_user_auth(auth_update, sample_user_in_db)


class TestServiceTokenFunctions:
    """Tests for token creation and decoding"""

    @pytest.mark.asyncio
    async def test_create_access_token(self, mock_auth_service):
        """Test access token creation"""
        token = await mock_auth_service.create_access_token("user123")

        assert token is not None
        assert isinstance(token, str)

        # Decode to verify structure
        payload = jwt.decode(
            token, settings.TOKEN_PUBLIC_KEY, algorithms=settings.TOKEN_ALGORITHM
        )
        assert payload["sub"] == "user123"
        assert payload["token_type"] == "access"
        assert "exp" in payload

    @pytest.mark.xfail  # TODO not sure how to trigger the unexpected error
    async def test_create_access_token_unexpected_error(self, mock_auth_service):
        raise Exception()

    @pytest.mark.asyncio
    async def test_create_refresh_token(self, mock_auth_service):
        """Test refresh token creation"""
        token = await mock_auth_service.create_refresh_token("user123")

        assert token is not None
        assert isinstance(token, str)

        # Decode to verify structure
        payload = jwt.decode(
            token, settings.TOKEN_PUBLIC_KEY, algorithms=settings.TOKEN_ALGORITHM
        )
        assert payload["sub"] == "user123"
        assert payload["token_type"] == "refresh"
        assert "exp" in payload

    @pytest.mark.xfail  # TODO not sure how to trigger the unexpected error
    async def test_create_refresh_token_unexpected_error(self, mock_auth_service):
        raise Exception()

    @pytest.mark.asyncio
    async def test_decode_token_success(self, mock_auth_service):
        """Test successful token decoding"""
        # Create a valid token
        expiration = now_timestamp() + timedelta(minutes=15)
        token_str = jwt.encode(
            {
                "sub": "user123",
                "exp": int(expiration.timestamp()),
                "token_type": "access",
            },
            settings.TOKEN_PRIVATE_KEY,
            algorithm=settings.TOKEN_ALGORITHM,
        )

        result = await mock_auth_service.decode_token(token_str)

        assert isinstance(result, Token)
        assert result.sub == "user123"
        assert result.token_type == "access"

    @pytest.mark.asyncio
    async def test_decode_expired_token(self, mock_auth_service):
        """Test decoding expired token"""
        # Create an expired token
        expiration = now_timestamp() - timedelta(minutes=15)
        token_str = jwt.encode(
            {
                "sub": "user123",
                "exp": int(expiration.timestamp()),
                "token_type": "access",
            },
            settings.TOKEN_PRIVATE_KEY,
            algorithm=settings.TOKEN_ALGORITHM,
        )

        with pytest.raises(TokenExpiredError):
            await mock_auth_service.decode_token(token_str)

    @pytest.mark.asyncio
    async def test_decode_invalid_token(self, mock_auth_service):
        """Test decoding invalid token"""
        with pytest.raises(TokenError):
            await mock_auth_service.decode_token("invalid.token.string")


class TestServicePasswordReset:
    pass
