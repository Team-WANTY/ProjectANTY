from datetime import timedelta
from unittest.mock import AsyncMock, patch

import pytest
from email_validator import EmailNotValidError
from fastapi import HTTPException
from shared.db import now_timestamp
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordNotFoundError,
    RecordUpdateError,
    EmptyRecordUpdateError,
)
from shared.exceptions.token import TokenError, TokenExpiredError
from shared.exceptions.auth import AuthError
from shared.models.auth import UserAuthInfo
from shared.models.token import Token

from src.exceptions import AuthIncorrectPasswordError
from src.main import app
from src.router import _get_current_user_auth_logic, get_current_user_auth


class TestGetCurrentUserAuth:
    @pytest.mark.asyncio
    async def test_get_current_user_auth_success(
        self, mock_service, sample_user_auth_info
    ):
        mock_service.decode_token.return_value = Token(
            sub="user123",
            exp=now_timestamp() + timedelta(minutes=15),
            token_type="access",
        )
        mock_service.get_user_auth_by_id.return_value = sample_user_auth_info
        result = await _get_current_user_auth_logic(
            token="test-token", auth_service=mock_service
        )

        assert isinstance(result, UserAuthInfo)

    @pytest.mark.asyncio
    async def test_get_current_user_auth_token_error(
        self, mock_service, sample_user_auth_info
    ):
        mock_service.decode_token.side_effect = TokenError()

        with pytest.raises(HTTPException) as e:
            await _get_current_user_auth_logic(
                token="test-token", auth_service=mock_service
            )

        assert isinstance(e.value, HTTPException)
        assert e.value.status_code == 500

    @pytest.mark.asyncio
    async def test_get_current_user_auth_expired_token(
        self, mock_service, sample_user_auth_info
    ):
        mock_service.decode_token.side_effect = TokenExpiredError()

        with pytest.raises(HTTPException) as e:
            await _get_current_user_auth_logic(
                token="test-token", auth_service=mock_service
            )

        assert isinstance(e.value, HTTPException)
        assert e.value.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user_auth_unexpected_token_error(
        self, mock_service, sample_user_auth_info
    ):
        mock_service.decode_token.side_effect = Exception()

        with pytest.raises(HTTPException) as e:
            await _get_current_user_auth_logic(
                token="test-token", auth_service=mock_service
            )

        assert isinstance(e.value, HTTPException)
        assert e.value.status_code == 500

    @pytest.mark.asyncio
    async def test_get_current_user_auth_not_found(
        self, mock_service, sample_user_auth_info
    ):
        mock_service.decode_token.return_value = Token(
            sub="user123",
            exp=now_timestamp() + timedelta(minutes=15),
            token_type="access",
        )
        mock_service.get_user_auth_by_id.side_effect = RecordNotFoundError()

        with pytest.raises(HTTPException) as e:
            await _get_current_user_auth_logic(
                token="test-token", auth_service=mock_service
            )

        assert isinstance(e.value, HTTPException)
        assert e.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_current_user_auth_query_error(
        self, mock_service, sample_user_auth_info
    ):
        mock_service.decode_token.return_value = Token(
            sub="user123",
            exp=now_timestamp() + timedelta(minutes=15),
            token_type="access",
        )
        mock_service.get_user_auth_by_id.side_effect = GeneralQueryError()

        with pytest.raises(HTTPException) as e:
            await _get_current_user_auth_logic(
                token="test-token", auth_service=mock_service
            )

        assert isinstance(e.value, HTTPException)
        assert e.value.status_code == 500

    @pytest.mark.asyncio
    async def test_get_current_user_auth_unexpected_error(
        self, mock_service, sample_user_auth_info
    ):
        mock_service.decode_token.return_value = Token(
            sub="user123",
            exp=now_timestamp() + timedelta(minutes=15),
            token_type="access",
        )
        mock_service.get_user_auth_by_id.side_effect = Exception()

        with pytest.raises(HTTPException) as e:
            await _get_current_user_auth_logic(
                token="test-token", auth_service=mock_service
            )

        assert isinstance(e.value, HTTPException)
        assert e.value.status_code == 500

    @pytest.mark.asyncio
    async def test_get_current_user_auth_not_active(
        self, mock_service, sample_user_auth_info
    ):
        mock_service.decode_token.return_value = Token(
            sub="user123",
            exp=now_timestamp() + timedelta(minutes=15),
            token_type="access",
        )
        new_sample_user_auth_info = sample_user_auth_info.model_copy(deep=True)
        new_sample_user_auth_info.is_active = False
        mock_service.get_user_auth_by_id.return_value = new_sample_user_auth_info

        with pytest.raises(HTTPException) as e:
            await _get_current_user_auth_logic(
                token="test-token", auth_service=mock_service
            )

        assert isinstance(e.value, HTTPException)
        assert e.value.status_code == 401


