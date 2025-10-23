from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pwdlib import PasswordHash

from src.dependencies import get_auth_service
from src.main import app
from src.models import UserAuthInfo, UserCreate, UserInDB
from src.service import AuthService

pwdhasher = PasswordHash.recommended()


@pytest.fixture
def client(mock_auth_service):
    """FastAPI TestClient with dependency overrides (mocked)"""
    app.dependency_overrides[get_auth_service] = lambda: mock_auth_service
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def real_client():
    """FastAPI TestClient without mocks"""
    with TestClient(app) as client:
        yield client


@pytest.fixture
def mock_cosmos_container():
    """Mock CosmosDB container"""
    container = MagicMock()
    container.create_item = AsyncMock()
    container.read_item = AsyncMock()
    container.query_items = Mock()
    container.patch_item = AsyncMock()
    container.delete_item = AsyncMock()
    return container


@pytest.fixture
def mock_user_db():
    """Mock UsersDB with async methods"""
    mock_db = Mock()

    # Updated method names
    mock_db.create_user = AsyncMock()
    mock_db.get_user_auth_by_id = AsyncMock()
    mock_db.get_user_auth_by_username = AsyncMock()
    mock_db.get_user_auth_by_email = AsyncMock()
    mock_db.update_auth = AsyncMock()
    mock_db.delete_user = AsyncMock()

    return mock_db


@pytest.fixture
def mock_auth_service():
    mock_service = Mock()
    mock_service.authenticate_user_by_username = AsyncMock()
    mock_service.authenticate_user_by_email = AsyncMock()
    mock_service.get_user_auth_by_id = AsyncMock()
    mock_service.register_user = AsyncMock()
    mock_service.create_access_token = AsyncMock()
    mock_service.create_refresh_token = AsyncMock()
    return mock_service


@pytest.fixture
def sample_user():
    """Sample UserAuthInfo object"""
    return UserAuthInfo(
        id=str(uuid4()),
        username="testuser",
        email="test@gmail.com",
        is_superuser=False,
        is_active=True,
        hashed_password=pwdhasher.hash("TestPassword123!"),
        updated_at=int(datetime.now(UTC).timestamp()),
    )


@pytest.fixture
def sample_superuser():
    """Sample superuser"""
    return UserAuthInfo(
        id=str(uuid4()),
        email="admin@gmail.com",
        username="admin",
        is_superuser=True,
        is_active=True,
        hashed_password=pwdhasher.hash("TestPassword123!"),
        updated_at=int(datetime.now(UTC).timestamp()),
    )


@pytest.fixture
def sample_user_in_db(sample_user):
    """Sample user returned from DB, already as UserAuthInfo"""
    # Convert UserInDB -> UserAuthInfo
    return UserAuthInfo.from_in_db(
        UserInDB(
            id=sample_user.id,
            email=sample_user.email,
            username=sample_user.username,
            hashed_password=sample_user.hashed_password,
            is_superuser=sample_user.is_superuser,
            is_active=sample_user.is_active,
            created_at=int(datetime.now(UTC).timestamp()),
            updated_at=sample_user.updated_at,
        )
    )


@pytest.fixture
def sample_user_create(sample_user):
    """Sample UserCreate object"""
    return UserCreate(
        email=sample_user.email,
        username=sample_user.username,
        plain_text_password="TestPassword123!",
    )


@pytest.fixture
async def mock_access_token(sample_user):
    """Generate a valid access token"""
    return await AuthService.create_access_token(sample_user.id)


@pytest.fixture
async def mock_refresh_token(sample_user):
    return await AuthService.create_refresh_token(sample_user.id)
