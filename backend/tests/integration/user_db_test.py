# import pytest
# from azure.cosmos import exceptions

# from service.db.user import UsersDB
# from service.exceptions.user import (
#     UserExistsError,
#     UserNotFoundError,
#     UserUpdateInvalidPasswordError,
#     UserUpdateInvalidUsernameError,
# )
# from service.models.user import UserInDB, UserUpdate
# from service.security.password import get_password_hash, verify_password


# class AsyncIterableMock:
#     def __init__(self, items):
#         self._items = items

#     def __aiter__(self):
#         async def generator():
#             for item in self._items:
#                 yield item

#         return generator()


# class TestUsersDBOperations:
#     @pytest.mark.asyncio
#     async def test_create_user_success(
#         self, mock_cosmos_container, sample_user_in_db, sample_user_create
#     ):
#         """Test successful user creation"""
#         mock_cosmos_container.create_item.return_value = sample_user_in_db.model_dump()

#         result = await UsersDB(container=mock_cosmos_container).create_user(
#             sample_user_create
#         )

#         assert result is not None
#         assert isinstance(result, UserInDB)
#         assert result.email == sample_user_create.email
#         assert result.username == sample_user_create.username
#         assert verify_password(
#             sample_user_create.plain_text_password,
#             result.hashed_password,
#         )
#         mock_cosmos_container.create_item.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_create_user_duplicate(
#         self, mock_cosmos_container, sample_user_create
#     ):
#         """Test creating duplicate user raises error"""
#         mock_cosmos_container.create_item.side_effect = (
#             exceptions.CosmosHttpResponseError()
#         )

#         with pytest.raises(UserExistsError):
#             await UsersDB(container=mock_cosmos_container).create_user(
#                 sample_user_create
#             )
#         mock_cosmos_container.create_item.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_get_user_by_id_success(
#         self, mock_cosmos_container, sample_user_in_db
#     ):
#         """Test successful user retrieval by ID"""
#         mock_cosmos_container.read_item.return_value = sample_user_in_db.model_dump()

#         result = await UsersDB(container=mock_cosmos_container).get_user_by_id(
#             sample_user_in_db.id
#         )

#         assert result is not None
#         assert isinstance(result, UserInDB)
#         assert result.id == sample_user_in_db.id
#         mock_cosmos_container.read_item.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_get_user_by_id_not_found(self, mock_cosmos_container, mock_user_db):
#         """Test user not found by ID"""
#         mock_cosmos_container.read_item.side_effect = (
#             exceptions.CosmosResourceNotFoundError()
#         )

#         with pytest.raises(UserNotFoundError):
#             await UsersDB(container=mock_cosmos_container).get_user_by_id(
#                 "non-existent-id"
#             )
#         mock_cosmos_container.read_item.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_get_user_by_username_success(
#         self, mock_cosmos_container, sample_user_in_db
#     ):
#         """Test successful user retrieval by username"""
#         mock_cosmos_container.query_items.return_value = AsyncIterableMock(
#             [sample_user_in_db.model_dump()]
#         )

#         result = await UsersDB(container=mock_cosmos_container).get_user_by_username(
#             sample_user_in_db.username
#         )

#         assert result is not None
#         assert isinstance(result, UserInDB)
#         assert result.username == sample_user_in_db.username
#         mock_cosmos_container.query_items.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_get_user_by_username_not_found(
#         self, mock_cosmos_container, mock_user_db
#     ):
#         """Test user not found by username"""
#         mock_cosmos_container.query_items.return_value = AsyncIterableMock([])

#         with pytest.raises(UserNotFoundError):
#             await UsersDB(container=mock_cosmos_container).get_user_by_username(
#                 "nonexistent"
#             )
#         mock_cosmos_container.query_items.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_get_user_by_email_success(
#         self, mock_cosmos_container, sample_user_in_db
#     ):
#         """Test successful user retrieval by email"""
#         mock_cosmos_container.query_items.return_value = AsyncIterableMock(
#             [sample_user_in_db.model_dump()]
#         )

#         result = await UsersDB(container=mock_cosmos_container).get_user_by_email(
#             sample_user_in_db.email
#         )

