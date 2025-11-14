from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock

import pytest
from azure.cosmos import exceptions as cosmosdb_exceptions
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.testing import AsyncIteratorMock

from src.models import (
    DurationSpecifier,
    RepeatDuration,
    RepeatRule,
    TaskInDB,
    TaskUpdate,
)


class TestDBCreateTask:
    @pytest.mark.asyncio
    async def test_create_task_success(
        self, sample_task, sample_task_in_db, mock_container, mock_tasks_db
    ):
        mock_container.create_item.return_value = sample_task_in_db

        result = await mock_tasks_db.create_task(sample_task)

        assert result.id == "task123"
        assert result.user_id == "user123"
        assert result.name == "Test Task"
        assert result.desc == "Task made for testing"
        assert result.cat == "Testing"
        # omitted timestamp checks for simplicity

    @pytest.mark.asyncio
    async def test_create_task_fail_exists(
        self, sample_task, mock_container, mock_tasks_db
    ):
        mock_container.create_item.side_effect = (
            cosmosdb_exceptions.CosmosResourceExistsError()
        )

        with pytest.raises(RecordAlreadyExistsError):
            await mock_tasks_db.create_task(sample_task)

    @pytest.mark.asyncio
    async def test_create_task_fail_unexpected_error(
        self, sample_task, mock_container, mock_tasks_db
    ):
        mock_container.create_item.side_effect = Exception()

        with pytest.raises(RecordCreationError):
            await mock_tasks_db.create_task(sample_task)


