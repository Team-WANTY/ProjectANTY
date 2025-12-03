from unittest.mock import patch

import pytest
from fastapi import HTTPException
from shared.auth import (
    AuthError,
    UserInDB,
    authorize_operation,
    get_current_user,
    get_user_from_id,
    get_user_id_from_auth_service,
)


class TestGetUserIDFromAuth:
    @pytest.mark.asyncio
    async def test_get_user_id_success(self, httpx_mock, sample_user_in_db):
        httpx_mock.add_response(method="GET", json={"user_id": "user123"})

        result = await get_user_id_from_auth_service("token")
        assert "user123" in result

    @pytest.mark.asyncio
    async def test_get_user_id_fail(self, httpx_mock, sample_user_in_db):
        httpx_mock.add_response(method="GET", status_code=404)

        with pytest.raises(HTTPException):
            await get_user_id_from_auth_service("nonexistent")


class TestGetUserFromID:
    @pytest.mark.asyncio
    async def test_get_user_from_id_success(self, httpx_mock, sample_user_in_db):
        httpx_mock.add_response(
            method="GET", json=sample_user_in_db.model_dump(mode="json")
        )
        result = await get_user_from_id("user123")
        assert isinstance(result, UserInDB)

    @pytest.mark.asyncio
    async def test_get_user_from_id_fail(self, httpx_mock, sample_user_in_db):
        httpx_mock.add_response(method="GET", status_code=404)

        with pytest.raises(HTTPException):
            await get_user_from_id("user123")


class TestGetCurrentUser:
    @pytest.mark.asyncio
    async def test_get_current_user_success(self, httpx_mock, sample_user_in_db):
        with patch("shared.auth.oauth2_scheme", return_value="token"):
            with patch(
                "shared.auth.get_user_id_from_auth_service", return_value="user123"
            ):
                with patch(
                    "shared.auth.get_user_from_id", return_value=sample_user_in_db
                ):
                    result = await get_current_user()
                    print(type(result))
                    print(UserInDB)
                    assert isinstance(result, UserInDB)

    @pytest.mark.asyncio
    async def test_get_current_user_not_active(self, httpx_mock, sample_user_in_db):
        new_user_in_db = sample_user_in_db.model_copy(deep=True)
        new_user_in_db.is_active = False
        with patch("shared.auth.oauth2_scheme", return_value="token"):
            with patch(
                "shared.auth.get_user_id_from_auth_service", return_value="user123"
            ):
                with patch("shared.auth.get_user_from_id", return_value=new_user_in_db):
                    with pytest.raises(HTTPException):
                        await get_current_user()


class TestAuthorizeOperation:
    @pytest.mark.asyncio
    async def test_authorize_operation_success(self, sample_user_in_db):
        await authorize_operation(sample_user_in_db, "user123")

    @pytest.mark.asyncio
    async def test_authorize_operation_not_same(self, sample_user_in_db):
        with pytest.raises(AuthError):
            await authorize_operation(sample_user_in_db, "user321")

    @pytest.mark.asyncio
    async def test_authorize_operation_not_same_superuser(self, sample_user_in_db):
        new_user_in_db = sample_user_in_db.model_copy(deep=True)
        new_user_in_db.is_superuser = True
        await authorize_operation(new_user_in_db, "user321")
