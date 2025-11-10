from unittest.mock import AsyncMock, patch

import pytest
from shared.exceptions.auth import AuthError
from shared.models.users import UserInDB

from src.models import UserUpdate


class TestServiceGetUser:
    @pytest.mark.asyncio
    async def test_get_user_by_id_success(
        self, mock_db, mock_users_service, sample_user_in_db
    ):
        mock_db.get_user_by_id.return_value = sample_user_in_db

        result = await mock_users_service.get_user_by_id("user123")

        assert isinstance(result, UserInDB)
        assert result.id == "user123"

    @pytest.mark.asyncio
    async def test_get_user_by_username_success(
        self, mock_db, mock_users_service, sample_user_in_db
    ):
        mock_db.get_user_by_username.return_value = sample_user_in_db

        result = await mock_users_service.get_user_by_username("testuser")

        assert isinstance(result, UserInDB)
        assert result.username == "testuser"

    @pytest.mark.asyncio
    async def test_get_user_by_email_success(
        self, mock_db, mock_users_service, sample_user_in_db
    ):
        mock_db.get_user_by_email.return_value = sample_user_in_db

        result = await mock_users_service.get_user_by_email("test@gmail.com")

        assert isinstance(result, UserInDB)
        assert result.email == "test@gmail.com"


class TestServiceUpdateUser:
    @pytest.mark.asyncio
    async def test_update_user_success(
        self, mock_db, mock_users_service, sample_user_in_db, sample_user_auth_info
    ):
        user_update = UserUpdate(id="user123")
        mock_db.get_user_by_id.return_value = sample_user_in_db
        mock_db.update_user.return_value = sample_user_in_db

        result = await mock_users_service.update_user(
            user_update, sample_user_auth_info
        )

        assert isinstance(result, UserInDB)
        assert result.id == sample_user_in_db.id

    @pytest.mark.asyncio
    async def test_update_user_not_authorized(
        self, mock_db, mock_users_service, sample_user_auth_info
    ):
        user_update = UserUpdate(id="user321")
        with patch(
            "src.service.authorize_operation", new_callable=AsyncMock
        ) as mock_authorizer:
            mock_authorizer.side_effect = AuthError()

            with pytest.raises(AuthError):
                await mock_users_service.update_user(user_update, sample_user_auth_info)

    @pytest.mark.asyncio
    @pytest.mark.notimplemented
    async def test_update_user_authorized_restricted_updates(
        self, mock_db, mock_users_service, sample_user_in_db
    ):
        """No restricted updates exist yet"""
        pass

    @pytest.mark.asyncio
    @pytest.mark.notimplemented
    async def test_update_user_not_authorized_restricted_updates(
        self, mock_db, mock_users_service, sample_user_in_db
    ):
        """No restricted updates exist yet"""
        pass


class TestServiceDeleteUser:
    @pytest.mark.asyncio
    async def test_delete_user_success(
        self, mock_db, mock_users_service, sample_user_auth_info
    ):
        with patch(
            "shared.auth.authorize_operation", new_callable=AsyncMock
        ) as mock_authorizer:
            mock_authorizer.return_value = None

            await mock_users_service.delete_user("user123", sample_user_auth_info)

    @pytest.mark.asyncio
    async def test_delete_user_not_authorized(
        self, mock_db, mock_users_service, sample_user_auth_info
    ):
        with patch(
            "src.service.authorize_operation", new_callable=AsyncMock
        ) as mock_authorizer:
            mock_authorizer.side_effect = AuthError()

            with pytest.raises(AuthError):
                await mock_users_service.delete_user("user321", sample_user_auth_info)
