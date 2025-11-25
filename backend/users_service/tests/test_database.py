from unittest.mock import Mock

import pytest
from azure.cosmos import exceptions
from shared.db import now_timestamp
from shared.exceptions.db import (
    EmptyRecordUpdateError,
    GeneralQueryError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.testing import AsyncIteratorMock
from shared.models.users import UserInDB

from src.models import UserUpdate


class TestDBGetUserByID:
    @pytest.mark.asyncio
    async def test_get_user_by_id_success(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        mock_container.read_item.return_value = sample_user_in_db.model_dump()
        result = await mock_users_db.get_user_by_id("user123")

        assert isinstance(result, UserInDB)
        assert result.id == "user123"

    @pytest.mark.asyncio
    async def test_get_user_by_id_not_found(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        mock_container.read_item.side_effect = exceptions.CosmosResourceNotFoundError()

        with pytest.raises(RecordNotFoundError):
            await mock_users_db.get_user_by_id("nonexistent")

    @pytest.mark.asyncio
    async def test_get_user_by_id_unexpected_error(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        mock_container.read_item.side_effect = Exception()

        with pytest.raises(GeneralQueryError):
            await mock_users_db.get_user_by_id("user123")


class TestDBGetUserByUsername:
    @pytest.mark.asyncio
    async def test_get_user_by_username_success(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        mock_container.query_items = Mock()
        mock_container.query_items.return_value = AsyncIteratorMock(
            [sample_user_in_db.model_dump()]
        )
        result = await mock_users_db.get_user_by_username("testuser")

        assert isinstance(result, UserInDB)
        assert result.username == "testuser"

    @pytest.mark.asyncio
    async def test_get_user_by_username_not_found_empty(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        mock_container.query_items = Mock()
        mock_container.query_items.side_effect = (
            exceptions.CosmosResourceNotFoundError()
        )

        with pytest.raises(RecordNotFoundError):
            await mock_users_db.get_user_by_username("nonexistent")

    @pytest.mark.asyncio
    async def test_get_user_by_username_not_found_cosmos(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        mock_container.query_items = Mock()
        mock_container.query_items.return_value = AsyncIteratorMock([])

        with pytest.raises(RecordNotFoundError):
            await mock_users_db.get_user_by_username("nonexistent")

    @pytest.mark.asyncio
    async def test_get_user_by_username_unexpected_error(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        mock_container.query_items.side_effect = Exception()

        with pytest.raises(GeneralQueryError):
            await mock_users_db.get_user_by_username("testuser")


class TestDBGetUserByEmail:
    @pytest.mark.asyncio
    async def test_get_user_by_email_success(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        mock_container.query_items = Mock()
        mock_container.query_items.return_value = AsyncIteratorMock(
            [sample_user_in_db.model_dump()]
        )
        result = await mock_users_db.get_user_by_email("test@gmail.com")

        assert isinstance(result, UserInDB)
        assert result.email == "test@gmail.com"

    @pytest.mark.asyncio
    async def test_get_user_by_email_not_found_empty(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        mock_container.query_items = Mock()
        mock_container.query_items.return_value = AsyncIteratorMock([])

        with pytest.raises(RecordNotFoundError):
            await mock_users_db.get_user_by_email("nonexisten@gmail.com")

    @pytest.mark.asyncio
    async def test_get_user_by_email_not_found_cosmos(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        mock_container.query_items = Mock()
        mock_container.query_items.side_effect = (
            exceptions.CosmosResourceNotFoundError()
        )

        with pytest.raises(RecordNotFoundError):
            await mock_users_db.get_user_by_email("nonexistent@gmail.com")

    @pytest.mark.asyncio
    async def test_get_user_by_email_unexpected_error(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        mock_container.query_items.side_effect = Exception()

        with pytest.raises(GeneralQueryError):
            await mock_users_db.get_user_by_email("test@gmail.com")


class TestDBUpdateUser:
    @pytest.mark.asyncio
    async def test_update_user_email_success(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        new_sample_user_in_db = sample_user_in_db.model_copy(deep=True)
        new_sample_user_in_db.email = "newtest@gmail.com"
        mock_container.patch_item.return_value = new_sample_user_in_db

        user_update = UserUpdate(id="user123", email="newtest@gmail.com")
        result = await mock_users_db.update_user(user_update)

        assert isinstance(result, UserInDB)
        assert result.email == "newtest@gmail.com"

    @pytest.mark.asyncio
    @pytest.mark.notimplemented
    async def test_update_user_email_failed_validation(self):
        pass

    @pytest.mark.asyncio
    async def test_update_user_username_success(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        new_sample_user_in_db = sample_user_in_db.model_copy(deep=True)
        new_sample_user_in_db.username = "newtestuser"
        mock_container.patch_item.return_value = new_sample_user_in_db

        user_update = UserUpdate(id="user123", username="newtestuser")
        result = await mock_users_db.update_user(user_update)

        assert isinstance(result, UserInDB)
        assert result.username == "newtestuser"

    @pytest.mark.asyncio
    @pytest.mark.notimplemented
    async def test_update_user_username_failed_validation(self):
        pass

    @pytest.mark.asyncio
    async def test_update_user_no_input(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        with pytest.raises(EmptyRecordUpdateError):
            await mock_users_db.update_user(UserUpdate(id="user123"))

    @pytest.mark.asyncio
    async def test_update_user_timestamp_updated(
        self, mock_container, mock_users_db, sample_user_in_db
    ):
        user_update = UserUpdate(id="user123", email="newtest@gmail.com")
        new_sample_user_in_db = sample_user_in_db.model_copy(deep=True)
        new_sample_user_in_db.updated_at = now_timestamp()
        mock_container.patch_item.return_value = new_sample_user_in_db
        result = await mock_users_db.update_user(user_update)

        assert isinstance(result, UserInDB)
        assert result.updated_at != sample_user_in_db.updated_at

    @pytest.mark.asyncio
    async def test_update_user_not_found(self, mock_container, mock_users_db):
        mock_container.patch_item.side_effect = exceptions.CosmosResourceNotFoundError()

        with pytest.raises(RecordNotFoundError):
            await mock_users_db.update_user(
                UserUpdate(id="user321", username="newusername")
            )

    @pytest.mark.asyncio
    async def test_update_user_unexpected_error(self, mock_container, mock_users_db):
        mock_container.patch_item.side_effect = Exception()

        with pytest.raises(RecordUpdateError):
            await mock_users_db.update_user(
                UserUpdate(id="user123", username="newusername")
            )


class TestDBDeleteUser:
    @pytest.mark.asyncio
    async def test_delete_user_success(self, mock_users_db):
        await mock_users_db.delete_user("user123")

    @pytest.mark.asyncio
    async def test_delete_user_not_found(self, mock_container, mock_users_db):
        mock_container.delete_item.side_effect = (
            exceptions.CosmosResourceNotFoundError()
        )

        with pytest.raises(RecordNotFoundError):
            await mock_users_db.delete_user("user123")

    @pytest.mark.asyncio
    async def test_delete_user_unexpected_error(self, mock_container, mock_users_db):
        mock_container.delete_item.side_effect = Exception()

        with pytest.raises(RecordDeletionError):
            await mock_users_db.delete_user("user123")
