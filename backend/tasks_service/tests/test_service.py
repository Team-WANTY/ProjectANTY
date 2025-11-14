from unittest.mock import AsyncMock, patch

import pytest
from shared.exceptions.auth import AuthError

from src.models import TaskInDB, TaskUpdate


class TestServiceCreateTask:
    @pytest.mark.asyncio
    async def test_create_task_success(
        self,
        mock_db,
        mock_tasks_service,
        sample_task_in_db,
        sample_task,
        sample_user_auth_info,
    ):
        mock_db.create_task.return_value = sample_task_in_db

        result = await mock_tasks_service.create_task(
            sample_task, sample_user_auth_info
        )

        assert isinstance(result, TaskInDB)
        assert result.id == "task123"
        assert result.user_id == "user123"
        assert result.name == "Test Task"
        assert result.desc == "Task made for testing"
        assert result.cat == "Testing"

    @pytest.mark.asyncio
    async def test_create_task_not_authorized(
        self,
        mock_db,
        mock_tasks_service,
        sample_task_in_db,
        sample_task,
        sample_user_auth_info,
    ):
        different_sample_user_auth_info = sample_user_auth_info.model_copy(deep=True)
        different_sample_user_auth_info.id = "user321"

        with patch(
            "src.service.authorize_operation", new_callable=AsyncMock
        ) as mock_authorizer:
            mock_authorizer.side_effect = AuthError()
            with pytest.raises(AuthError):
                await mock_tasks_service.create_task(
                    sample_task, different_sample_user_auth_info
                )


class TestServiceGetTaskByID:
    @pytest.mark.asyncio
    async def test_get_task_by_id_success(
        self,
        mock_db,
        mock_tasks_service,
        sample_task_in_db,
        sample_task,
        sample_user_auth_info,
    ):
        mock_db.get_task_by_id.return_value = sample_task_in_db

        result = await mock_tasks_service.get_task_by_id(
            "task123", sample_user_auth_info
        )

        assert isinstance(result, TaskInDB)
        assert result.id == "task123"

    @pytest.mark.asyncio
    async def test_get_task_by_id_not_authorized(
        self,
        mock_db,
        mock_tasks_service,
        sample_task_in_db,
        sample_task,
        sample_user_auth_info,
    ):
        different_sample_user_auth_info = sample_user_auth_info.model_copy(deep=True)
        different_sample_user_auth_info.id = "user321"

        with patch(
            "src.service.authorize_operation", new_callable=AsyncMock
        ) as mock_authorizer:
            mock_authorizer.side_effect = AuthError()
            with pytest.raises(AuthError):
                await mock_tasks_service.get_task_by_id(
                    "task123", different_sample_user_auth_info
                )


class TestServiceGetTasksByUserID:
    @pytest.mark.asyncio
    async def test_get_tasks_by_user_id_success(
        self,
        mock_db,
        mock_tasks_service,
        sample_task_in_db,
        sample_task,
        sample_user_auth_info,
    ):
        mock_db.get_tasks_by_user_id.return_value = [
            sample_task_in_db,
            sample_task_in_db,
        ]

        result = await mock_tasks_service.get_tasks_by_user_id(
            "user123", 10, cont_token=None, getter=sample_user_auth_info
        )

        assert isinstance(result[0], TaskInDB)

    @pytest.mark.asyncio
    async def test_get_tasks_by_user_id_not_authorized(
        self,
        mock_db,
        mock_tasks_service,
        sample_task_in_db,
        sample_task,
        sample_user_auth_info,
    ):
        different_sample_user_auth_info = sample_user_auth_info.model_copy(deep=True)
        different_sample_user_auth_info.id = "user321"

        with patch(
            "src.service.authorize_operation", new_callable=AsyncMock
        ) as mock_authorizer:
            mock_authorizer.side_effect = AuthError()
            with pytest.raises(AuthError):
                await mock_tasks_service.get_tasks_by_user_id(
                    "user123",
                    10,
                    cont_token=None,
                    getter=different_sample_user_auth_info,
                )


class TestServiceUpdateTask:
    @pytest.mark.asyncio
    async def test_update_task_success(
        self,
        mock_db,
        mock_tasks_service,
        sample_task_in_db,
        sample_task,
        sample_user_auth_info,
    ):
        mock_db.get_task_by_id.return_value = sample_task_in_db
        new_task_in_db = sample_task_in_db.model_copy(deep=True)
        new_task_in_db.name = "New Name"
        mock_db.update_task.return_value = new_task_in_db

        result = await mock_tasks_service.update_task(
            TaskUpdate(id="task123", name="New Name"), sample_user_auth_info
        )

        assert isinstance(result, TaskInDB)
        assert result.id == "task123"
        assert result.name == "New Name"

    @pytest.mark.asyncio
    async def test_update_task_not_authorized(
        self,
        mock_db,
        mock_tasks_service,
        sample_task_in_db,
        sample_task,
        sample_user_auth_info,
    ):
        different_sample_user_auth_info = sample_user_auth_info.model_copy(deep=True)
        different_sample_user_auth_info.id = "user321"

        with patch(
            "src.service.authorize_operation", new_callable=AsyncMock
        ) as mock_authorizer:
            mock_authorizer.side_effect = AuthError()
            with pytest.raises(AuthError):
                await mock_tasks_service.update_task(
                    TaskUpdate(id="task123", name="New Name"),
                    different_sample_user_auth_info,
                )


class TestServiceDeleteTask:
    @pytest.mark.asyncio
    async def test_delete_task_success(
        self,
        mock_db,
        mock_tasks_service,
        sample_task_in_db,
        sample_task,
        sample_user_auth_info,
    ):
        mock_db.get_task_by_id.return_value = sample_task_in_db
        await mock_tasks_service.delete_task("task123", sample_user_auth_info)

    @pytest.mark.asyncio
    async def test_delete_task_not_authorized(
        self,
        mock_db,
        mock_tasks_service,
        sample_task_in_db,
        sample_task,
        sample_user_auth_info,
    ):
        different_sample_user_auth_info = sample_user_auth_info.model_copy(deep=True)
        different_sample_user_auth_info.id = "user321"

        with patch(
            "src.service.authorize_operation", new_callable=AsyncMock
        ) as mock_authorizer:
            mock_db.get_task_by_id.return_value = sample_task_in_db
            mock_authorizer.side_effect = AuthError()
            with pytest.raises(AuthError):
                await mock_tasks_service.delete_task(
                    "task123", different_sample_user_auth_info
                )
