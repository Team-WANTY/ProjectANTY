from unittest.mock import patch

import pytest
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    EmptyRecordUpdateError,
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)

from src.models import UserUpdate


# --- Tests for /me ---
class TestRouterMe:
    @pytest.mark.asyncio
    async def test_get_me_success(self, client, mock_service, sample_user_in_db):
        mock_service.get_user_by_id.return_value = sample_user_in_db

        response = client.get("/me")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_user_in_db.id


class TestRouterCreateUser:
    @pytest.mark.asyncio
    async def test_create_user_success(self, client, mock_service, sample_user_create):
        mock_service.create_user.return_value = None

        response = client.post("/", json=sample_user_create.model_dump(mode="json"))

        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_create_user_already_exists(
        self, client, mock_service, sample_user_create
    ):
        mock_service.create_user.side_effect = RecordAlreadyExistsError()

        response = client.post("/", json=sample_user_create.model_dump(mode="json"))

        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_create_user_creation_error(
        self, client, mock_service, sample_user_create
    ):
        mock_service.create_user.side_effect = RecordCreationError()

        response = client.post("/", json=sample_user_create.model_dump(mode="json"))

        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_create_user_unexpected_error(
        self, client, mock_service, sample_user_create
    ):
        mock_service.create_user.side_effect = Exception()

        response = client.post("/", json=sample_user_create.model_dump(mode="json"))

        assert response.status_code == 500


# --- Tests for /id/{user_id} ---
class TestRouterGetUserByID:
    @pytest.mark.asyncio
    async def test_get_user_by_id_success(
        self, client, mock_service, sample_user_in_db
    ):
        mock_service.get_user_by_id.return_value = sample_user_in_db
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/id/user123", headers={"X-Interservice-Key": "valid_key"}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_user_in_db.id

    @pytest.mark.asyncio
    async def test_get_user_by_id_interservice_key_fail(
        self, client, mock_service, sample_user_in_db
    ):
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/id/user123", headers={"X-Interservice-Key": "invalid_key"}
            )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_user_by_id_not_found(self, client, mock_service):
        mock_service.get_user_by_id.side_effect = RecordNotFoundError()

        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/id/user333", headers={"X-Interservice-Key": "valid_key"}
            )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_user_by_id_query_error(self, client, mock_service):
        mock_service.get_user_by_id.side_effect = GeneralQueryError()

        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/id/user123", headers={"X-Interservice-Key": "valid_key"}
            )
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_get_user_by_id_unexpected_error(self, client, mock_service):
        mock_service.get_user_by_id.side_effect = Exception()

        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/id/user123", headers={"X-Interservice-Key": "valid_key"}
            )
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_get_user_by_id_not_authorized(self, client, mock_service):
        mock_service.get_user_by_id.side_effect = AuthError()

        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/id/user123", headers={"X-Interservice-Key": "valid_key"}
            )
        assert response.status_code == 401


class TestRouterGetUserByUsername:
    @pytest.mark.asyncio
    async def test_get_user_by_username_success(
        self, client, mock_service, sample_user_in_db
    ):
        mock_service.get_user_by_username.return_value = sample_user_in_db
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/username/testuser", headers={"X-Interservice-Key": "valid_key"}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == sample_user_in_db.username

    @pytest.mark.asyncio
    async def test_get_user_by_username_interservice_key_fail(
        self, client, mock_service, sample_user_in_db
    ):
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/username/testuser", headers={"X-Interservice-Key": "invalid_key"}
            )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_user_by_username_not_found(self, client, mock_service):
        mock_service.get_user_by_username.side_effect = RecordNotFoundError()

        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/username/nonexistent", headers={"X-Interservice-Key": "valid_key"}
            )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_user_by_username_query_error(self, client, mock_service):
        mock_service.get_user_by_username.side_effect = GeneralQueryError()

        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/username/testuser", headers={"X-Interservice-Key": "valid_key"}
            )
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_get_user_by_username_unexpected_error(self, client, mock_service):
        mock_service.get_user_by_username.side_effect = Exception()

        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/username/testuser", headers={"X-Interservice-Key": "valid_key"}
            )
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_get_user_by_username_not_authorized(self, client, mock_service):
        mock_service.get_user_by_username.side_effect = AuthError()

        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/username/testuser", headers={"X-Interservice-Key": "valid_key"}
            )
        assert response.status_code == 401


