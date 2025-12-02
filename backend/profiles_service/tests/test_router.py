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

from src.models import ProfileUpdate


class TestRouterCreateProfile:
    @pytest.mark.asyncio
    async def test_create_profile_success(self, client):
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"
            response = client.post(
                "/user123", headers={"X-Interservice-Key": "valid_key"}
            )

        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_create_profile_invalid_interservice_key(self, client):
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"
            response = client.post(
                "/user123", headers={"X-Interservice-Key": "invalid_key"}
            )

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_profile_already_exists(self, client, mock_service):
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"
            mock_service.create_profile.side_effect = RecordAlreadyExistsError()
            response = client.post(
                "/user123", headers={"X-Interservice-Key": "valid_key"}
            )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_create_profile_creation_error(self, client, mock_service):
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"
            mock_service.create_profile.side_effect = RecordCreationError()
            response = client.post(
                "/user123", headers={"X-Interservice-Key": "valid_key"}
            )

        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_create_profile_unexpected(self, client, mock_service):
        with patch("src.router.shared_settings") as mock_settings:
            mock_settings.INTERSERVICE_KEY = "valid_key"
            mock_service.create_profile.side_effect = Exception()
            response = client.post(
                "/user123", headers={"X-Interservice-Key": "valid_key"}
            )

        assert response.status_code == 500


class TestRouterGetProfile:
    @pytest.mark.asyncio
    async def test_get_profile_success(self, sample_profile, mock_service, client):
        mock_service.get_profile.return_value = sample_profile
        response = client.get("/user123")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_profile_not_found(self, sample_profile, mock_service, client):
        mock_service.get_profile.side_effect = RecordNotFoundError()
        response = client.get("/user123")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_profile_query_error(self, sample_profile, mock_service, client):
        mock_service.get_profile.side_effect = GeneralQueryError()
        response = client.get("/user123")
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_get_profile_unexpected_error(
        self, sample_profile, mock_service, client
    ):
        mock_service.get_profile.side_effect = Exception()
        response = client.get("/user123")
        assert response.status_code == 500


class TestRouterUpdateProfile:
    @pytest.mark.asyncio
    async def test_update_profile_success(self, client):
        response = client.patch(
            "/",
            json=ProfileUpdate(user_id="user123", bio="new bio").model_dump(
                mode="json"
            ),
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_profile_not_authorized(self, mock_service, client):
        mock_service.update_profile.side_effect = AuthError()
        response = client.patch(
            "/",
            json=ProfileUpdate(user_id="user321", bio="new bio").model_dump(
                mode="json"
            ),
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_update_profile_not_found(self, mock_service, client):
        mock_service.update_profile.side_effect = RecordNotFoundError()
        response = client.patch(
            "/",
            json=ProfileUpdate(user_id="nonexistent", bio="new bio").model_dump(
                mode="json"
            ),
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_profile_empty_update(self, mock_service, client):
        mock_service.update_profile.side_effect = EmptyRecordUpdateError()
        response = client.patch(
            "/", json=ProfileUpdate(user_id="user123").model_dump(mode="json")
        )
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_update_profile_update_error(self, mock_service, client):
        mock_service.update_profile.side_effect = RecordUpdateError()
        response = client.patch(
            "/",
            json=ProfileUpdate(user_id="user123", bio="new bio").model_dump(
                mode="json"
            ),
        )
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_update_profile_unexpected_error(self, mock_service, client):
        mock_service.update_profile.side_effect = Exception()
        response = client.patch(
            "/",
            json=ProfileUpdate(user_id="user123", bio="new bio").model_dump(
                mode="json"
            ),
        )
        assert response.status_code == 500


class TestRouterDeleteProfile:
    @pytest.mark.asyncio
    async def test_delete_profile_success(self, client):
        response = client.delete("/user123")
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_profile_not_authorized(self, mock_service, client):
        mock_service.delete_profile.side_effect = AuthError()
        response = client.delete("/user321")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_profile_not_found(self, mock_service, client):
        mock_service.delete_profile.side_effect = RecordNotFoundError()
        response = client.delete("/user321")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_profile_delete_error(self, mock_service, client):
        mock_service.delete_profile.side_effect = RecordDeletionError()
        response = client.delete("/user123")
        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_update_profile_unexpected_error(self, mock_service, client):
        mock_service.delete_profile.side_effect = Exception()
        response = client.delete("/user123")
        assert response.status_code == 500
