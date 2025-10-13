import pytest

from service.exceptions.user import (
    UserCreationError,
    UserEmailExistsError,
    UserGeneralQueryError,
    UserNotFoundError,
    UserUsernameExistsError,
)
from service.models.user import User, UserUpdate
from service.services.user import UsersService


class TestUsersService:
    @pytest.mark.asyncio
    async def test_create_user_success(
        self, mock_user_db, sample_user_create, sample_user_in_db
    ):
        """Test successful user creation"""
        mock_user_db.get_user_by_username.return_value = None
        mock_user_db.get_user_by_email.return_value = None
        mock_user_db.create_user.return_value = sample_user_in_db

        result = await UsersService(mock_user_db).create_user(sample_user_create)

        assert result is not None
        assert isinstance(result, User)
        assert result.email == sample_user_create.email
        assert result.username == sample_user_create.username
        assert not hasattr(result, "hashed_password")
        mock_user_db.get_user_by_username.assert_called_once_with(
            sample_user_create.username
        )
        mock_user_db.get_user_by_email.assert_called_once_with(sample_user_create.email)
        mock_user_db.create_user.assert_called_once_with(sample_user_create)

    @pytest.mark.asyncio
    async def test_create_user_duplicate_username(
        self, mock_user_db, sample_user_create, sample_user_in_db
    ):
        """Test creating user with existing username"""
        mock_user_db.get_user_by_username.return_value = sample_user_in_db
        mock_user_db.get_user_by_email.return_value = None

        with pytest.raises(UserUsernameExistsError):
            await UsersService(mock_user_db).create_user(sample_user_create)

        mock_user_db.get_user_by_username.assert_called_once()
        mock_user_db.create_user.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_user_duplicate_email(
        self, mock_user_db, sample_user_create, sample_user_in_db
    ):
        """Test creating user with existing email"""
        mock_user_db.get_user_by_username.return_value = None
        mock_user_db.get_user_by_email.return_value = sample_user_in_db

        with pytest.raises(UserEmailExistsError):
            await UsersService(mock_user_db).create_user(sample_user_create)

        mock_user_db.get_user_by_username.assert_called_once()
        mock_user_db.get_user_by_email.assert_called_once()
        mock_user_db.create_user.assert_not_called()

    @pytest.mark.asyncio
    async def test_create_user_db_returns_invalid_type(
        self, mock_user_db, sample_user_create
    ):
        """Test error when DB returns wrong type"""
        mock_user_db.get_user_by_username.return_value = None
        mock_user_db.get_user_by_email.return_value = None
        mock_user_db.create_user.return_value = "invalid_type"

        with pytest.raises(UserCreationError):
            await UsersService(mock_user_db).create_user(sample_user_create)

    @pytest.mark.asyncio
    async def test_get_user_by_id_success(
        self, mock_user_db, sample_user_in_db, sample_user
    ):
        """Test successful user retrieval by ID"""
        mock_user_db.get_user_by_id.return_value = sample_user_in_db

        result = await UsersService(mock_user_db).get_user_by_id(str(sample_user.id))

        assert result is not None
        assert isinstance(result, User)
        assert result.id == sample_user.id
        assert not hasattr(result, "hashed_password")
        mock_user_db.get_user_by_id.assert_called_once_with(str(sample_user.id))

    @pytest.mark.asyncio
    async def test_get_user_by_id_invalid_type(self, mock_user_db, sample_user):
        """Test error when get_user_by_id returns wrong type"""
        mock_user_db.get_user_by_id.return_value = "invalid_type"

        with pytest.raises(UserGeneralQueryError):
            await UsersService(mock_user_db).get_user_by_id(str(sample_user.id))

    @pytest.mark.asyncio
    async def test_get_user_by_username_success(
        self, mock_user_db, sample_user_in_db, sample_user
    ):
        """Test successful user retrieval by username"""
        mock_user_db.get_user_by_username.return_value = sample_user_in_db

        result = await UsersService(mock_user_db).get_user_by_username(
            sample_user.username
        )

        assert result is not None
        assert isinstance(result, User)
        assert result.username == sample_user.username
        assert not hasattr(result, "hashed_password")
        mock_user_db.get_user_by_username.assert_called_once_with(sample_user.username)

    @pytest.mark.asyncio
    async def test_get_user_by_username_invalid_type(self, mock_user_db, sample_user):
        """Test error when get_user_by_username returns wrong type"""
        mock_user_db.get_user_by_username.return_value = None

        with pytest.raises(UserGeneralQueryError, match="not type UserInDB"):
            await UsersService(mock_user_db).get_user_by_username(sample_user.username)

    @pytest.mark.asyncio
    async def test_get_user_by_email_success(
        self, mock_user_db, sample_user_in_db, sample_user
    ):
        """Test successful user retrieval by email"""
        mock_user_db.get_user_by_email.return_value = sample_user_in_db

        result = await UsersService(mock_user_db).get_user_by_email(sample_user.email)

        assert result is not None
        assert isinstance(result, User)
        assert result.email == sample_user.email
        assert not hasattr(result, "hashed_password")
        mock_user_db.get_user_by_email.assert_called_once_with(sample_user.email)

    @pytest.mark.asyncio
    async def test_get_user_by_email_invalid_type(self, mock_user_db, sample_user):
        """Test error when get_user_by_email returns wrong type"""
        mock_user_db.get_user_by_email.return_value = {}

        with pytest.raises(UserGeneralQueryError, match="not type UserInDB"):
            await UsersService(mock_user_db).get_user_by_email(sample_user.email)

    @pytest.mark.asyncio
    async def test_update_user_success(
        self, mock_user_db, sample_user, sample_user_in_db
    ):
        """Test successful user update"""
        sample_user_update = UserUpdate(id=sample_user.id, username="updated_username")

        updated_user_in_db = sample_user_in_db.model_copy(deep=True)
        updated_user_in_db.username = sample_user_update.username

        mock_user_db.update_user.return_value = updated_user_in_db

        result = await UsersService(mock_user_db).update_user(sample_user_update)

        assert result is not None
        assert isinstance(result, User)
        assert result.username == sample_user_update.username
        assert not hasattr(result, "hashed_password")
        mock_user_db.update_user.assert_called_once_with(sample_user_update)

    @pytest.mark.asyncio
    async def test_delete_user_success(self, mock_user_db, sample_user):
        """Test successful user deletion"""
        mock_user_db.delete_user.return_value = None

        await UsersService(mock_user_db).delete_user(sample_user.id)

        mock_user_db.delete_user.assert_called_once_with(sample_user.id)

    @pytest.mark.asyncio
    async def test_delete_user_fail(self, mock_user_db, sample_user):
        """Test that delete_user forwards DB exceptions"""

        mock_user_db.delete_user.side_effect = UserNotFoundError()

        with pytest.raises(UserNotFoundError):
            await UsersService(mock_user_db).delete_user(sample_user.id)

        mock_user_db.delete_user.assert_called_once_with(sample_user.id)
