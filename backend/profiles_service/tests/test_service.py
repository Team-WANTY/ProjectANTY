from unittest.mock import AsyncMock

import pytest
from shared.auth import AuthError
from shared.exceptions.db import RecordAlreadyExistsError, RecordNotFoundError

from src.models import ProfileUpdate


class TestServiceCreateProfile:
    @pytest.mark.asyncio
    async def test_create_profile_success(self, mock_db, mock_profiles_service):
        mock_profiles_service.get_profile = AsyncMock(side_effect=RecordNotFoundError())
        await mock_profiles_service.create_profile("user123")

    @pytest.mark.asyncio
    async def test_create_profile_already_exists(
        self, mock_db, mock_profiles_service, sample_profile
    ):
        mock_profiles_service.get_profile = AsyncMock(return_value=sample_profile)

        with pytest.raises(RecordAlreadyExistsError):
            await mock_profiles_service.create_profile("user123")


class TestServiceGetProfile:
    @pytest.mark.asyncio
    async def test_get_profile_success(
        self, mock_db, mock_profiles_service, sample_profile
    ):
        mock_db.get_profile.return_value = sample_profile
        await mock_profiles_service.get_profile("user123")


class TestServiceUpdateProfile:
    @pytest.mark.asyncio
    async def test_update_profile_success(
        self, mock_db, mock_profiles_service, sample_user_in_db
    ):
        await mock_profiles_service.update_profile(
            ProfileUpdate(user_id="user123", bio="new bio"), sample_user_in_db
        )

    @pytest.mark.asyncio
    async def test_update_profile_other_user(
        self, mock_db, mock_profiles_service, sample_user_in_db
    ):
        with pytest.raises(AuthError):
            await mock_profiles_service.update_profile(
                ProfileUpdate(user_id="user321", bio="new bio"), sample_user_in_db
            )

    @pytest.mark.asyncio
    async def test_update_profile_other_user_superuser(
        self, mock_db, mock_profiles_service, sample_user_in_db
    ):
        superuser = sample_user_in_db.model_copy(deep=True)
        superuser.is_superuser = True
        await mock_profiles_service.update_profile(
            ProfileUpdate(user_id="user321", bio="new bio"), superuser
        )

    @pytest.mark.asyncio
    async def test_update_profile_restricted_not_superuser(
        self, mock_db, mock_profiles_service, sample_user_in_db
    ):
        await mock_profiles_service.update_profile(
            ProfileUpdate(
                user_id="user123",
                unlocked_analytics=["1", "2"],
                unlocked_badges=["1", "2"],
            ),
            sample_user_in_db,
        )
        mock_db.update_profile.assert_called_once_with(ProfileUpdate(user_id="user123"))

    @pytest.mark.asyncio
    async def test_update_profile_restricted_superuser(
        self, mock_db, mock_profiles_service, sample_user_in_db
    ):
        superuser = sample_user_in_db.model_copy(deep=True)
        superuser.is_superuser = True
        await mock_profiles_service.update_profile(
            ProfileUpdate(
                user_id="user123",
                unlocked_analytics=["1", "2"],
                unlocked_badges=["1", "2"],
            ),
            superuser,
        )
        mock_db.update_profile.assert_called_once_with(
            ProfileUpdate(
                user_id="user123",
                unlocked_analytics=["1", "2"],
                unlocked_badges=["1", "2"],
            )
        )


class TestServiceDeleteProfile:
    @pytest.mark.asyncio
    async def test_delete_profile_success_self(
        self, mock_profiles_service, sample_user_in_db
    ):
        await mock_profiles_service.delete_profile("user123", sample_user_in_db)

    @pytest.mark.asyncio
    async def test_delete_profile_success_other_superuser(
        self, mock_profiles_service, sample_user_in_db
    ):
        superuser = sample_user_in_db.model_copy(deep=True)
        superuser.is_superuser = True
        await mock_profiles_service.delete_profile("user321", superuser)

    @pytest.mark.asyncio
    async def test_delete_profile_fail_other_superuser(
        self, mock_profiles_service, sample_user_in_db
    ):
        with pytest.raises(AuthError):
            await mock_profiles_service.delete_profile("user321", sample_user_in_db)
