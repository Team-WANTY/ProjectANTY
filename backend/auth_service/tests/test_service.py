from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import jwt
import pytest
from email_validator import EmailNotValidError
from shared.exceptions.auth import AuthError
from shared.exceptions.token import TokenError, TokenExpiredError
from shared.models.token import Token

from src.exceptions import AuthIncorrectPasswordError
from src.models import UserAuthUpdate
from src.settings import settings


class TestRegisterUser:
    """Tests for register_user method"""

    @pytest.mark.asyncio
    async def test_register_user_success(self, auth_service, mock_auth_db, sample_user_create, sample_user_auth_info):
        """Test successful user registration"""
        mock_auth_db.create_user.return_value = sample_user_auth_info

        result = await auth_service.register_user(sample_user_create)

        assert result == sample_user_auth_info
        mock_auth_db.create_user.assert_called_once_with(sample_user_create)


class TestAuthenticateUserById:
    """Tests for authenticate_user_by_id method"""

    @pytest.mark.asyncio
    async def test_authenticate_by_id_success(self, auth_service, mock_auth_db, sample_user_auth_info):
        """Test successful authentication by ID"""
        mock_auth_db.get_user_auth_by_id.return_value = sample_user_auth_info

        with patch('src.service.pwdhasher.verify', return_value=True):
            result = await auth_service.authenticate_user_by_id("user123", "password")

        assert result == sample_user_auth_info
        mock_auth_db.get_user_auth_by_id.assert_called_once_with("user123")

    @pytest.mark.asyncio
    async def test_authenticate_by_id_wrong_password(self, auth_service, mock_auth_db, sample_user_auth_info):
        """Test authentication by ID with wrong password"""
        mock_auth_db.get_user_auth_by_id.return_value = sample_user_auth_info

        with patch('src.service.pwdhasher.verify', return_value=False):
            with pytest.raises(AuthIncorrectPasswordError):
                await auth_service.authenticate_user_by_id("user123", "wrongpassword")


class TestAuthenticateUserByUsername:
    """Tests for authenticate_user_by_username method"""

    @pytest.mark.asyncio
    async def test_authenticate_by_username_success(self, auth_service, mock_auth_db, sample_user_auth_info):
        """Test successful authentication by username"""
        mock_auth_db.get_user_auth_by_username.return_value = sample_user_auth_info

        with patch('src.service.pwdhasher.verify', return_value=True):
            result = await auth_service.authenticate_user_by_username("testuser", "password")

        assert result == sample_user_auth_info
        mock_auth_db.get_user_auth_by_username.assert_called_once_with("testuser")

    @pytest.mark.asyncio
    async def test_authenticate_by_username_wrong_password(self, auth_service, mock_auth_db, sample_user_auth_info):
        """Test authentication by username with wrong password"""
        mock_auth_db.get_user_auth_by_username.return_value = sample_user_auth_info

        with patch('src.service.pwdhasher.verify', return_value=False):
            with pytest.raises(AuthIncorrectPasswordError):
                await auth_service.authenticate_user_by_username("testuser", "wrongpassword")


class TestAuthenticateUserByEmail:
    """Tests for authenticate_user_by_email method"""

    @pytest.mark.asyncio
    async def test_authenticate_by_email_success(self, auth_service, mock_auth_db, sample_user_auth_info):
        """Test successful authentication by email"""
        mock_auth_db.get_user_auth_by_email.return_value = sample_user_auth_info

        with patch('src.service.pwdhasher.verify', return_value=True):
            result = await auth_service.authenticate_user_by_email("test@gmail.com", "password")

        assert result == sample_user_auth_info
        mock_auth_db.get_user_auth_by_email.assert_called_once_with("test@gmail.com")

    @pytest.mark.asyncio
    async def test_authenticate_by_email_invalid_email(self, auth_service, mock_auth_db):
        """Test authentication by invalid email"""
        with pytest.raises(EmailNotValidError):
            await auth_service.authenticate_user_by_email("not-an-email", "password")

    @pytest.mark.asyncio
    async def test_authenticate_by_email_wrong_password(self, auth_service, mock_auth_db, sample_user_auth_info):
        """Test authentication by email with wrong password"""
        mock_auth_db.get_user_auth_by_email.return_value = sample_user_auth_info

        with patch('src.service.pwdhasher.verify', return_value=False):
            with pytest.raises(AuthIncorrectPasswordError):
                await auth_service.authenticate_user_by_email("test@gmail.com", "wrongpassword")


class TestGetUserAuthById:
    """Tests for get_user_auth_by_id method"""

    @pytest.mark.asyncio
    async def test_get_user_by_id_success(self, auth_service, mock_auth_db, sample_user_auth_info):
        """Test successful get user by ID"""
        mock_auth_db.get_user_auth_by_id.return_value = sample_user_auth_info

        result = await auth_service.get_user_auth_by_id("user123")

        assert result == sample_user_auth_info
        mock_auth_db.get_user_auth_by_id.assert_called_once_with("user123")


