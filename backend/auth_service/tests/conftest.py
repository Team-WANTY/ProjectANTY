from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from shared.db import now_timestamp
from shared.models.auth import UserAuthInfo

from src.database import AuthDB
from src.main import app
from src.models import UserCreate
from src.service import AuthService


@pytest.fixture
def client():
    """Fixture for FastAPI test client"""
    return TestClient(app)

@pytest.fixture
def mock_auth_db():
    """Fixture for mocked AuthDB"""
    return AsyncMock()


@pytest.fixture
def auth_service(mock_auth_db):
    """Fixture for AuthService instance"""
    return AuthService(mock_auth_db)


@pytest.fixture
def sample_user_auth_info():
    """Fixture for sample UserAuthInfo"""
    return UserAuthInfo(
        id="user123",
        username="testuser",
        email="test@gmail.com",
        hashed_password="$argon2id$v=19$m=65536,t=3,p=4$hashed",
        updated_at=now_timestamp(),
        is_active=True,
        is_superuser=False
    )


@pytest.fixture
def sample_superuser():
    """Fixture for sample superuser"""
    return UserAuthInfo(
        id="admin123",
        username="admin",
        email="admin@superfaketestemail.com",
        hashed_password="$argon2id$v=19$m=65536,t=3,p=4$hashed",
        updated_at=now_timestamp(),
        is_active=True,
        is_superuser=True
    )

@pytest.fixture
def mock_container():
    """Fixture for mocked Cosmos container"""
    return AsyncMock()


@pytest.fixture
def auth_db(mock_container):
    """Fixture for AuthDB instance with mocked container"""
    return AuthDB(mock_container)


@pytest.fixture
def sample_user_create():
    """Fixture for sample UserCreate data"""
    return UserCreate(
        email="test@gmail.com",
        username="testuser",
        plain_text_password="SecurePassword123!"
    )
