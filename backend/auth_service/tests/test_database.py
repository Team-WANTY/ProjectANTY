from unittest.mock import Mock, patch

import pytest
from azure.cosmos import exceptions as cosmos_exceptions
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.auth import UserAuthInfo

from src.models import UserAuthUpdate


class AsyncIteratorMock:
    """A simple async iterator for mocking async for loops."""
    def __init__(self, items):
        self._items = items

    def __aiter__(self):
        self._iter = iter(self._items)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration

class TestCreateUser:
    """Tests for create_user method"""

    @pytest.mark.asyncio
    async def test_create_user_success(self, auth_db, mock_container, sample_user_create, sample_user_auth_info):
        """Test successful user creation"""
        mock_container.create_item.return_value = sample_user_auth_info.model_dump()

        result = await auth_db.create_user(sample_user_create)

        assert isinstance(result, UserAuthInfo)
        assert result.username == "testuser"
        assert result.email == "test@gmail.com"
        mock_container.create_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_user_already_exists(self, auth_db, mock_container, sample_user_create):
        """Test user creation when user already exists"""
        mock_container.create_item.side_effect = cosmos_exceptions.CosmosHttpResponseError(
            status_code=409,
            message="Conflict"
        )

        with pytest.raises(RecordAlreadyExistsError):
            await auth_db.create_user(sample_user_create)

    @pytest.mark.asyncio
    async def test_create_user_unexpected_error(self, auth_db, mock_container, sample_user_create):
        """Test user creation with unexpected error"""
        mock_container.create_item.side_effect = Exception("Unexpected error")

        with pytest.raises(RecordCreationError):
            await auth_db.create_user(sample_user_create)


class TestGetUserAuthById:
    """Tests for get_user_auth_by_id method"""

    @pytest.mark.asyncio
    async def test_get_user_by_id_success(self, auth_db, mock_container, sample_user_auth_info):
        """Test successful retrieval by ID"""
        mock_container.read_item.return_value = sample_user_auth_info.model_dump()

        result = await auth_db.get_user_auth_by_id("user123")

        assert isinstance(result, UserAuthInfo)
        assert result.id == "user123"
        mock_container.read_item.assert_called_once_with(
            item="user123",
            partition_key="user123"
        )

    @pytest.mark.asyncio
    async def test_get_user_by_id_not_found(self, auth_db, mock_container):
        """Test retrieval when user not found"""
        mock_container.read_item.side_effect = cosmos_exceptions.CosmosResourceNotFoundError(
            status_code=404,
            message="Not found"
        )

        with pytest.raises(RecordNotFoundError):
            await auth_db.get_user_auth_by_id("nonexistent")

    @pytest.mark.asyncio
    async def test_get_user_by_id_unexpected_error(self, auth_db, mock_container):
        """Test retrieval with unexpected error"""
        mock_container.read_item.side_effect = Exception("Unexpected error")

        with pytest.raises(GeneralQueryError):
            await auth_db.get_user_auth_by_id("user123")


class TestGetUserAuthByUsername:
    """Tests for get_user_auth_by_username method"""

    @pytest.mark.asyncio
    async def test_get_user_by_username_success(self, auth_db, mock_container, sample_user_auth_info):
        """Test successful retrieval by username"""
        mock_container.query_items = Mock()
        mock_container.query_items.return_value = AsyncIteratorMock([sample_user_auth_info.model_dump()])

        result = await auth_db.get_user_auth_by_username("testuser")

        assert isinstance(result, UserAuthInfo)
        assert result.username == "testuser"

    @pytest.mark.asyncio
    async def test_get_user_by_username_not_found(self, auth_db, mock_container):
        """Test retrieval when username not found"""
        mock_container.query_items = Mock()
        mock_container.query_items.return_value = AsyncIteratorMock([])

        with pytest.raises(RecordNotFoundError):
            await auth_db.get_user_auth_by_username("nonexistent")

    @pytest.mark.asyncio
    async def test_get_user_by_username_unexpected_error(self, auth_db, mock_container):
        """Test retrieval with unexpected error"""
        mock_container.query_items.side_effect = Exception("Unexpected error")

        with pytest.raises(GeneralQueryError):
            await auth_db.get_user_auth_by_username("testuser")


