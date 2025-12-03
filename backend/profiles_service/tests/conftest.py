from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from shared.auth import get_current_user
from shared.db import now_timestamp
from shared.models.users import UserInDB

from src.database import ProfileDB
from src.dependencies import get_profiles_service
from src.main import app
from src.models import Profile
from src.service import ProfileService


@pytest.fixture
def client():
    """Fixture for FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def mock_container():
    """Fixture for mocked Cosmos container"""
    return AsyncMock()


@pytest.fixture
def mock_db():
    """Fixture for mocked DB"""
    return AsyncMock()


@pytest.fixture
def mock_service():
    return AsyncMock()


@pytest.fixture
def mock_profiles_db(mock_container):
    return ProfileDB(mock_container)


@pytest.fixture
def mock_profiles_service(mock_db):
    return ProfileService(mock_db)


@pytest.fixture
def sample_profile():
    return Profile(
        id="user123",
        avatar_image_id="123",
        created_at=now_timestamp(),
        updated_at=now_timestamp(),
    )


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


@pytest.fixture(autouse=True)
def dependency_overrides(mock_service, sample_user_in_db):
    app.dependency_overrides[get_profiles_service] = lambda: mock_service
    app.dependency_overrides[get_current_user] = lambda: sample_user_in_db