#         assert result is not None
#         assert isinstance(result, UserInDB)
#         assert result.email == sample_user_in_db.email
#         mock_cosmos_container.query_items.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_get_user_by_email_not_found(
#         self, mock_cosmos_container, mock_user_db
#     ):
#         """Test user not found by email"""
#         mock_cosmos_container.query_items.return_value = AsyncIterableMock([])

#         with pytest.raises(UserNotFoundError):
#             await UsersDB(container=mock_cosmos_container).get_user_by_email(
#                 "user@nonexistent.com"
#             )
#         mock_cosmos_container.query_items.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_update_user_correct_id(
#         self, mock_cosmos_container, sample_user_in_db, sample_user
#     ):
#         sample_user_update = UserUpdate(id=sample_user.id)
#         updated_user_in_db = sample_user_in_db.model_copy(deep=True)
#         updated_user_in_db.id = sample_user_update.id

#         mock_cosmos_container.read_item.return_value = sample_user_in_db.model_dump()
#         mock_cosmos_container.patch_item.return_value = updated_user_in_db.model_dump()

#         result = await UsersDB(container=mock_cosmos_container).update_user(
#             sample_user_update
#         )

#         assert result is not None
#         assert isinstance(result, UserInDB)
#         assert result.id == sample_user_update.id
#         mock_cosmos_container.read_item.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_update_user_email(
#         self, mock_cosmos_container, sample_user_in_db, sample_user
#     ):
#         sample_user_update_email = UserUpdate(
#             id=sample_user.id, email="DIFFERENT" + sample_user.email
#         )
#         updated_user_in_db = sample_user_in_db.model_copy(deep=True)
#         updated_user_in_db.email = sample_user_update_email.email

#         mock_cosmos_container.read_item.return_value = sample_user_in_db.model_dump()
#         mock_cosmos_container.patch_item.return_value = updated_user_in_db.model_dump()

#         result = await UsersDB(container=mock_cosmos_container).update_user(
#             sample_user_update_email
#         )

#         assert result is not None
#         assert isinstance(result, UserInDB)
#         assert result.email == sample_user_update_email.email
#         assert result.email != sample_user_in_db.email
#         mock_cosmos_container.read_item.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_update_user_username(
#         self, mock_cosmos_container, sample_user_in_db, sample_user
#     ):
#         sample_user_update_username = UserUpdate(
#             id=sample_user.id, username="DIFFERENT" + sample_user.username
#         )
#         new_user_in_db = sample_user_in_db.model_copy(deep=True)
#         new_user_in_db.username = sample_user_update_username.username

#         mock_cosmos_container.read_item.return_value = sample_user_in_db.model_dump()
#         mock_cosmos_container.patch_item.return_value = new_user_in_db.model_dump()

#         result = await UsersDB(container=mock_cosmos_container).update_user(
#             sample_user_update_username
#         )

#         assert result is not None
#         assert isinstance(result, UserInDB)
#         assert result.username == sample_user_update_username.username
#         assert result.username != sample_user_in_db.username
#         mock_cosmos_container.patch_item.assert_called_once()

#     @pytest.mark.xfail(reason="Feature not implemented yet")
#     @pytest.mark.asyncio
#     @pytest.mark.parametrize(
#         "invalid_username",
#         [
#             "",  # empty
#             "a" * 51,  # too long
#             "user name",  # contains space
#             # TODO add more rules once implemented
#         ],
#     )
#     async def test_update_user_invalid_usernames(
#         self,
#         mock_cosmos_container,
#         sample_user,
#         sample_user_in_db,
#         invalid_username,
#     ):
#         raise NotImplementedError("Username validation not implemented")

#         invalid_update = UserUpdate(id=sample_user.id, username=invalid_username)

#         mock_cosmos_container.read_item.return_value = sample_user_in_db.model_dump()

#         with pytest.raises(UserUpdateInvalidUsernameError):
#             await UsersDB(container=mock_cosmos_container).update_user(invalid_update)
#         mock_cosmos_container.patch_item.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_update_user_password(
#         self, mock_cosmos_container, sample_user_in_db, sample_user
#     ):
#         sample_user_update_password = UserUpdate(
#             id=sample_user.id,
#             plain_text_password="DIFFERENT" + "TestPassword123!",
#         )
#         new_user_in_db = sample_user_in_db.model_copy(deep=True)
#         if not sample_user_update_password.plain_text_password:
#             raise ValueError(
#                 "Failed assigning plain_text_password to sample UserUpdate"
#             )
#         new_user_in_db.hashed_password = get_password_hash(
#             sample_user_update_password.plain_text_password
#         )

