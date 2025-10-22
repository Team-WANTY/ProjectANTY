from unittest.mock import Mock

import pytest
from shared.exceptions.db import (
    RecordNotFoundError,
)

from src.models import UserUpdate
from src.service import UsersService


class TestUsersService:
    @pytest.mark.asyncio
    async def test_get_user_by_id_success(self, mock_user_db, sample_user_in_db):
        """Test successful retrieval by ID"""
        mock_user_db.get_user_by_id.return_value = sample_user_in_db

        service = UsersService(mock_user_db, auth_http_client=Mock())
        result = await service.get_user_by_id(sample_user_in_db.id)

        assert result is sample_user_in_db
        mock_user_db.get_user_by_id.assert_called_once_with(sample_user_in_db.id)

    @pytest.mark.asyncio
    async def test_get_user_by_id_not_found(self, mock_user_db, sample_user_in_db):
        """Test get_user_by_id raises RecordNotFoundError if user missing"""
        mock_user_db.get_user_by_id.side_effect = RecordNotFoundError()
        service = UsersService(mock_user_db, auth_http_client=Mock())

        with pytest.raises(RecordNotFoundError):
            await service.get_user_by_id(sample_user_in_db.id)

    @pytest.mark.asyncio
    async def test_get_user_by_username_success(self, mock_user_db, sample_user_in_db):
        """Test successful retrieval by username"""
        mock_user_db.get_user_by_username.return_value = sample_user_in_db
        service = UsersService(mock_user_db, auth_http_client=Mock())
        result = await service.get_user_by_username(sample_user_in_db.username)

        assert result is sample_user_in_db
        mock_user_db.get_user_by_username.assert_called_once_with(sample_user_in_db.username)

    @pytest.mark.asyncio
    async def test_get_user_by_email_success(self, mock_user_db, sample_user_in_db):
        """Test successful retrieval by email"""
        mock_user_db.get_user_by_email.return_value = sample_user_in_db
        service = UsersService(mock_user_db, auth_http_client=Mock())
        result = await service.get_user_by_email(sample_user_in_db.email)

        assert result is sample_user_in_db
        mock_user_db.get_user_by_email.assert_called_once_with(sample_user_in_db.email)

    @pytest.mark.asyncio
    async def test_update_user_success(self, mock_user_db, sample_user_in_db):
        """Test successful user update"""
        sample_update = UserUpdate(id=sample_user_in_db.id, username="new_username")
        updated_in_db = sample_user_in_db.model_copy()
        updated_in_db.username = "new_username"

        mock_user_db.get_user_by_id.return_value = sample_user_in_db
        mock_user_db.update_user.return_value = updated_in_db

        service = UsersService(mock_user_db, auth_http_client=Mock())
        result = await service.update_user(sample_update, updater_is_super=True)

        assert result.username == "new_username"
        mock_user_db.get_user_by_id.assert_called_once_with(sample_user_in_db.id)
        mock_user_db.update_user.assert_called_once_with(sample_user_in_db, sample_update, True)

    @pytest.mark.asyncio
    async def test_update_user_not_found(self, mock_user_db):
        """Test update_user raises RecordNotFoundError if user missing"""
        sample_update = UserUpdate(id="nonexistent", username="new")
        mock_user_db.get_user_by_id.side_effect = RecordNotFoundError()
        service = UsersService(mock_user_db, auth_http_client=Mock())

        with pytest.raises(RecordNotFoundError):
            await service.update_user(sample_update, updater_is_super=True)

    @pytest.mark.asyncio
    async def test_delete_user_success(self, mock_user_db, sample_user_in_db):
        """Test successful deletion"""
        mock_user_db.delete_user.return_value = None
        service = UsersService(mock_user_db, auth_http_client=Mock())

        await service.delete_user(sample_user_in_db.id)
        mock_user_db.delete_user.assert_called_once_with(sample_user_in_db.id)

    @pytest.mark.asyncio
    async def test_delete_user_not_found(self, mock_user_db, sample_user_in_db):
        """Test delete_user raises RecordNotFoundError if user missing"""
        mock_user_db.delete_user.side_effect = RecordNotFoundError()
        service = UsersService(mock_user_db, auth_http_client=Mock())

        with pytest.raises(RecordNotFoundError):
            await service.delete_user(sample_user_in_db.id)