class TestRouterGetUserByEmail:
    @pytest.mark.asyncio
    async def test_get_user_by_email_success(
        self, client, mock_service, sample_user_in_db
    ):
        mock_service.get_user_by_email.return_value = sample_user_in_db
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/email/test@gmail.com", headers={"X-Interservice-Key": "valid_key"}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == sample_user_in_db.email

    @pytest.mark.asyncio
    async def test_get_user_by_email_interservice_key_fail(
        self, client, mock_service, sample_user_in_db
    ):
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/email/test@gmail.com", headers={"X-Interservice-Key": "invalid_key"}
            )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_user_by_email_not_found(self, client, mock_service):
        mock_service.get_user_by_email.side_effect = RecordNotFoundError()

        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/email/nonexistent@gmail.com",
                headers={"X-Interservice-Key": "valid_key"},
            )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_user_by_email_query_error(self, client, mock_service):
        mock_service.get_user_by_email.side_effect = GeneralQueryError()

        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/email/test@gmail.com", headers={"X-Interservice-Key": "valid_key"}
            )
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_get_user_by_email_unexpected_error(self, client, mock_service):
        mock_service.get_user_by_email.side_effect = Exception()

        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/email/test@gmail.com", headers={"X-Interservice-Key": "valid_key"}
            )
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_get_user_by_email_not_authorized(self, client, mock_service):
        mock_service.get_user_by_email.side_effect = AuthError()

        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"

            response = client.get(
                "/email/test@gmail.com", headers={"X-Interservice-Key": "valid_key"}
            )
        assert response.status_code == 401


# --- Tests for PATCH / ---
class TestRouterUserUpdate:
    @pytest.mark.asyncio
    async def test_update_user_success_empty(
        self, client, mock_service, sample_user_in_db
    ):
        mock_service.update_user.return_value = sample_user_in_db
        user_update = UserUpdate(id="user123")

        response = client.patch("/", json=user_update.model_dump())
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_update_user_not_found(self, client, mock_service):
        mock_service.update_user.side_effect = RecordNotFoundError()
        user_update = UserUpdate(id="user123")

        response = client.patch("/", json=user_update.model_dump())
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_user_not_authorized(self, client, mock_service):
        mock_service.update_user.side_effect = AuthError()
        user_update = UserUpdate(id="user321")

        response = client.patch("/", json=user_update.model_dump())
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_update_user_update_error(self, client, mock_service):
        mock_service.update_user.side_effect = RecordUpdateError()
        user_update = UserUpdate(id="user321")

        response = client.patch("/", json=user_update.model_dump())
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_update_user_query_error(self, client, mock_service):
        mock_service.update_user.side_effect = GeneralQueryError()
        user_update = UserUpdate(id="user321")

        response = client.patch("/", json=user_update.model_dump())
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_update_user_unexpected_error(self, client, mock_service):
        mock_service.update_user.side_effect = Exception()
        user_update = UserUpdate(id="user321")

        response = client.patch("/", json=user_update.model_dump())
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_update_user_no_changes(self, client, mock_service):
        mock_service.update_user.side_effect = EmptyRecordUpdateError()
        user_update = UserUpdate(id="user321")

        response = client.patch("/", json=user_update.model_dump())
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_update_user_success_username(
        self, client, mock_service, sample_user_in_db
    ):
        new_sample_user_in_db = sample_user_in_db.model_copy(deep=True)
        new_sample_user_in_db.username = "newtestuser"
        mock_service.update_user.return_value = new_sample_user_in_db
        user_update = UserUpdate(id="user123", username="newtestuser")

        response = client.patch("/", json=user_update.model_dump())
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_update_user_success_email(
        self, client, mock_service, sample_user_in_db
    ):
        new_sample_user_in_db = sample_user_in_db.model_copy(deep=True)
        new_sample_user_in_db.email = "newtest@gmail.com"
        mock_service.update_user.return_value = new_sample_user_in_db
        user_update = UserUpdate(id="user123", email="newtest@gmail.com")

        response = client.patch("/", json=user_update.model_dump())
        assert response.status_code == 204


# --- Tests for DELETE /{user_id} ---
class TestRouterUserDelete:
    @pytest.mark.asyncio
    async def test_delete_user_success(self, client, mock_service):
        response = client.delete("/user123")
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_user_not_authorized(self, client, mock_service):
        mock_service.delete_user.side_effect = AuthError()
        response = client.delete("/user123")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_user_not_found(self, client, mock_service):
        mock_service.delete_user.side_effect = RecordNotFoundError()
        response = client.delete("/user123")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_user_delete_error(self, client, mock_service):
        mock_service.delete_user.side_effect = RecordDeletionError()
        response = client.delete("/user123")
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_delete_user_unexpected_error(self, client, mock_service):
        mock_service.delete_user.side_effect = Exception()
        response = client.delete("/user123")
        assert response.status_code == 500
