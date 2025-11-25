from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from shared.auth import get_current_user_auth
from shared.models.auth import UserAuthInfo
from shared.models.users import UserInDB

from src.database import UsersDB
from src.dependencies import get_users_service
from src.main import app
from src.service import UsersService


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
def mock_users_db(mock_container):
    return UsersDB(mock_container)


@pytest.fixture
def mock_users_service(mock_db):
    return UsersService(mock_db)


@pytest.fixture
def sample_user_in_db():
    return UserInDB(
        id="user123",
        username="testuser",
        email="test@gmail.com",
        created_at=(datetime.now(UTC) - timedelta(minutes=15)),
        updated_at=(datetime.now(UTC) - timedelta(minutes=15)),
        is_active=True,
        is_superuser=False,
    )


@pytest.fixture
def sample_user_auth_info():
    """Fixture for sample UserAuthInfo"""
    return UserAuthInfo(
        id="user123",
        username="testuser",
        email="test@gmail.com",
        hashed_password="$argon2id$v=19$m=65536,t=3,p=4$hashed",
        updated_at=(datetime.now(UTC) - timedelta(minutes=15)),
        is_active=True,
        is_superuser=False,
    )


@pytest.fixture(autouse=True)
def dependency_overrides(mock_service, sample_user_auth_info):
    app.dependency_overrides[get_users_service] = lambda: mock_service
    app.dependency_overrides[get_current_user_auth] = lambda: sample_user_auth_info
