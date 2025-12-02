from unittest.mock import Mock

import pytest
from azure.cosmos import exceptions
from shared.exceptions.db import (
    GeneralQueryError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.testing import AsyncIteratorMock

from src.models import Friendship, FriendshipStatus


class TestDBCreateFriendship:
    @pytest.mark.asyncio
    async def test_request_friendship_success(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_container.create_item.return_value = sample_friendship.model_dump(
            mode="json"
        )
        await mock_friends_db.request_friendship("user123", "user321")

    @pytest.mark.asyncio
    async def test_request_friendship_unexpected_error(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_container.create_item.side_effect = Exception()
        with pytest.raises(RecordCreationError):
            await mock_friends_db.request_friendship("user123", "user321")


class TestDBFindFriendshipBetweenXAndY:
    @pytest.mark.asyncio
    async def test_find_friendship_success(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_container.query_items = Mock()
        mock_container.query_items.return_value = AsyncIteratorMock([sample_friendship])
        await mock_friends_db.find_friendship("user123", "user321")

    @pytest.mark.asyncio
    async def test_find_friendship_not_found(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_container.query_items = Mock()
        mock_container.query_items.side_effect = RecordNotFoundError()
        with pytest.raises(RecordNotFoundError):
            await mock_friends_db.find_friendship("user123", "user321")

    @pytest.mark.asyncio
    async def test_find_friendship_not_found_cosmos(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_container.query_items = Mock()
        mock_container.query_items.side_effect = (
            exceptions.CosmosResourceNotFoundError()
        )
        with pytest.raises(RecordNotFoundError):
            await mock_friends_db.find_friendship("user123", "user321")

    @pytest.mark.asyncio
    async def test_find_friendship_unexpected_error(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_container.query_items = Mock()
        mock_container.query_items.side_effect = Exception()
        with pytest.raises(GeneralQueryError):
            await mock_friends_db.find_friendship("user123", "user321")


class TestDBGetFriendshipByID:
    @pytest.mark.asyncio
    async def test_get_friendship_by_id_success(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_container.read_item.return_value = sample_friendship.model_dump(
            mode="json"
        )
        await mock_friends_db.get_by_id("friendship123")

    @pytest.mark.asyncio
    async def test_get_friendship_by_id_not_found(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_container.read_item.side_effect = exceptions.CosmosResourceNotFoundError()
        with pytest.raises(RecordNotFoundError):
            await mock_friends_db.get_by_id("friendship123")

    @pytest.mark.asyncio
    async def test_get_friendship_by_id_unexpected_error(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_container.read_item.side_effect = Exception()
        with pytest.raises(GeneralQueryError):
            await mock_friends_db.get_by_id("friendship123")


class TestDBListFriendshipsOfUser:
    @pytest.mark.asyncio
    async def test_list_friendships_success(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_pager = AsyncIteratorMock(
            [
                AsyncIteratorMock(
                    [
                        sample_friendship.model_dump(mode="json"),
                        sample_friendship.model_dump(mode="json"),
                    ]
                ),
                [sample_friendship.model_dump(mode="json")],
            ]
        )
        mock_pager.continuation_token = "cont_token"  # ty: ignore

        mock_iteratable = Mock()
        mock_iteratable.by_page.return_value = mock_pager

        mock_container.query_items = Mock()
        mock_container.query_items.return_value = mock_iteratable

        items, cont_token = await mock_friends_db.list_friendships("user123", 1)
        assert isinstance(items, list)
        assert len(items) > 0
        assert isinstance(items[0], Friendship)

    @pytest.mark.asyncio
    async def test_list_friendships_async_end(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_pager = AsyncIteratorMock([])
        mock_pager.continuation_token = "cont_token"  # ty: ignore

        mock_iteratable = Mock()
        mock_iteratable.by_page.return_value = mock_pager

        mock_container.query_items = Mock()
        mock_container.query_items.return_value = mock_iteratable
        items, cont_token = await mock_friends_db.list_friendships("user123", 1)

    @pytest.mark.asyncio
    async def test_list_friendships_not_found(self, mock_container, mock_friends_db):
        mock_container.query_items = Mock()
        mock_container.query_items.side_effect = (
            exceptions.CosmosResourceNotFoundError()
        )
        with pytest.raises(RecordNotFoundError):
            items, _ = await mock_friends_db.list_friendships("user123", 1)

    @pytest.mark.asyncio
    async def test_list_friendships_unexpected_error(
        self, mock_container, mock_friends_db
    ):
        mock_container.query_items = Mock()
        mock_container.query_items.side_effect = Exception()
        with pytest.raises(GeneralQueryError):
            items, _ = await mock_friends_db.list_friendships("user123", 1)


class TestDBListIncomingRequestsToUser:
    @pytest.mark.asyncio
    async def test_list_incoming_success(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_pager = AsyncIteratorMock(
            [
                AsyncIteratorMock(
                    [
                        sample_friendship.model_dump(mode="json"),
                        sample_friendship.model_dump(mode="json"),
                    ]
                ),
                [sample_friendship.model_dump(mode="json")],
            ]
        )
        mock_pager.continuation_token = "cont_token"  # ty: ignore

        mock_iteratable = Mock()
        mock_iteratable.by_page.return_value = mock_pager

        mock_container.query_items = Mock()
        mock_container.query_items.return_value = mock_iteratable
        items, _ = await mock_friends_db.list_incoming("user123", 1)
        assert isinstance(items, list)
        assert len(items) > 0
        assert isinstance(items[0], Friendship)

    @pytest.mark.asyncio
    async def test_list_incoming_async_end(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_pager = AsyncIteratorMock([])
        mock_pager.continuation_token = "cont_token"  # ty: ignore

        mock_iteratable = Mock()
        mock_iteratable.by_page.return_value = mock_pager

        mock_container.query_items = Mock()
        mock_container.query_items.return_value = mock_iteratable
        items, cont_token = await mock_friends_db.list_incoming("user123", 1)

    @pytest.mark.asyncio
    async def test_list_incoming_not_found(self, mock_container, mock_friends_db):
        mock_container.query_items = Mock()
        mock_container.query_items.side_effect = (
            exceptions.CosmosResourceNotFoundError()
        )
        with pytest.raises(RecordNotFoundError):
            items, _ = await mock_friends_db.list_incoming("user123", 1)

    @pytest.mark.asyncio
    async def test_list_incoming_unexpected_error(
        self, mock_container, mock_friends_db
    ):
        mock_container.query_items = Mock()
        mock_container.query_items.side_effect = Exception()
        with pytest.raises(GeneralQueryError):
            items, _ = await mock_friends_db.list_incoming("user123", 1)


class TestDBListOutgoingRequestsFromUser:
    @pytest.mark.asyncio
    async def test_list_outgoing_success(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_pager = AsyncIteratorMock(
            [
                AsyncIteratorMock(
                    [
                        sample_friendship.model_dump(mode="json"),
                        sample_friendship.model_dump(mode="json"),
                    ]
                ),
                [sample_friendship.model_dump(mode="json")],
            ]
        )
        mock_pager.continuation_token = "cont_token"  # ty: ignore

        mock_iteratable = Mock()
        mock_iteratable.by_page.return_value = mock_pager

        mock_container.query_items = Mock()
        mock_container.query_items.return_value = mock_iteratable
        items, _ = await mock_friends_db.list_outgoing("user123", 1)
        assert isinstance(items, list)
        assert len(items) > 0
        assert isinstance(items[0], Friendship)

    @pytest.mark.asyncio
    async def test_list_outgoing_async_end(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_pager = AsyncIteratorMock([])
        mock_pager.continuation_token = "cont_token"  # ty: ignore

        mock_iteratable = Mock()
        mock_iteratable.by_page.return_value = mock_pager

        mock_container.query_items = Mock()
        mock_container.query_items.return_value = mock_iteratable
        items, cont_token = await mock_friends_db.list_outgoing("user123", 1)

    @pytest.mark.asyncio
    async def test_list_outgoing_not_found(self, mock_container, mock_friends_db):
        mock_container.query_items = Mock()
        mock_container.query_items.side_effect = exceptions.CosmosResourceNotFoundError
        with pytest.raises(RecordNotFoundError):
            items, _ = await mock_friends_db.list_outgoing("user123", 1)

    @pytest.mark.asyncio
    async def test_list_outgoing_unexpected_error(
        self, mock_container, mock_friends_db
    ):
        mock_container.query_items = Mock()
        mock_container.query_items.side_effect = Exception()
        with pytest.raises(GeneralQueryError):
            items, _ = await mock_friends_db.list_outgoing("user123", 1)


class TestDBUpdateFriendship:
    @pytest.mark.asyncio
    async def test_update_friendship_success(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_container.patch_item.return_value = sample_friendship.model_dump(
            mode="json"
        )
        await mock_friends_db.update_status("friendship123", FriendshipStatus.ACCEPTED)

    @pytest.mark.asyncio
    async def test_update_friendship_not_found(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_container.patch_item.side_effect = exceptions.CosmosResourceNotFoundError()
        with pytest.raises(RecordNotFoundError):
            await mock_friends_db.update_status(
                "friendship123", FriendshipStatus.ACCEPTED
            )

    @pytest.mark.asyncio
    async def test_update_friendship_unexpected_error(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_container.patch_item.side_effect = Exception()
        with pytest.raises(RecordUpdateError):
            await mock_friends_db.update_status(
                "friendship123", FriendshipStatus.ACCEPTED
            )


class TestDBDeleteFriendship:
    @pytest.mark.asyncio
    async def test_delete_friendship_success(
        self,
        mock_container,
        mock_friends_db,
    ):
        await mock_friends_db.delete_friendship("friendship123")

    @pytest.mark.asyncio
    async def test_update_friendship_not_found(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_container.delete_item.side_effect = (
            exceptions.CosmosResourceNotFoundError()
        )
        with pytest.raises(RecordNotFoundError):
            await mock_friends_db.delete_friendship("friendship123")

    @pytest.mark.asyncio
    async def test_update_friendship_unexpected_error(
        self, mock_container, mock_friends_db, sample_friendship
    ):
        mock_container.delete_item.side_effect = Exception()
        with pytest.raises(RecordDeletionError):
            await mock_friends_db.delete_friendship("friendship123")
