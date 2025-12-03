from datetime import timedelta
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from shared.auth import get_current_user
from shared.db import now_timestamp
from shared.models.token import Token
from shared.models.users import UserInDB

from src.database import AuthDB
from src.dependencies import get_auth_service
from src.main import app
from src.service import AuthService


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
def mock_auth_service(mock_db):
    """Fixture for AuthService instance"""
    return AuthService(mock_db)


@pytest.fixture
def mock_auth_db(mock_container):
    """Fixture for AuthDB instance with mocked container"""
    return AuthDB(mock_container)


@pytest.fixture
def sample_user_in_db():
    """Fixture for sample UserAuthInfo"""
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
def sample_superuser():
    """Fixture for sample superuser"""
    return UserInDB(
        id="admin123",
        username="admin",
        email="admin@superfaketestemail.com",
        hashed_password="$argon2id$v=19$m=65536,t=3,p=4$hashed",
        created_at=now_timestamp(),
        updated_at=now_timestamp(),
        is_active=True,
        is_superuser=True,
    )


@pytest.fixture
def mock_service():
    return AsyncMock()


@pytest.fixture(autouse=True)
def dependency_overrides(mock_service, sample_user_in_db):
    app.dependency_overrides[get_auth_service] = lambda: mock_service
    app.dependency_overrides[get_current_user] = lambda: sample_user_in_db


@pytest.fixture()
def sample_token():
    return Token(
        sub="user123",
        exp=now_timestamp() + timedelta(minutes=15),
        token_type="access",
    )
