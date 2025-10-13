from unittest.mock import patch

import pytest


class TestAuthService:
    @pytest.mark.asyncio
    async def test_authenticate_user_by_username_success(
        self, mock_user_db, sample_user_in_db, sample_user
    ):
        """Test successful authentication by username"""
        mock_user_db.get_user_by_username.return_value = sample_user_in_db

        with patch("service.services.auth.verify_password", return_value=True):
            result = await AuthService(mock_user_db).authenticate_user_by_username(
                sample_user.username, "correct_password"
            )

        assert result is not None
        assert isinstance(result, User)
        assert result.username == sample_user.username
        assert result.email == sample_user.email
        assert not hasattr(result, "hashed_password")
        mock_user_db.get_user_by_username.assert_called_once_with(sample_user.username)

    @pytest.mark.asyncio
    async def test_authenticate_user_by_username_wrong_password(
        self, mock_user_db, sample_user_in_db, sample_user
    ):
        """Test authentication fails with wrong password"""
        mock_user_db.get_user_by_username.return_value = sample_user_in_db

        with patch("service.services.auth.verify_password", return_value=False):
            with pytest.raises(AuthIncorrectPasswordError):
                await AuthService(mock_user_db).authenticate_user_by_username(
                    sample_user.username, "wrong_password"
                )

        mock_user_db.get_user_by_username.assert_called_once_with(sample_user.username)

    @pytest.mark.asyncio
    async def test_authenticate_user_by_username_user_not_found(
        self, mock_user_db, sample_user
    ):
        """Test authentication when user doesn't exist"""

        mock_user_db.get_user_by_username.side_effect = UserNotFoundError()

        with pytest.raises(UserNotFoundError):
            await AuthService(mock_user_db).authenticate_user_by_username(
                "nonexistent_user", "password"
            )

    @pytest.mark.asyncio
    async def test_authenticate_user_by_email_success(
        self, mock_user_db, sample_user_in_db, sample_user
    ):
        """Test successful authentication by email"""
        mock_user_db.get_user_by_email.return_value = sample_user_in_db

        with patch("service.services.auth.verify_password", return_value=True):
            result = await AuthService(mock_user_db).authenticate_user_by_email(
                sample_user.email, "correct_password"
            )

        assert result is not None
        assert isinstance(result, User)
        assert result.email == sample_user.email
        assert result.username == sample_user.username
        assert not hasattr(result, "hashed_password")
        mock_user_db.get_user_by_email.assert_called_once_with(sample_user.email)

    @pytest.mark.asyncio
    async def test_authenticate_user_by_email_wrong_password(
        self, mock_user_db, sample_user_in_db, sample_user
    ):
        """Test authentication fails with wrong password (email)"""
        mock_user_db.get_user_by_email.return_value = sample_user_in_db

        with patch("service.services.auth.verify_password", return_value=False):
            with pytest.raises(AuthIncorrectPasswordError):
                await AuthService(mock_user_db).authenticate_user_by_email(
                    sample_user.email, "wrong_password"
                )

        mock_user_db.get_user_by_email.assert_called_once_with(sample_user.email)

    @pytest.mark.asyncio
    async def test_authenticate_user_by_email_user_not_found(
        self, mock_user_db, sample_user
    ):
        """Test authentication when user doesn't exist (email)"""

        mock_user_db.get_user_by_email.side_effect = UserNotFoundError()

        with pytest.raises(UserNotFoundError):
            await AuthService(mock_user_db).authenticate_user_by_email(
                "nonexistent@email.com", "password"
            )

    @pytest.mark.asyncio
    async def test_password_verification_called_correctly(
        self, mock_user_db, sample_user_in_db, sample_user
    ):
        """Test that password verification is called with correct arguments"""
        mock_user_db.get_user_by_username.return_value = sample_user_in_db

        with patch(
            "service.services.auth.verify_password", return_type=True
        ) as mock_verify:
            await AuthService(mock_user_db).authenticate_user_by_username(
                sample_user.username, "test_password"
            )

            mock_verify.assert_called_once_with(
                "test_password", sample_user_in_db.hashed_password
            )
