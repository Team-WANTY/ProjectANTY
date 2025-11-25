import pytest
from shared.db import now_timestamp
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)

from src.models import TaskUpdate


class TestRouterCreateTask:
    @pytest.mark.asyncio
    async def test_create_task_success(
        self, mock_service, client, sample_task_in_db, sample_task_create
    ):
        mock_service.create_task.return_value = sample_task_in_db

        response = client.post("/", content=sample_task_create.model_dump_json())

        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_create_task_not_authorized(
        self, mock_service, client, sample_task_in_db, sample_task_create
    ):
        new_sample_task = sample_task_create.model_copy(deep=True)
        new_sample_task.user_id = "user321"

        mock_service.create_task.side_effect = AuthError()
        response = client.post("/", content=new_sample_task.model_dump_json())

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_task_already_exists(
        self, mock_service, client, sample_task_create
    ):
        mock_service.create_task.side_effect = RecordAlreadyExistsError()

        response = client.post("/", content=sample_task_create.model_dump_json())

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_create_task_creation_error(
        self, mock_service, client, sample_task_create
    ):
        mock_service.create_task.side_effect = RecordCreationError()

        response = client.post("/", content=sample_task_create.model_dump_json())

        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_create_task_unexpected_error(
        self, mock_service, client, sample_task_create
    ):
        mock_service.create_task.side_effect = Exception()

        response = client.post("/", content=sample_task_create.model_dump_json())

        assert response.status_code == 500


class TestRouterGetTaskByID:
    @pytest.mark.asyncio
    async def test_get_task_by_id_success(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.get_task_by_id.return_value = sample_task_in_db

        response = client.get("/id/task123")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_task_in_db.id

    @pytest.mark.asyncio
    async def test_get_task_by_id_not_found(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.get_task_by_id.side_effect = RecordNotFoundError()

        response = client.get("/id/task123")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_task_by_id_not_authorized(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.get_task_by_id.side_effect = AuthError()

        response = client.get("/id/task123")

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_task_by_user_id_query_error(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.get_task_by_id.side_effect = GeneralQueryError()

        response = client.get("/id/task123")

        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_get_task_by_id_unxepected_error(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.get_task_by_id.side_effect = Exception()

        response = client.get("/id/task123")

        assert response.status_code == 500


class TestRouterGetUsersTasks:
    @pytest.mark.asyncio
    async def test_get_users_task_ids_in_range_success(
        self, mock_service, client, sample_task_in_db, sample_occurrences
    ):
        mock_service.get_users_task_ids_in_range.return_value = sample_occurrences

        response = client.get(
            "/user_id/user123",
            params={
                "start_date": now_timestamp().date(),
                "end_date": now_timestamp().date(),
            },
        )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_task_by_user_id_not_found(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.get_users_task_ids_in_range.side_effect = RecordNotFoundError()

        response = client.get(
            "/user_id/user123",
            params={
                "start_date": now_timestamp().date(),
                "end_date": now_timestamp().date(),
            },
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_task_by_user_id_not_authorized(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.get_users_task_ids_in_range.side_effect = AuthError()

        response = client.get(
            "/user_id/user123",
            params={
                "start_date": now_timestamp().date(),
                "end_date": now_timestamp().date(),
            },
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_task_by_user_id_query_error(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.get_users_task_ids_in_range.side_effect = GeneralQueryError()

        response = client.get(
            "/user_id/user123",
            params={
                "start_date": now_timestamp().date(),
                "end_date": now_timestamp().date(),
            },
        )

        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_get_task_by_user_id_unxepected_error(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.get_users_task_ids_in_range.side_effect = Exception()

        response = client.get(
            "/user_id/user123",
            params={
                "start_date": now_timestamp().date(),
                "end_date": now_timestamp().date(),
            },
        )

        assert response.status_code == 500


class TestRouterUpdateTask:
    @pytest.mark.asyncio
    async def test_update_task_success(self, mock_service, client, sample_task_in_db):
        new_sample_task_in_db = sample_task_in_db.model_copy(deep=True)
        new_sample_task_in_db.name = "New Name"
        mock_service.update_task.return_value = new_sample_task_in_db

        response = client.patch(
            "/", content=TaskUpdate(id="task123", name="New Name").model_dump_json()
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"

    @pytest.mark.asyncio
    async def test_update_task_not_authorized(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.update_task.side_effect = AuthError()

        response = client.patch(
            "/", content=TaskUpdate(id="task123", name="New Name").model_dump_json()
        )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_update_task_not_found(self, mock_service, client, sample_task_in_db):
        mock_service.update_task.side_effect = RecordNotFoundError()

        response = client.patch(
            "/", content=TaskUpdate(id="task123", name="New Name").model_dump_json()
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_task_update_error(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.update_task.side_effect = RecordUpdateError()

        response = client.patch(
            "/", content=TaskUpdate(id="task123", name="New Name").model_dump_json()
        )

        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_update_task_unexpected_error(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.update_task.side_effect = Exception()

        response = client.patch(
            "/", content=TaskUpdate(id="task123", name="New Name").model_dump_json()
        )

        assert response.status_code == 500


class TestRouterDeleteTask:
    @pytest.mark.asyncio
    async def test_delete_task_success(self, mock_service, client, sample_task_in_db):
        response = client.delete("/", params={"task_id": "task123"})

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_task_not_authorized(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.delete_task.side_effect = AuthError()

        response = client.delete("/", params={"task_id": "task123"})

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_task_not_found(self, mock_service, client, sample_task_in_db):
        mock_service.delete_task.side_effect = RecordNotFoundError()

        response = client.delete("/", params={"task_id": "task123"})

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_task_deletion_error(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.delete_task.side_effect = RecordDeletionError()

        response = client.delete("/", params={"task_id": "task123"})

        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_delete_task_unexpected_error(
        self, mock_service, client, sample_task_in_db
    ):
        mock_service.delete_task.side_effect = Exception()

        response = client.delete("/", params={"task_id": "task123"})

        assert response.status_code == 500