#         mock_cosmos_container.read_item.return_value = sample_user_in_db.model_dump()
#         mock_cosmos_container.patch_item.return_value = new_user_in_db.model_dump()

#         result = await UsersDB(container=mock_cosmos_container).update_user(
#             sample_user_update_password
#         )

#         assert result is not None
#         assert isinstance(result, UserInDB)
#         assert verify_password(
#             sample_user_update_password.plain_text_password,
#             result.hashed_password,
#         )
#         assert result.hashed_password != sample_user_in_db.hashed_password
#         mock_cosmos_container.read_item.assert_called_once()

#     @pytest.mark.xfail(reason="Feature not implemented yet")
#     @pytest.mark.asyncio
#     @pytest.mark.parametrize(
#         "invalid_password",
#         [
#             "",  # empty
#             "a" * 51,  # too long
#             "pass word",  # contains space
#             # TODO add more rules once implemented
#         ],
#     )
#     async def test_update_user_invalid_passwords(
#         self,
#         mock_cosmos_container,
#         sample_user,
#         sample_user_in_db,
#         invalid_password,
#     ):
#         raise NotImplementedError("Password validation not implemented")

#         invalid_update = UserUpdate(
#             id=sample_user.id, plain_text_password=invalid_password
#         )

#         mock_cosmos_container.read_item.return_value = sample_user_in_db.model_dump()

#         with pytest.raises(UserUpdateInvalidPasswordError):
#             await UsersDB(container=mock_cosmos_container).update_user(invalid_update)
#         mock_cosmos_container.patch_item.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_update_user_change_active(
#         self, mock_cosmos_container, sample_user_in_db, sample_user
#     ):
#         sample_user_update_active = UserUpdate(
#             id=sample_user.id, is_active=not sample_user.is_active
#         )
#         new_user_in_db = sample_user_in_db.model_copy(deep=True)
#         new_user_in_db.is_active = sample_user_update_active.is_active

#         mock_cosmos_container.read_item.return_value = sample_user_in_db.model_dump()
#         mock_cosmos_container.patch_item.return_value = new_user_in_db.model_dump()

#         result = await UsersDB(container=mock_cosmos_container).update_user(
#             sample_user_update_active
#         )

#         assert result is not None
#         assert isinstance(result, UserInDB)
#         assert result.is_active == sample_user_update_active.is_active
#         assert result.is_active != sample_user_in_db.is_active
#         mock_cosmos_container.patch_item.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_update_user_change_superuser(
#         self, mock_cosmos_container, sample_user_in_db, sample_user
#     ):
#         sample_user_update_superuser = UserUpdate(
#             id=sample_user.id, is_superuser=not sample_user.is_superuser
#         )
#         new_user_in_db = sample_user_in_db.model_copy(deep=True)
#         new_user_in_db.is_superuser = sample_user_update_superuser.is_superuser

#         mock_cosmos_container.read_item.return_value = sample_user_in_db.model_dump()
#         mock_cosmos_container.patch_item.return_value = new_user_in_db.model_dump()

#         result = await UsersDB(container=mock_cosmos_container).update_user(
#             sample_user_update_superuser
#         )

#         assert result is not None
#         assert isinstance(result, UserInDB)
#         assert result.is_superuser == sample_user_update_superuser.is_superuser
#         assert result.is_superuser != sample_user_in_db.is_superuser
#         mock_cosmos_container.patch_item.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_delete_user_success(self, mock_cosmos_container, sample_user):
#         mock_cosmos_container.delete_item.return_value = None

#         await UsersDB(container=mock_cosmos_container).delete_user(sample_user.id)
#         mock_cosmos_container.delete_item.assert_called_once()

#     @pytest.mark.asyncio
#     async def test_delete_user_not_found(self, mock_cosmos_container, mock_user_db):
#         mock_cosmos_container.delete_item.side_effect = (
#             exceptions.CosmosResourceNotFoundError()
#         )

#         with pytest.raises(UserNotFoundError):
#             await UsersDB(container=mock_cosmos_container).delete_user(
#                 "non-existent-id"
#             )
#         mock_cosmos_container.delete_item.assert_called_once()