class TestRegister:
    """Tests for /register endpoint"""

    def test_register_success(self, client, sample_user_auth_info, mock_service):
        """Test successful user registration"""

        response = client.post(
            "/register",
            json={
                "email": "test@gmail.com",
                "username": "testuser",
                "plain_text_password": "SecurePassword123!",
            },
        )

        assert response.status_code == 201

    def test_register_user_already_exists(self, client, mock_service):
        """Test registration when user already exists"""

        mock_service.register_user.side_effect = RecordAlreadyExistsError()

        response = client.post(
            "/register",
            json={
                "email": "test@gmail.com",
                "username": "testuser",
                "plain_text_password": "SecurePassword123!",
            },
        )

        assert response.status_code == 403
        assert "already exists" in response.json()["detail"]

    def test_register_creation_error(self, client, mock_service):
        """Test registration with creation error"""
        mock_service.register_user.side_effect = RecordCreationError()

        response = client.post(
            "/register",
            json={
                "email": "test@gmail.com",
                "username": "testuser",
                "plain_text_password": "SecurePassword123!",
            },
        )

        assert response.status_code == 500

    def test_register_unexpected_error(self, client, mock_service):
        """Test registration with creation error"""
        mock_service.register_user.side_effect = Exception()

        response = client.post(
            "/register",
            json={
                "email": "test@gmail.com",
                "username": "testuser",
                "plain_text_password": "SecurePassword123!",
            },
        )

        assert response.status_code == 500


