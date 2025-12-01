from unittest.mock import patch

import pytest
from azure.cosmos import exceptions
from shared.exceptions.db import (
    EmptyRecordUpdateError,
    RecordNotFoundError,
    RecordUpdateError,
)

from src.exceptions import AuthOldAndNewPasswordSameError
from src.models import UserAuthUpdate


class TestDBUpdateAuth:
    """Tests for update_auth method"""

    class TestDBUpdateAuthPassword:
        @pytest.mark.asyncio
        async def test_update_password_success(
            self, mock_auth_db, mock_container, sample_user_in_db
        ):
            auth_update = UserAuthUpdate(
                id="user123", plain_text_password="NewPassword123!"
            )

            updated_item = sample_user_in_db.model_copy(deep=True)
            updated_item.hashed_password = "new_hashed_password"
            mock_container.patch_item.return_value = updated_item.model_dump()

            with patch("src.database.pwdhasher.verify", return_value=False):
                await mock_auth_db.update_auth(sample_user_in_db, auth_update)

        @pytest.mark.asyncio
        async def test_update_password_same_as_old(
            self, mock_auth_db, mock_container, sample_user_in_db
        ):
            auth_update = UserAuthUpdate(
                id="user123", plain_text_password="OldPassword123!"
            )

            with patch("src.database.pwdhasher.verify", return_value=True):
                with pytest.raises(AuthOldAndNewPasswordSameError):
                    await mock_auth_db.update_auth(sample_user_in_db, auth_update)

        @pytest.mark.xfail
        @pytest.mark.asyncio
        async def test_update_password_requirements_not_met(
            self, mock_auth_db, mock_container, sample_user_in_db
        ):
            raise ValueError()

    @pytest.mark.asyncio
    async def test_update_is_active(
        self, mock_auth_db, mock_container, sample_user_in_db
    ):
        auth_update = UserAuthUpdate(id="user123", is_active=False)

        updated_item = sample_user_in_db.model_copy(deep=True)
        updated_item.is_active = False
        mock_container.patch_item.return_value = updated_item.model_dump()

        await mock_auth_db.update_auth(sample_user_in_db, auth_update)

        # TODO check if patch_item received patch operation for is active

    @pytest.mark.asyncio
    async def test_update_is_superuser(
        self, mock_auth_db, mock_container, sample_user_in_db
    ):
        """Test updating is_superuser status"""
        auth_update = UserAuthUpdate(id="user123", is_superuser=True)

        updated_item = sample_user_in_db.model_copy(deep=True)
        updated_item.is_superuser = True
        mock_container.patch_item.return_value = updated_item.model_dump()

        await mock_auth_db.update_auth(sample_user_in_db, auth_update)

        # TODO check if patch_item received patch operation for is superuser

    @pytest.mark.asyncio
    async def test_update_no_changes(
        self, mock_auth_db, mock_container, sample_user_in_db
    ):
        with pytest.raises(EmptyRecordUpdateError):
            await mock_auth_db.update_auth(
                sample_user_in_db, UserAuthUpdate(id="user123")
            )

    @pytest.mark.asyncio
    async def test_update_user_not_found(
        self, mock_auth_db, mock_container, sample_user_in_db
    ):
        auth_update = UserAuthUpdate(
            id="user123", plain_text_password="NewPassword123!"
        )

        mock_container.patch_item.side_effect = exceptions.CosmosResourceNotFoundError(
            status_code=404, message="Not found"
        )

        with pytest.raises(RecordNotFoundError):
            await mock_auth_db.update_auth(sample_user_in_db, auth_update)

    @pytest.mark.asyncio
    async def test_update_unexpected_error(
        self, mock_auth_db, mock_container, sample_user_in_db
    ):
        auth_update = UserAuthUpdate(
            id="user123", plain_text_password="NewPassword123!"
        )

        mock_container.patch_item.side_effect = Exception("Unexpected error")

        with pytest.raises(RecordUpdateError):
            await mock_auth_db.update_auth(sample_user_in_db, auth_update)
