from datetime import UTC, datetime, timedelta
from unittest.mock import Mock

import pytest
from azure.cosmos import exceptions as cosmosdb_exceptions
from shared.db import now_timestamp
from shared.exceptions.db import (
    EmptyRecordUpdateError,
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
    FrequencySpecifier,
    RepeatDuration,
    RepeatFrequency,
    RepeatRule,
    TaskInDB,
    TaskUpdate,
)


class TestDBCreateTask:
    @pytest.mark.asyncio
    async def test_create_task_success(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        mock_container.create_item.return_value = sample_task_in_db

        await mock_tasks_db.create_task(sample_task_in_db)

    @pytest.mark.asyncio
    async def test_create_task_fail_exists(
        self, mock_container, mock_tasks_db, sample_task_in_db
    ):
        mock_container.create_item.side_effect = (
            cosmosdb_exceptions.CosmosResourceExistsError()
        )

        with pytest.raises(RecordAlreadyExistsError):
            await mock_tasks_db.create_task(sample_task_in_db)

    @pytest.mark.asyncio
    async def test_create_task_fail_unexpected_error(
        self, sample_task_create, mock_container, mock_tasks_db
    ):
        mock_container.create_item.side_effect = Exception()

        with pytest.raises(RecordCreationError):
            await mock_tasks_db.create_task(sample_task_create)


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
        mock_container.patch_item.return_value = new_task_in_db.model_dump(mode="json")

        await mock_tasks_db.update_task(task_update)

    @pytest.mark.asyncio
    async def test_update_task_desc_success(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        task_update = TaskUpdate(id="task123", desc="New Description")
        new_task_in_db = sample_task_in_db.model_copy(deep=True)
        new_task_in_db.desc = "New Description"
        mock_container.patch_item.return_value = new_task_in_db.model_dump(mode="json")

        await mock_tasks_db.update_task(task_update)

    @pytest.mark.asyncio
    async def test_update_task_cat_success(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        task_update = TaskUpdate(id="task123", cat="New Category")
        new_task_in_db = sample_task_in_db.model_copy(deep=True)
        new_task_in_db.cat = "New Category"
        mock_container.patch_item.return_value = new_task_in_db.model_dump(mode="json")

        await mock_tasks_db.update_task(task_update)

    @pytest.mark.asyncio
    async def test_update_task_first_relevant_date_success(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        task_update = TaskUpdate(
            id="task123", first_relevant_date=now_timestamp().date()
        )
        new_task_in_db = sample_task_in_db.model_copy(deep=True)
        new_task_in_db.first_relevant_date = now_timestamp().date()
        mock_container.patch_item.return_value = new_task_in_db.model_dump(mode="json")
        mock_container.read_item.return_value = sample_task_in_db.model_dump(
            mode="json"
        )
        await mock_tasks_db.update_task(task_update)

    @pytest.mark.asyncio
    async def test_update_task_completions_success(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        task_update = TaskUpdate(id="task123", completions=[now_timestamp().date()])
        new_task_in_db = sample_task_in_db.model_copy(deep=True)
        new_task_in_db.completions = [now_timestamp().date()]
        mock_container.patch_item.return_value = new_task_in_db.model_dump(mode="json")

        await mock_tasks_db.update_task(task_update)

    @pytest.mark.asyncio
    async def test_update_task_repeat_rule_success(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        new_repeat_rule = RepeatRule(
            frequency=RepeatFrequency(specifier=FrequencySpecifier.DAILY),
            duration=RepeatDuration(
                specifier=DurationSpecifier.NUMBER_OF_TIMES, value=3
            ),
        )
        task_update = TaskUpdate(id="task123", repeat_rule=new_repeat_rule)
        new_task_in_db = sample_task_in_db.model_copy(deep=True)
        new_task_in_db.repeat_rule = new_repeat_rule
        mock_container.patch_item.return_value = new_task_in_db.model_dump(mode="json")
        mock_container.read_item.return_value = sample_task_in_db.model_dump(
            mode="json"
        )
        await mock_tasks_db.update_task(task_update)

    @pytest.mark.asyncio
    async def test_update_task_update_timestamp_success(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        task_update = TaskUpdate(id="task123", desc="Test time update")
        new_task_in_db = sample_task_in_db.model_copy(deep=True)
        new_task_in_db.updated_at = datetime.now(UTC) + timedelta(minutes=15)

        mock_container.patch_item.return_value = new_task_in_db.model_dump(mode="json")

        await mock_tasks_db.update_task(task_update)

    @pytest.mark.asyncio
    async def test_update_task_empty(
        self, sample_task_in_db, mock_container, mock_tasks_db
    ):
        with pytest.raises(EmptyRecordUpdateError):
            await mock_tasks_db.update_task(TaskUpdate(id="task123"))

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
    async def test_get_users_tasks_in_range_success(
        self, mock_container, sample_task_in_db, mock_tasks_db
    ):
        mock_container.query_items = Mock()
        mock_container.query_items.return_value = AsyncIteratorMock(
            [sample_task_in_db, sample_task_in_db, sample_task_in_db]
        )

        results = [
            task
            async for task in mock_tasks_db.get_users_tasks_in_range(
                "user123", now_timestamp().date(), now_timestamp().date()
            )
        ]

        assert len(results) == 3
        assert isinstance(results[0], TaskInDB)
        assert results[0].id == "task123"

    @pytest.mark.asyncio
    async def test_get_users_tasks_in_range_unexpected_error(
        self, mock_container, sample_task_in_db, mock_tasks_db
    ):
        mock_container.query_items.side_effect = Exception()

        with pytest.raises(GeneralQueryError):
            async for _ in mock_tasks_db.get_users_tasks_in_range(
                "user123", now_timestamp().date(), now_timestamp().date()
            ):
                continue