class TestLogin:
    """Tests for /login endpoint"""

    def test_login_success_with_email(
        self, client, sample_user_auth_info, mock_service
    ):
        """Test successful login with email"""

        mock_service.authenticate_user_by_email.return_value = sample_user_auth_info
        mock_service.create_access_token.return_value = "access_token_123"
        mock_service.create_refresh_token.return_value = "refresh_token_123"

        response = client.post(
            "/login", data={"username": "test@gmail.com", "password": "password123"}
        )

        assert response.status_code == 200
        assert response.json()["access_token"] == "access_token_123"
        assert response.json()["token_type"] == "bearer"
        assert "refresh_token" in response.cookies
        assert response.cookies["refresh_token"] == "refresh_token_123"

    def test_login_fail_invalid_email(self, mock_service, client):
        mock_service.authenticate_user_by_email.side_effect = EmailNotValidError()
        mock_service.authenticate_user_by_username.side_effect = RecordNotFoundError()

        response = client.post(
            "/login", data={"username": "invalid@e.xample", "password": "password123"}
        )
        assert response.status_code == 404

    def test_login_fail_valid_email_not_found(self, mock_service, client):
        mock_service.authenticate_user_by_email.side_effect = RecordNotFoundError()
        mock_service.authenticate_user_by_username.side_effect = RecordNotFoundError()

        response = client.post(
            "/login", data={"username": "valid@gmail.com", "password": "password123"}
        )
        assert response.status_code == 404

    def test_login_fail_valid_email_unexpected_query_error(self, mock_service, client):
        mock_service.authenticate_user_by_email.side_effect = GeneralQueryError()

        response = client.post(
            "/login", data={"username": "valid@gmail.com", "password": "password123"}
        )
        assert response.status_code == 500

    def test_login_success_with_username(
        self, client, sample_user_auth_info, mock_service
    ):
        """Test successful login with username"""

        mock_service.authenticate_user_by_email.side_effect = EmailNotValidError()
        mock_service.authenticate_user_by_username.return_value = sample_user_auth_info
        mock_service.create_access_token.return_value = "access_token_123"
        mock_service.create_refresh_token.return_value = "refresh_token_123"

        response = client.post(
            "/login", data={"username": "testuser", "password": "password123"}
        )

        assert response.status_code == 200
        assert response.json()["access_token"] == "access_token_123"
        assert response.json()["token_type"] == "bearer"
        assert "refresh_token" in response.cookies
        assert response.cookies["refresh_token"] == "refresh_token_123"

    def test_login_fail_username_unexpected_query_error(self, mock_service, client):
        mock_service.authenticate_user_by_email.side_effect = EmailNotValidError()
        mock_service.authenticate_user_by_username.side_effect = GeneralQueryError()

        response = client.post(
            "/login", data={"username": "testuser123", "password": "password123"}
        )
        assert response.status_code == 500

    def test_login_wrong_password_email(self, client, mock_service):
        """Test login with wrong password (email)"""
        mock_service.authenticate_user_by_email.side_effect = (
            AuthIncorrectPasswordError()
        )

        response = client.post(
            "/login", data={"username": "test@gmail.com", "password": "wrongpassword"}
        )

        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()

    def test_login_wrong_password_username(self, client, mock_service):
        """Test login with wrong password (username)"""
        mock_service.authenticate_user_by_email.side_effect = EmailNotValidError()
        mock_service.authenticate_user_by_username.side_effect = (
            AuthIncorrectPasswordError()
        )

        response = client.post(
            "/login", data={"username": "testuser", "password": "wrongpassword"}
        )

        assert response.status_code == 401
        assert "invalid" in response.json()["detail"].lower()

    def test_login_user_not_found(self, client, mock_service):
        """Test login with non-existent user"""
        mock_service.authenticate_user_by_email.side_effect = EmailNotValidError()
        mock_service.authenticate_user_by_username.side_effect = RecordNotFoundError()

        response = client.post(
            "/login", data={"username": "nonexistent", "password": "password123"}
        )

        assert response.status_code == 404

    def test_login_inactive_user(self, client, mock_service):
        """Test login with inactive user"""
        inactive_user = UserAuthInfo(
            id="user123",
            username="testuser",
            email="test@gmail.com",
            hashed_password="$argon2id$v=19$m=65536,t=3,p=4$hashed",
            updated_at=now_timestamp(),
            is_active=False,
            is_superuser=False,
        )

        mock_service.authenticate_user_by_email = AsyncMock(return_value=inactive_user)

        response = client.post(
            "/login",
            data={"username": "test@gmail.com", "password": "password123"},
        )

        assert response.status_code == 403
        assert "inactive" in response.json()["detail"].lower()

    def test_login_user_email_unexpected_error(self, client, mock_service):
        """Test login with non-existent user"""
        mock_service.authenticate_user_by_email.side_effect = Exception()

        response = client.post(
            "/login", data={"username": "nonexistent", "password": "password123"}
        )

        assert response.status_code == 500

    def test_login_user_not_found(self, client, mock_service):
        """Test login with non-existent user"""
        mock_service.authenticate_user_by_email.side_effect = EmailNotValidError()
        mock_service.authenticate_user_by_username.side_effect = Exception()

        response = client.post(
            "/login", data={"username": "nonexistent", "password": "password123"}
        )

        assert response.status_code == 500


