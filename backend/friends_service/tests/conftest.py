from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from shared.auth import get_current_user
from shared.db import now_timestamp
from shared.models.users import UserInDB

from src.database import FriendshipsDB
from src.dependencies import get_friends_service
from src.main import app
from src.models import Friendship
from src.service import FriendsService


@pytest.fixture
def sample_user_in_db():
    return UserInDB(
        id="user123",
        username="testuser",
        email="test@gmail.com",
        hashed_password="$argon2id$v=19$m=65536,t=3,p=4$hashed",
        created_at=now_timestamp(),
        updated_at=now_timestamp(),
        is_active=True,
        is_superuser=False,
    )


@pytest.fixture
def sample_friendship():
    return Friendship(from_user_id="user123", to_user_id="user321")


@pytest.fixture
def mock_container():
    """Fixture for mocked Cosmos container"""
    return AsyncMock()


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def mock_service():
    return AsyncMock()


@pytest.fixture
def mock_friends_db(mock_container):
    return FriendshipsDB(mock_container)


@pytest.fixture
def mock_friends_service(mock_db):
    return FriendsService(mock_db)


@pytest.fixture
def client():
    """Fixture for FastAPI test client"""
    return TestClient(app)


@pytest.fixture(autouse=True)
def dependency_overrides(mock_service, sample_user_in_db):
    app.dependency_overrides[get_friends_service] = lambda: mock_service
    app.dependency_overrides[get_current_user] = lambda: sample_user_in_db
