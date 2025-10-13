from unittest.mock import Mock, patch

import pytest
from fastapi import status

from service.exceptions.auth import AuthIncorrectPasswordError
from service.exceptions.user import UserEmailExistsError, UserUsernameExistsError


class TestAuthRoutes:
    @pytest.mark.asyncio
    async def test_register_success(
        self, async_client, sample_user, mock_users_service
    ):
        """Test successful user registration"""
        mock_users_service.create_user.return_value = sample_user

        response = await async_client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
                "username": "newuser",
                "plain_text_password": "SecurePass123!",
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == sample_user.email
        assert data["username"] == sample_user.username
        assert "hashed_password" not in data

    async def test_register_duplicate_username(self, async_client, mock_users_service):
        """Test registration with duplicate username"""
        mock_users_service.create_user.side_effect = UserUsernameExistsError()

        response = await async_client.post(
            "/auth/register",
            json={
                "email": "existinguser@example.com",
                "username": "existinguser",
                "plain_text_password": "SecurePass123!",
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.json()["detail"].lower()

    async def test_register_duplicate_email(self, async_client, mock_users_service):
        """Test registration with duplicate username"""
        mock_users_service.create_user.side_effect = UserEmailExistsError()

        response = await async_client.post(
            "/auth/register",
            json={
                "email": "existinguser@example.com",
                "username": "existinguser",
                "plain_text_password": "SecurePass123!",
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.json()["detail"].lower()

    async def test_register_invalid_parameter(self, async_client, mock_users_service):
        mock_users_service.create_user.return_value = None

        response = await async_client.post(
            "/auth/register",
            json={
                "email": "newuser@example.com",
                "username": "newuser",
                "plain_text_password": "SecurePass123!",
                "is_superuser": False,
            },
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # TODO: validate response

    async def test_login_success(self, async_client, sample_user, mock_auth_service):
        """Test successful login"""
        mock_auth_service.authenticate_user_by_username.return_value = sample_user

        response = await async_client.post(
            "/auth/login",
            data={"username": sample_user.username, "password": "TestPassword123!"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in response.cookies

    async def test_login_invalid_credentials(
        self, async_client, sample_user, mock_auth_service
    ):
        """Test login with invalid credentials"""
        mock_auth_service.authenticate_user_by_username.side_effect = (
            AuthIncorrectPasswordError()
        )

        response = await async_client.post(
            "/auth/login",
            data={"username": sample_user.username, "password": "WrongPassword"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "incorrect" in response.json()["detail"].lower()

    async def test_login_inactive_user(
        self, async_client, sample_user, mock_auth_service
    ):
        """Test login with inactive user"""
        sample_user.is_active = False
        mock_auth_service.authenticate_user_by_username.return_value = sample_user

        response = await async_client.post(
            "/auth/login",
            data={"username": sample_user.username, "password": "TestPassword123!"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "inactive" in response.json()["detail"].lower()

    @patch("service.routers.auth.decode_token")
    async def test_refresh_token_success(
        self, mock_decode, async_client, sample_user, mock_users_service
    ):
        """Test successful token refresh"""
        # Mock the decoded refresh token
        mock_token = Mock()
        mock_token.token_type = "refresh"
        mock_token.sub = sample_user.id
        mock_decode.return_value = mock_token

        mock_users_service.get_user_by_id.return_value = sample_user

        # Set refresh token cookie
        async_client.cookies.set("refresh_token", "valid_refresh_token")

        response = await async_client.post("/auth/refresh")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data

    async def test_refresh_token_missing(self, async_client):
        """Test refresh without token"""
        response = await async_client.post("/auth/refresh")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "no refresh token" in response.json()["detail"].lower()

    @patch("service.routers.auth.decode_token")
    async def test_refresh_token_wrong_type(self, mock_decode, async_client):
        """Test refresh with access token instead of refresh token"""
        mock_token = Mock()
        mock_token.token_type = "access"
        mock_decode.return_value = mock_token

        async_client.cookies.set("refresh_token", "access_token_string")

        response = await async_client.post("/auth/refresh")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "invalid token type" in response.json()["detail"].lower()

    @patch("service.routers.auth.decode_token")
    async def test_refresh_token_inactive_user(
        self, mock_decode, async_client, sample_user, mock_users_service
    ):
        """Test refresh with inactive user"""
        mock_token = Mock()
        mock_token.token_type = "refresh"
        mock_token.sub = sample_user.id
        mock_decode.return_value = mock_token

        sample_user.is_active = False
        mock_users_service.get_user_by_id.return_value = sample_user

        async_client.cookies.set("refresh_token", "valid_refresh_token")

        response = await async_client.post("/auth/refresh")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
