from unittest.mock import AsyncMock, patch

import pytest
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordNotFoundError,
)
from shared.models.users import UserInDB

from src.models import UserUpdate


class TestServiceCreateUser:
    @pytest.mark.asyncio
    async def test_create_user_success(
        self,
        mock_db,
        mock_users_service,
        sample_user_create,
        sample_user_in_db,
        httpx_mock,
    ):
        mock_users_service.get_user_by_username = AsyncMock()
        mock_users_service.get_user_by_username.side_effect = RecordNotFoundError()
        mock_users_service.get_user_by_email = AsyncMock()
        mock_users_service.get_user_by_email.side_effect = RecordNotFoundError()

        mock_db.create_user.return_value = sample_user_in_db

        httpx_mock.add_response(method="POST", status_code=201)

        await mock_users_service.create_user(sample_user_create)

    @pytest.mark.asyncio
    async def test_create_user_username_exists(
        self, mock_db, mock_users_service, sample_user_create, sample_user_in_db
    ):
        mock_users_service.get_user_by_username = AsyncMock()
        mock_users_service.get_user_by_username.return_value = sample_user_in_db

        with pytest.raises(RecordAlreadyExistsError):
            await mock_users_service.create_user(sample_user_create)

    @pytest.mark.asyncio
    async def test_create_user_email_exists(
        self, mock_db, mock_users_service, sample_user_create, sample_user_in_db
    ):
        mock_users_service.get_user_by_username = AsyncMock()
        mock_users_service.get_user_by_username.side_effect = RecordNotFoundError()
        mock_users_service.get_user_by_email = AsyncMock()
        mock_users_service.get_user_by_email.return_value = sample_user_in_db

        with pytest.raises(RecordAlreadyExistsError):
            await mock_users_service.create_user(sample_user_create)

    @pytest.mark.asyncio
    async def test_create_user_profile_fail(
        self,
        mock_db,
        mock_users_service,
        sample_user_create,
        sample_user_in_db,
        httpx_mock,
    ):
        mock_users_service.get_user_by_username = AsyncMock()
        mock_users_service.get_user_by_username.side_effect = RecordNotFoundError()
        mock_users_service.get_user_by_email = AsyncMock()
        mock_users_service.get_user_by_email.side_effect = RecordNotFoundError()

        mock_db.create_user.return_value = sample_user_in_db

        httpx_mock.add_response(method="POST", status_code=500)

        with pytest.raises(RecordCreationError):
            await mock_users_service.create_user(sample_user_create)


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
        self, mock_db, mock_users_service, sample_user_in_db
    ):
        user_update = UserUpdate(id="user123")

        with patch("src.service.authorize_operation", return_value=None):
            await mock_users_service.update_user(user_update, sample_user_in_db)

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

    @pytest.mark.asyncio
    async def test_update_user_not_authorized(
        self, mock_db, mock_users_service, sample_user_in_db
    ):
        user_update = UserUpdate(id="user123")
        other_sample_user_in_db = sample_user_in_db.model_copy(deep=True)
        other_sample_user_in_db.id = "user321"

        with pytest.raises(AuthError):
            with patch("src.service.authorize_operation", side_effect=AuthError()):
                await mock_users_service.update_user(
                    user_update, other_sample_user_in_db
                )


class TestServiceDeleteUser:
    @pytest.mark.asyncio
    async def test_delete_user_success(
        self, mock_db, mock_users_service, sample_user_in_db
    ):
        with patch(
            "shared.auth.authorize_operation", new_callable=AsyncMock
        ) as mock_authorizer:
            mock_authorizer.return_value = None

            await mock_users_service.delete_user("user123", sample_user_in_db)

    @pytest.mark.asyncio
    async def test_delete_user_not_authorized(
        self, mock_db, mock_users_service, sample_user_in_db
    ):
        with patch("src.service.authorize_operation", side_effect=AuthError):
            with pytest.raises(AuthError):
                await mock_users_service.delete_user("user321", sample_user_in_db)