class TestUpdateUserAuth:
    """Tests for update_user_auth method"""

    @pytest.mark.asyncio
    async def test_update_own_password(self, auth_service, mock_auth_db, sample_user_auth_info):
        """Test user updating their own password"""
        auth_update = UserAuthUpdate(
            id="user123",
            plain_text_password="NewPassword123!"
        )
        mock_auth_db.get_user_auth_by_id.return_value = sample_user_auth_info
        mock_auth_db.update_auth.return_value = sample_user_auth_info

        with patch('shared.auth.authorize_operation'):
            result = await auth_service.update_user_auth(auth_update, sample_user_auth_info)

        assert result == sample_user_auth_info
        mock_auth_db.update_auth.assert_called_once()

    @pytest.mark.asyncio
    async def test_regular_user_cannot_update_is_active(self, auth_service, mock_auth_db, sample_user_auth_info):
        """Test regular user cannot update is_active"""
        auth_update = UserAuthUpdate(
            id="user123",
            is_active=False,
            is_superuser=True
        )
        mock_auth_db.get_user_auth_by_id.return_value = sample_user_auth_info
        mock_auth_db.update_auth.return_value = sample_user_auth_info

        with patch('shared.auth.authorize_operation'):
            await auth_service.update_user_auth(auth_update, sample_user_auth_info)

        # Verify that is_active and is_superuser were set to None
        call_args = mock_auth_db.update_auth.call_args
        auth_update_arg = call_args[0][1]
        assert auth_update_arg.is_active is None
        assert auth_update_arg.is_superuser is None

    @pytest.mark.asyncio
    async def test_superuser_can_update_is_active(self, auth_service, mock_auth_db, sample_user_auth_info, sample_superuser):
        """Test superuser can update is_active"""
        auth_update = UserAuthUpdate(
            id="user123",
            is_active=False
        )
        mock_auth_db.get_user_auth_by_id.return_value = sample_user_auth_info
        mock_auth_db.update_auth.return_value = sample_user_auth_info

        with patch('shared.auth.authorize_operation'):
            await auth_service.update_user_auth(auth_update, sample_superuser)

        # Verify that is_active was not set to None
        call_args = mock_auth_db.update_auth.call_args
        auth_update_arg = call_args[0][1]
        assert not auth_update_arg.is_active

    @pytest.mark.asyncio
    async def test_update_unauthorized(self, auth_service, sample_user_auth_info):
        """Test unauthorized update attempt"""
        auth_update = UserAuthUpdate(
            id="otheruser456",
            plain_text_password="NewPassword123!"
        )

        with patch('src.service.authorize_operation', side_effect=AuthError()):
            with pytest.raises(AuthError):
                await auth_service.update_user_auth(auth_update, sample_user_auth_info)


class TestTokenFunctions:
    """Tests for token creation and decoding"""

    @pytest.mark.asyncio
    async def test_create_access_token(self, auth_service):
        """Test access token creation"""
        token = await auth_service.create_access_token("user123")

        assert token is not None
        assert isinstance(token, str)

        # Decode to verify structure
        payload = jwt.decode(token, settings.TOKEN_PUBLIC_KEY, algorithms=settings.TOKEN_ALGORITHM)
        assert payload["sub"] == "user123"
        assert payload["token_type"] == "access"
        assert "exp" in payload

    @pytest.mark.asyncio
    async def test_create_refresh_token(self, auth_service):
        """Test refresh token creation"""
        token = await auth_service.create_refresh_token("user123")

        assert token is not None
        assert isinstance(token, str)

        # Decode to verify structure
        payload = jwt.decode(token, settings.TOKEN_PUBLIC_KEY, algorithms=settings.TOKEN_ALGORITHM)
        assert payload["sub"] == "user123"
        assert payload["token_type"] == "refresh"
        assert "exp" in payload

    @pytest.mark.asyncio
    async def test_decode_token_success(self, auth_service):
        """Test successful token decoding"""
        # Create a valid token
        expiration = datetime.now(UTC) + timedelta(minutes=15)
        token_str = jwt.encode(
            {
                "sub": "user123",
                "exp": int(expiration.timestamp()),
                "token_type": "access"
            },
            settings.TOKEN_PRIVATE_KEY,
            algorithm=settings.TOKEN_ALGORITHM
        )

        result = await auth_service.decode_token(token_str)

        assert isinstance(result, Token)
        assert result.sub == "user123"
        assert result.token_type == "access"

    @pytest.mark.asyncio
    async def test_decode_expired_token(self, auth_service):
        """Test decoding expired token"""
        # Create an expired token
        expiration = datetime.now(UTC) - timedelta(minutes=15)
        token_str = jwt.encode(
            {
                "sub": "user123",
                "exp": int(expiration.timestamp()),
                "token_type": "access"
            },
            settings.TOKEN_PRIVATE_KEY,
            algorithm=settings.TOKEN_ALGORITHM
        )

        with pytest.raises(TokenExpiredError):
            await auth_service.decode_token(token_str)

    @pytest.mark.asyncio
    async def test_decode_invalid_token(self, auth_service):
        """Test decoding invalid token"""
        with pytest.raises(TokenError):
            await auth_service.decode_token("invalid.token.string")