class TestVerifyToken:
    """Tests for /verify/{token} endpoint"""

    def test_verify_token_success(self, client, sample_user_auth_info, mock_service):
        """Test successful token verification"""
        decoded_token = Token(
            sub="user123",
            exp=now_timestamp() + timedelta(minutes=15),
            token_type="access",
        )

        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"
            mock_service.decode_token.return_value = decoded_token
            mock_service.get_user_auth_by_id.return_value = sample_user_auth_info

            response = client.get(
                "/verify/test_token", headers={"X-Interservice-Key": "valid_key"}
            )

        assert response.status_code == 200
        assert response.json()["id"] == "user123"

    def test_verify_token_invalid_key(self, client, mock_service):
        """Test token verification with invalid interservice key"""
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/verify/test_token", headers={"X-Interservice-Key": "invalid_key"}
            )

        assert response.status_code == 401

    def test_verify_token_wrong_type(self, client, mock_service):
        """Test token verification with wrong token type"""
        decoded_token = Token(
            sub="user123",
            exp=now_timestamp() + timedelta(minutes=15),
            token_type="refresh",
        )

        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"
            mock_service.decode_token.return_value = decoded_token

            response = client.get(
                "/verify/test_token", headers={"X-Interservice-Key": "valid_key"}
            )

        assert response.status_code == 403
        assert "Invalid token type" in response.json()["detail"]

    def test_verify_expired_token(self, client, mock_service):
        """Test verification of expired token"""
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"
            mock_service.decode_token.side_effect = TokenExpiredError()

            response = client.get(
                "/verify/test_token", headers={"X-Interservice-Key": "valid_key"}
            )

        assert response.status_code == 401

    def test_verify_token_token_error(self, client, mock_service):
        """Test verification of expired token"""
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"
            mock_service.decode_token.side_effect = TokenError()

            response = client.get(
                "/verify/test_token", headers={"X-Interservice-Key": "valid_key"}
            )

        assert response.status_code == 400

    def test_verify_token_general_query_error(self, client, mock_service):
        """Test verification of expired token"""
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"
            mock_service.decode_token.side_effect = GeneralQueryError()

            response = client.get(
                "/verify/test_token", headers={"X-Interservice-Key": "valid_key"}
            )

        assert response.status_code == 500

    def test_verify_token_not_found(self, client, mock_service):
        """Test verification of expired token"""
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"
            mock_service.decode_token.side_effect = RecordNotFoundError()

            response = client.get(
                "/verify/test_token", headers={"X-Interservice-Key": "valid_key"}
            )

        assert response.status_code == 404

    def test_verify_token_unexpected_error(self, client, mock_service):
        """Test verification of expired token"""
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"
            mock_service.decode_token.side_effect = Exception()

            response = client.get(
                "/verify/test_token", headers={"X-Interservice-Key": "valid_key"}
            )

        assert response.status_code == 500


class TestRefreshToken:
    """Tests for /refresh endpoint"""

    def test_refresh_token_success(self, client, sample_user_auth_info, mock_service):
        """Test successful token refresh"""
        decoded_token = Token(
            sub="user123",
            exp=now_timestamp() + timedelta(minutes=15),
            token_type="refresh",
        )

        mock_service.decode_token.return_value = decoded_token
        mock_service.get_user_auth_by_id.return_value = sample_user_auth_info
        mock_service.create_access_token.return_value = "new_access_token"

        client.cookies.set("refresh_token", "valid_refresh_token")
        response = client.get("/refresh")

        assert response.status_code == 200
        assert response.json()["access_token"] == "new_access_token"

    def test_refresh_no_token(self, client):
        """Test refresh without refresh token"""

        response = client.get("/refresh")

        assert response.status_code == 401
        assert "No refresh token" in response.json()["detail"]

    def test_refresh_wrong_token_type(self, client, mock_service):
        """Test refresh with access token instead of refresh token"""
        decoded_token = Token(
            sub="user123",
            exp=now_timestamp() + timedelta(minutes=15),
            token_type="access",
        )

        mock_service.decode_token.return_value = decoded_token

        client.cookies.set("refresh_token", "access_token")
        response = client.get("/refresh")

        assert response.status_code == 403
        assert "invalid token type" in response.json()["detail"].lower()

    def test_refresh_expired_token(self, client, mock_service):
        """Test refresh with expired token"""

        mock_service.decode_token.side_effect = TokenExpiredError()

        client.cookies.set("refresh_token", "expired_token")
        response = client.get("/refresh")

        assert response.status_code == 401

    def test_refresh_inactive_user(self, client, mock_service):
        """Test refresh for inactive user"""
        decoded_token = Token(
            sub="user123",
            exp=now_timestamp() + timedelta(minutes=15),
            token_type="refresh",
        )
        inactive_user = UserAuthInfo(
            id="user123",
            username="testuser",
            email="test@gmail.com",
            hashed_password="$argon2id$v=19$m=65536,t=3,p=4$hashed",
            updated_at=now_timestamp(),
            is_active=False,
            is_superuser=False,
        )

        mock_service.decode_token.return_value = decoded_token
        mock_service.get_user_auth_by_id.return_value = inactive_user

        client.cookies.set("refresh_token", "valid_token")
        response = client.get("/refresh")

        assert response.status_code == 401

    def test_refresh_token_error(self, client, mock_service):
        """Test refresh with expired token"""

        mock_service.decode_token.side_effect = TokenError()

        client.cookies.set("refresh_token", "expired_token")
        response = client.get("/refresh")

        assert response.status_code == 400

    def test_refresh_not_found(self, client, mock_service):
        """Test refresh with expired token"""

        mock_service.decode_token.side_effect = RecordNotFoundError()

        client.cookies.set("refresh_token", "expired_token")
        response = client.get("/refresh")

        assert response.status_code == 404

    def test_refresh_general_query_error(self, client, mock_service):
        """Test refresh with expired token"""

        mock_service.decode_token.side_effect = GeneralQueryError()

        client.cookies.set("refresh_token", "expired_token")
        response = client.get("/refresh")

        assert response.status_code == 500

    def test_refresh_unexpected_error(self, client, mock_service):
        """Test refresh with expired token"""

        mock_service.decode_token.side_effect = Exception()

        client.cookies.set("refresh_token", "expired_token")
        response = client.get("/refresh")

        assert response.status_code == 500