class TestDBGetTaskByID:
    @pytest.mark.asyncio
    async def test_get_task_by_id_success(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        mock_container.read_item.return_value = sample_task_in_db

        result = await mock_tasks_db.get_task_by_id("task123")

        assert result.id == "task123"

    @pytest.mark.asyncio
    async def test_get_task_by_id_fail_not_found(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        mock_container.read_item.side_effect = (
            cosmosdb_exceptions.CosmosResourceNotFoundError()
        )

        with pytest.raises(RecordNotFoundError):
            await mock_tasks_db.get_task_by_id("task123")

    @pytest.mark.asyncio
    async def test_get_task_by_id_fail_unexpected(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        mock_container.read_item.side_effect = Exception()

        with pytest.raises(GeneralQueryError):
            await mock_tasks_db.get_task_by_id("task123")


class TestDBUpdateTask:
    @pytest.mark.asyncio
    async def test_update_task_name_success(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        task_update = TaskUpdate(id="task123", name="New Name")
        new_task_in_db = sample_task_in_db.model_copy(deep=True)
        new_task_in_db.name = "New Name"
        mock_container.patch_item.return_value = new_task_in_db.model_dump()

        result = await mock_tasks_db.update_task(task_update)
        assert result.id == "task123"
        assert result.name == "New Name"

    @pytest.mark.asyncio
    async def test_update_task_desc_success(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        task_update = TaskUpdate(id="task123", desc="New Description")
        new_task_in_db = sample_task_in_db.model_copy(deep=True)
        new_task_in_db.desc = "New Description"
        mock_container.patch_item.return_value = new_task_in_db.model_dump()

        result = await mock_tasks_db.update_task(task_update)
        assert result.id == "task123"
        assert result.desc == "New Description"

    @pytest.mark.asyncio
    async def test_update_task_cat_success(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        task_update = TaskUpdate(id="task123", cat="New Category")
        new_task_in_db = sample_task_in_db.model_copy(deep=True)
        new_task_in_db.cat = "New Category"
        mock_container.patch_item.return_value = new_task_in_db.model_dump()

        result = await mock_tasks_db.update_task(task_update)
        assert result.id == "task123"
        assert result.cat == "New Category"

    @pytest.mark.asyncio
    async def test_update_task_due_date_success(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        task_update = TaskUpdate(
            id="task123",
            due_date=int((datetime.now(UTC) + timedelta(minutes=15)).timestamp()),
        )
        new_task_in_db = sample_task_in_db.model_copy(deep=True)
        new_task_in_db.due_date = int(
            (datetime.now(UTC) + timedelta(minutes=15)).timestamp()
        )
        mock_container.patch_item.return_value = new_task_in_db.model_dump()

        result = await mock_tasks_db.update_task(task_update)
        assert result.id == "task123"
        assert result.due_date == int(
            (datetime.now(UTC) + timedelta(minutes=15)).timestamp()
        )

    @pytest.mark.asyncio
    async def test_update_task_repeat_rule_success(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        new_repeat_rule = RepeatRule(
            duration=RepeatDuration(
                specifier=DurationSpecifier.NUMBER_OF_TIMES, value=3
            )
        )
        task_update = TaskUpdate(id="task123", repeat_rule=new_repeat_rule)
        new_task_in_db = sample_task_in_db.model_copy(deep=True)
        new_task_in_db.repeat_rule = new_repeat_rule
        mock_container.patch_item.return_value = new_task_in_db.model_dump()

        result = await mock_tasks_db.update_task(task_update)
        assert result.id == "task123"
        assert result.repeat_rule == new_repeat_rule

    @pytest.mark.asyncio
    async def test_update_task_update_timestamp_success(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        task_update = TaskUpdate(id="task123", desc="Test time update")
        new_task_in_db = sample_task_in_db.model_copy(deep=True)
        new_task_in_db.updated_at = int(
            (datetime.now(UTC) + timedelta(minutes=15)).timestamp()
        )

        mock_container.patch_item.return_value = new_task_in_db.model_dump()

        result = await mock_tasks_db.update_task(task_update)
        assert result.id == "task123"
        assert result.updated_at != sample_task_in_db.updated_at

    @pytest.mark.asyncio
    async def test_update_task_empty(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        task_update = TaskUpdate(id="task123")

        result = await mock_tasks_db.update_task(task_update)
        assert result is None

    @pytest.mark.asyncio
    async def test_update_task_not_found(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        task_update = TaskUpdate(id="task123", cat="New Category")
        mock_container.patch_item.side_effect = (
            cosmosdb_exceptions.CosmosResourceNotFoundError()
        )

        with pytest.raises(RecordNotFoundError):
            await mock_tasks_db.update_task(task_update)

    @pytest.mark.asyncio
    async def test_update_task_unexpected_error(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        task_update = TaskUpdate(id="task123", cat="New Category")
        mock_container.patch_item.side_effect = Exception()

        with pytest.raises(RecordUpdateError):
            await mock_tasks_db.update_task(task_update)


class TestDBDeleteTask:
    @pytest.mark.asyncio
    async def test_delete_task_success(self, mock_container, mock_tasks_db):
        mock_container.delete_item.return_value = None

        await mock_tasks_db.delete_task("task123")

    @pytest.mark.asyncio
    async def test_delete_task_not_found(self, mock_container, mock_tasks_db):
        mock_container.delete_item.side_effect = (
            cosmosdb_exceptions.CosmosResourceNotFoundError()
        )

        with pytest.raises(RecordNotFoundError):
            await mock_tasks_db.delete_task("task123")

    @pytest.mark.asyncio
    async def test_delete_task_unexpected_error(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        mock_container.delete_item.side_effect = Exception()

        with pytest.raises(RecordDeletionError):
            await mock_tasks_db.delete_task("task123")


class TestDBGetTasksByUserID:
    @pytest.mark.asyncio
    async def test_get_tasks_by_user_id_success(
        self, sample_task_in_db, mock_tasks_db, mock_container
    ):
        # Fake data from Cosmos
        fake_items = [
            AsyncIteratorMock([sample_task_in_db]),
            AsyncIteratorMock([sample_task_in_db, sample_task_in_db]),
            AsyncIteratorMock([sample_task_in_db, sample_task_in_db, sample_task_in_db]),
        ]

        # Mock the pager
        pager = AsyncIteratorMock(fake_items)
        pager.continuation_token = None

        # Mock query_items + by_page()
        mock_iterable = MagicMock()
        mock_iterable.by_page.return_value = pager
        mock_container.query_items = MagicMock()
        mock_container.query_items.return_value = mock_iterable

        # Act
        pt = await mock_tasks_db.get_tasks_by_user_id("user123", 1)

        # Assert
        assert len(pt.tasks) == 1
        assert isinstance(pt.tasks[0], TaskInDB)

    @pytest.mark.asyncio
    async def test_get_tasks_by_user_id_success_cont(
        self, sample_task_in_db, mock_tasks_db, mock_container
    ):
        # Fake data from Cosmos
        fake_items = [
            AsyncIteratorMock([sample_task_in_db, sample_task_in_db]),
            AsyncIteratorMock([sample_task_in_db, sample_task_in_db, sample_task_in_db]),
        ]

        # Mock the pager
        pager = AsyncIteratorMock(fake_items)
        pager.continuation_token = '{"token": "next-token"}'  # ty: ignore

        # Mock query_items + by_page()
        mock_iterable = MagicMock()
        mock_iterable.by_page.return_value = pager
        mock_container.query_items = MagicMock()
        mock_container.query_items.return_value = mock_iterable

        # Act
        pt = await mock_tasks_db.get_tasks_by_user_id(
            "user123", 1, cont_token='{"token":"token"}'
        )

        # Assert
        assert len(pt.tasks) == 2
        assert isinstance(pt.tasks[0], TaskInDB)
        assert pt.continuation_token == '{"token": "next-token"}'

    @pytest.mark.asyncio
    async def test_get_tasks_by_user_id_not_found(
        self, sample_task_in_db, mock_tasks_db, mock_container
    ):
        mock_container.query_items = MagicMock()
        mock_container.query_items.side_effect = (
            cosmosdb_exceptions.CosmosResourceNotFoundError()
        )

        with pytest.raises(RecordNotFoundError):
            tasks, _ = await mock_tasks_db.get_tasks_by_user_id("user123", 1)

    @pytest.mark.asyncio
    async def test_get_tasks_by_user_id_unexpected_error(
        self, sample_task_in_db, mock_tasks_db, mock_container
    ):
        mock_container.query_items = MagicMock()
        mock_container.query_items.side_effect = Exception()

        with pytest.raises(GeneralQueryError):
            tasks, _ = await mock_tasks_db.get_tasks_by_user_id("user123", 1)