class TestGetUserAuthByEmail:
    """Tests for get_user_auth_by_email method"""

    @pytest.mark.asyncio
    async def test_get_user_by_email_success(self, auth_db, mock_container, sample_user_auth_info):
        """Test successful retrieval by email"""
        mock_container.query_items = Mock()
        mock_container.query_items.return_value = AsyncIteratorMock([sample_user_auth_info.model_dump()])

        result = await auth_db.get_user_auth_by_email("test@gmail.com")
        assert isinstance(result, UserAuthInfo)
        assert result.email == "test@gmail.com"

    @pytest.mark.asyncio
    async def test_get_user_by_email_not_found(self, auth_db, mock_container):
        """Test retrieval when email not found"""
        mock_container.query_items = Mock()
        mock_container.query_items.return_value = AsyncIteratorMock([])

        with pytest.raises(RecordNotFoundError):
            await auth_db.get_user_auth_by_email("nonexistent@gmail.com")

class TestUpdateAuth:
    """Tests for update_auth method"""

    @pytest.mark.asyncio
    async def test_update_password_success(self, auth_db, mock_container, sample_user_auth_info):
        """Test successful password update"""
        auth_update = UserAuthUpdate(
            id="user123",
            plain_text_password="NewPassword123!"
        )

        updated_item = sample_user_auth_info.model_dump()
        updated_item["hashed_password"] = "new_hashed_password"
        mock_container.patch_item.return_value = updated_item

        result = await auth_db.update_auth(sample_user_auth_info, auth_update)

        assert isinstance(result, UserAuthInfo)
        mock_container.patch_item.assert_called_once()

        # Verify patch operations include password and timestamp
        call_args = mock_container.patch_item.call_args
        patch_ops = call_args.kwargs['patch_operations']
        assert any(op['path'] == '/hashed_password' for op in patch_ops)
        assert any(op['path'] == '/updated_at' for op in patch_ops)

    @pytest.mark.asyncio
    async def test_update_password_same_as_old(self, auth_db, mock_container, sample_user_auth_info):
        """Test password update with same password as old"""
        # Hash the password that matches the sample user
        with patch('src.database.pwdhasher.verify', return_value=True):
            auth_update = UserAuthUpdate(
                id="user123",
                plain_text_password="OldPassword123!"
            )

            with pytest.raises(RecordUpdateError):
                await auth_db.update_auth(sample_user_auth_info, auth_update)

    @pytest.mark.asyncio
    async def test_update_is_active(self, auth_db, mock_container, sample_user_auth_info):
        """Test updating is_active status"""
        auth_update = UserAuthUpdate(
            id="user123",
            is_active=False
        )

        updated_item = sample_user_auth_info.model_dump()
        updated_item["is_active"] = False
        mock_container.patch_item.return_value = updated_item

        result = await auth_db.update_auth(sample_user_auth_info, auth_update)

        assert not result.is_active
        mock_container.patch_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_is_superuser(self, auth_db, mock_container, sample_user_auth_info):
        """Test updating is_superuser status"""
        auth_update = UserAuthUpdate(
            id="user123",
            is_superuser=True
        )

        updated_item = sample_user_auth_info.model_dump()
        updated_item["is_superuser"] = True
        mock_container.patch_item.return_value = updated_item

        result = await auth_db.update_auth(sample_user_auth_info, auth_update)

        assert result.is_superuser

    @pytest.mark.asyncio
    async def test_update_no_changes(self, auth_db, mock_container, sample_user_auth_info):
        """Test update with no changes"""
        auth_update = UserAuthUpdate(id="user123")

        result = await auth_db.update_auth(sample_user_auth_info, auth_update)

        # Should return original user without calling patch
        assert result == sample_user_auth_info
        mock_container.patch_item.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_user_not_found(self, auth_db, mock_container, sample_user_auth_info):
        """Test update when user not found"""
        auth_update = UserAuthUpdate(
            id="user123",
            plain_text_password="NewPassword123!"
        )

        mock_container.patch_item.side_effect = cosmos_exceptions.CosmosResourceNotFoundError(
            status_code=404,
            message="Not found"
        )

        with pytest.raises(RecordNotFoundError):
            await auth_db.update_auth(sample_user_auth_info, auth_update)

    @pytest.mark.asyncio
    async def test_update_unexpected_error(self, auth_db, mock_container, sample_user_auth_info):
        """Test update with unexpected error"""
        auth_update = UserAuthUpdate(
            id="user123",
            plain_text_password="NewPassword123!"
        )

        mock_container.patch_item.side_effect = Exception("Unexpected error")

        with pytest.raises(RecordUpdateError):
            await auth_db.update_auth(sample_user_auth_info, auth_update)
