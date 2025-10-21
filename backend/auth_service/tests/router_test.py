import pytest
from unittest.mock import AsyncMock, Mock, patch
from fastapi import status

from src.exceptions import AuthError, AuthIncorrectPasswordError


@pytest.mark.asyncio
class TestAuthRoutes:
    async def test_register_success(self, async_client, sample_user, mock_users_service):
        """Test successful user registration"""
        mock_users_service.create_user = AsyncMock(return_value=sample_user)

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
        mock_users_service.create_user = AsyncMock(side_effect=AuthError())

        response = await async_client.post(
            "/auth/register",
            json={
                "email": "existinguser@example.com",
                "username": "existinguser",
                "plain_text_password": "SecurePass123!",
            },
        )

        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        # assert "already exists" in response.json()["detail"].lower()

    # async def test_register_duplicate_email(self, async_client, mock_users_service):
    #     """Test registration with duplicate email"""
    #     mock_users_service.create_user = AsyncMock(side_effect=UserEmailExistsError())

    #     response = await async_client.post(
    #         "/auth/register",
    #         json={
    #             "email": "existinguser@example.com",
    #             "username": "existinguser",
    #             "plain_text_password": "SecurePass123!",
    #         },
    #     )

    #     assert response.status_code == status.HTTP_400_BAD_REQUEST
    #     assert "already exists" in response.json()["detail"].lower()

    async def test_register_invalid_parameter(self, async_client, mock_users_service):
        """Test registration with invalid parameter"""
        mock_users_service.create_user = AsyncMock(return_value=None)

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
        # TODO: validate response content

    async def test_login_success(self, async_client, sample_user, mock_auth_service):
        """Test successful login"""
        mock_auth_service.authenticate_user_by_email = AsyncMock(return_value=sample_user)
        mock_auth_service.create_access_token = AsyncMock(return_value="access-token")
        mock_auth_service.create_refresh_token = AsyncMock(return_value="refresh-token")

        response = await async_client.post(
            "/auth/login",
            data={"username": sample_user.username, "password": "TestPassword123!"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["access_token"] == "access-token"
        assert response.cookies.get("refresh_token") == "refresh-token"

    async def test_login_invalid_credentials(self, async_client, sample_user, mock_auth_service):
        """Test login with invalid credentials"""
        mock_auth_service.authenticate_user_by_email = AsyncMock(side_effect=AuthIncorrectPasswordError())
        mock_auth_service.authenticate_user_by_username = AsyncMock(side_effect=AuthIncorrectPasswordError())

        response = await async_client.post(
            "/auth/login",
            data={"username": sample_user.username, "password": "WrongPassword"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "invalid credentials" in response.json()["detail"].lower()

    async def test_login_inactive_user(self, async_client, sample_user, mock_auth_service):
        """Test login with inactive user"""
        sample_user.is_active = False
        mock_auth_service.authenticate_user_by_email = AsyncMock(return_value=sample_user)

        response = await async_client.post(
            "/auth/login",
            data={"username": sample_user.username, "password": "TestPassword123!"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "inactive" in response.json()["detail"].lower()

    @patch("src.router.AuthService.decode_token", new_callable=AsyncMock)
    async def test_refresh_token_success(self, mock_decode, async_client, sample_user, mock_auth_service):
        """Test successful token refresh"""
        # Mock decoded token
        mock_token = Mock()
        mock_token.token_type = "refresh"
        mock_token.sub = sample_user.id
        mock_decode.return_value = mock_token

        mock_auth_service.get_user_auth_by_id = AsyncMock(return_value=sample_user)
        mock_auth_service.create_access_token = AsyncMock(return_value="new-access-token")

        async_client.cookies.set("refresh_token", "valid-refresh-token")

        response = await async_client.post("/auth/refresh")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["access_token"] == "new-access-token"

    async def test_refresh_token_missing(self, async_client):
        """Test refresh without token"""
        response = await async_client.post("/auth/refresh")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "no refresh token" in response.json()["detail"].lower()

    @patch("src.router.AuthService.decode_token", new_callable=AsyncMock)
    async def test_refresh_token_wrong_type(self, mock_decode, async_client):
        """Test refresh with access token instead of refresh token"""
        mock_token = Mock()
        mock_token.token_type = "access"
        mock_decode.return_value = mock_token

        async_client.cookies.set("refresh_token", "access_token_string")
        response = await async_client.post("/auth/refresh")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "invalid token type" in response.json()["detail"].lower()

    @patch("src.router.AuthService.decode_token", new_callable=AsyncMock)
    async def test_refresh_token_inactive_user(self, mock_decode, async_client, sample_user, mock_auth_service):
        """Test refresh with inactive user"""
        mock_token = Mock()
        mock_token.token_type = "refresh"
        mock_token.sub = sample_user.id
        mock_decode.return_value = mock_token

        sample_user.is_active = False
        mock_auth_service.get_user_auth_by_id = AsyncMock(return_value=sample_user)

        async_client.cookies.set("refresh_token", "valid-refresh-token")
        response = await async_client.post("/auth/refresh")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
