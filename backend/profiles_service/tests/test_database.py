from unittest.mock import ANY

import pytest
from azure.cosmos import exceptions
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


class TestDBCreateProfile:
    @pytest.mark.asyncio
    async def test_create_profile_success(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        mock_container.create_item.return_value = sample_profile.model_dump(mode="json")
        await mock_profiles_db.create_profile("user123")

    @pytest.mark.asyncio
    async def test_create_profile_already_exists(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        mock_container.create_item.side_effect = exceptions.CosmosResourceExistsError
        with pytest.raises(RecordAlreadyExistsError):
            await mock_profiles_db.create_profile("user123")

    @pytest.mark.asyncio
    async def test_create_profile_creation_error(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        mock_container.create_item.side_effect = Exception()
        with pytest.raises(RecordCreationError):
            await mock_profiles_db.create_profile("user123")


class TestDBGetProfile:
    @pytest.mark.asyncio
    async def test_get_profile_success(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        mock_container.read_item.return_value = sample_profile.model_dump(mode="json")
        await mock_profiles_db.get_profile("user123")

    @pytest.mark.asyncio
    async def test_get_profile_not_found(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        mock_container.read_item.side_effect = exceptions.CosmosResourceNotFoundError
        with pytest.raises(RecordNotFoundError):
            await mock_profiles_db.get_profile("user123")

    @pytest.mark.asyncio
    async def test_get_profile_query_error(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        mock_container.read_item.side_effect = Exception()
        with pytest.raises(GeneralQueryError):
            await mock_profiles_db.get_profile("user123")


class TestDBUpdateProfile:
    @pytest.mark.asyncio
    async def test_update_profile_bio(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        update = ProfileUpdate(user_id="user123", bio="new bio")
        new_profile = sample_profile.model_copy(deep=True)
        new_profile.bio = "new bio"
        mock_container.patch_item.return_value = new_profile
        await mock_profiles_db.update_profile(update)

        mock_container.patch_item.assert_called_once_with(
            item="user123",
            partition_key="user123",
            patch_operations=[
                {"op": "replace", "path": "/bio", "value": "new bio"},
                ANY,
            ],
        )

    @pytest.mark.asyncio
    async def test_update_profile_avatar_image_id(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        update = ProfileUpdate(user_id="user123", avatar_image_id="newid")
        new_profile = sample_profile.model_copy(deep=True)
        new_profile.avatar_image_id = "newid"
        mock_container.patch_item.return_value = new_profile
        await mock_profiles_db.update_profile(update)

        mock_container.patch_item.assert_called_once_with(
            item="user123",
            partition_key="user123",
            patch_operations=[
                {"op": "replace", "path": "/avatar_image_id", "value": "newid"},
                ANY,
            ],
        )

    @pytest.mark.asyncio
    async def test_update_profile_equipped_badges(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        update = ProfileUpdate(user_id="user123", equipped_badges=["1", "2"])
        new_profile = sample_profile.model_copy(deep=True)
        new_profile.equipped_badges = ["1", "2"]
        mock_container.patch_item.return_value = new_profile
        await mock_profiles_db.update_profile(update)

        mock_container.patch_item.assert_called_once_with(
            item="user123",
            partition_key="user123",
            patch_operations=[
                {"op": "replace", "path": "/equipped_badges", "value": ["1", "2"]},
                ANY,
            ],
        )

    @pytest.mark.asyncio
    async def test_update_profile_equipped_analytics(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        update = ProfileUpdate(user_id="user123", equipped_analytics=["1", "2"])
        new_profile = sample_profile.model_copy(deep=True)
        new_profile.equipped_analytics = ["1", "2"]
        mock_container.patch_item.return_value = new_profile
        await mock_profiles_db.update_profile(update)

        mock_container.patch_item.assert_called_once_with(
            item="user123",
            partition_key="user123",
            patch_operations=[
                {"op": "replace", "path": "/equipped_analytics", "value": ["1", "2"]},
                ANY,
            ],
        )

    @pytest.mark.asyncio
    async def test_update_profile_unlocked_analytics(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        update = ProfileUpdate(user_id="user123", unlocked_analytics=["1", "2"])
        new_profile = sample_profile.model_copy(deep=True)
        new_profile.unlocked_analytics = ["1", "2"]
        mock_container.patch_item.return_value = new_profile
        await mock_profiles_db.update_profile(update)

        mock_container.patch_item.assert_called_once_with(
            item="user123",
            partition_key="user123",
            patch_operations=[
                {"op": "replace", "path": "/unlocked_analytics", "value": ["1", "2"]},
                ANY,
            ],
        )

    @pytest.mark.asyncio
    async def test_update_profile_unlocked_badges(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        update = ProfileUpdate(user_id="user123", unlocked_badges=["1", "2"])
        new_profile = sample_profile.model_copy(deep=True)
        new_profile.unlocked_badges = ["1", "2"]
        mock_container.patch_item.return_value = new_profile
        await mock_profiles_db.update_profile(update)

        mock_container.patch_item.assert_called_once_with(
            item="user123",
            partition_key="user123",
            patch_operations=[
                {"op": "replace", "path": "/unlocked_badges", "value": ["1", "2"]},
                ANY,
            ],
        )

    @pytest.mark.asyncio
    async def test_update_profile_timestamp_updated(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        update = ProfileUpdate(user_id="user123", bio="newbio")
        new_profile = sample_profile.model_copy(deep=True)
        new_profile.bio = "newbio"
        mock_container.patch_item.return_value = new_profile
        await mock_profiles_db.update_profile(update)

        mock_container.patch_item.assert_called_once_with(
            item="user123",
            partition_key="user123",
            patch_operations=[
                ANY,
                {"op": "replace", "path": "/updated_at", "value": ANY},
            ],
        )

    @pytest.mark.asyncio
    async def test_update_profile_empty(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        update = ProfileUpdate(user_id="user123")

        with pytest.raises(EmptyRecordUpdateError):
            await mock_profiles_db.update_profile(update)

    @pytest.mark.asyncio
    async def test_update_profile_not_found(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        update = ProfileUpdate(user_id="user123", bio="newbio")
        mock_container.patch_item.side_effect = exceptions.CosmosResourceNotFoundError
        with pytest.raises(RecordNotFoundError):
            await mock_profiles_db.update_profile(update)

    @pytest.mark.asyncio
    async def test_update_profile_update_error(
        self, mock_container, mock_profiles_db, sample_profile
    ):
        update = ProfileUpdate(user_id="user123", bio="newbio")
        mock_container.patch_item.side_effect = Exception()
        with pytest.raises(RecordUpdateError):
            await mock_profiles_db.update_profile(update)


class TestDBDeleteProfile:
    @pytest.mark.asyncio
    async def test_delete_profile_success(self, mock_container, mock_profiles_db):
        mock_container.delete_item.return_value = None
        await mock_profiles_db.delete_profile("user123")

    @pytest.mark.asyncio
    async def test_delete_profile_not_found(self, mock_container, mock_profiles_db):
        mock_container.delete_item.side_effect = (
            exceptions.CosmosResourceNotFoundError()
        )

        with pytest.raises(RecordNotFoundError):
            await mock_profiles_db.delete_profile("user123")

    @pytest.mark.asyncio
    async def test_delete_profile_deletion_error(
        self, mock_container, mock_profiles_db
    ):
        mock_container.delete_item.side_effect = Exception()

        with pytest.raises(RecordDeletionError):
            await mock_profiles_db.delete_profile("user123")
