from unittest.mock import AsyncMock, Mock

import pytest
from shared.models.users import UserInDB


@pytest.fixture
def mock_user_db():
    """Mock UsersDB with async methods"""
    db = Mock()
    db.get_user_by_id = AsyncMock()
    db.get_user_by_username = AsyncMock()
    db.get_user_by_email = AsyncMock()
    db.create_user = AsyncMock()
    db.update_user = AsyncMock()
    db.delete_user = AsyncMock()
    return db

@pytest.fixture
def sample_user_in_db():
    """Minimal UserInDB object with dummy values"""
    return UserInDB(
        id="user-id",
        username="testuser",
        email="test@example.com",
        hashed_password="hashedpassword",
        is_active=True,
        is_superuser=False,
        created_at=0,
        updated_at=0,
    )