class TestLogout:
    """Tests for /logout endpoint"""

    def test_logout_success(self, client):
        """Test successful logout"""
        response = client.post("/logout")

        assert response.status_code == 204
        # Check that refresh_token cookie was deleted
        assert (
            "refresh_token" not in response.cookies
            or response.cookies.get("refresh_token") == ""
        )


class TestUpdateAuth:
    """Tests for PATCH / endpoint"""

    def test_update_auth_success(self, client, sample_user_auth_info, mock_service, sample_token):
        """Test successful auth update"""
        mock_service.decode_token.return_value = sample_token
        mock_service.get_user_auth_by_id.return_value = sample_user_auth_info
        mock_service.update_user_auth.return_value = sample_user_auth_info

        response = client.patch(
            "/",
            json={"id": "user123", "plain_text_password": "NewPassword123!"},
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 200
        assert response.json()["id"] == "user123"

    def test_update_auth_auth_error(self, client, sample_user_auth_info, mock_service, sample_token):
        """Test successful auth update"""
        mock_service.decode_token.return_value = sample_token
        mock_service.get_user_auth_by_id.return_value = sample_user_auth_info
        mock_service.update_user_auth.side_effect = AuthError()

        response = client.patch(
            "/",
            json={"id": "user123", "plain_text_password": "NewPassword123!"},
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 403

    def test_update_auth_not_found(self, client, sample_user_auth_info, mock_service, sample_token):
        """Test successful auth update"""
        mock_service.decode_token.return_value = sample_token
        mock_service.get_user_auth_by_id.side_effect = RecordNotFoundError()

        response = client.patch(
            "/",
            json={"id": "user123", "plain_text_password": "NewPassword123!"},
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 404

    def test_update_auth_empty_update(self, client, sample_user_auth_info, mock_service, sample_token):
        """Test successful auth update"""
        mock_service.decode_token.return_value = sample_token
        mock_service.get_user_auth_by_id.return_value = sample_user_auth_info
        mock_service.update_user_auth.side_effect = EmptyRecordUpdateError()

        response = client.patch(
            "/",
            json={"id": "user123", "plain_text_password": "NewPassword123!"},
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 204

    def test_update_auth_update_error(self, client, sample_user_auth_info, mock_service, sample_token):
        """Test successful auth update"""
        mock_service.decode_token.return_value = sample_token
        mock_service.get_user_auth_by_id.return_value = sample_user_auth_info
        mock_service.update_user_auth.side_effect = RecordUpdateError()

        response = client.patch(
            "/",
            json={"id": "user123", "plain_text_password": "NewPassword123!"},
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 500

    def test_update_auth_unexpected_error(self, client, sample_user_auth_info, mock_service, sample_token):
        """Test successful auth update"""
        mock_service.decode_token.return_value = sample_token
        mock_service.get_user_auth_by_id.return_value = sample_user_auth_info
        mock_service.update_user_auth.side_effect = Exception()

        response = client.patch(
            "/",
            json={"id": "user123", "plain_text_password": "NewPassword123!"},
            headers={"Authorization": "Bearer valid_token"},
        )

        assert response.status_code == 500
