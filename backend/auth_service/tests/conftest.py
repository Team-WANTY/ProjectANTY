"""
Shared test fixtures and configuration
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, Mock
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from pwdlib import PasswordHash

from src.dependencies import get_auth_service
from src.main import app
from src.models import UserAuthInfo, UserCreate, UserInDB
from src.service import AuthService


pwdhasher = PasswordHash.recommended()


@pytest_asyncio.fixture
async def async_client(mock_auth_service):
    """Async FastAPI test client"""
    # Adjust to your path
    app.dependency_overrides[get_auth_service] = lambda: mock_auth_service
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def real_client():
    """
    Real async client WITHOUT mocks
    Uses separate connection pool to avoid conflicts with Cosmos DB
    """
    # Create client with explicit connection limits
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


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

    # Make all methods async mocks
    mock_db.create_user = AsyncMock()
    mock_db.get_user_by_id = AsyncMock()
    mock_db.get_user_by_username = AsyncMock()
    mock_db.get_user_by_email = AsyncMock()
    mock_db.update_user = AsyncMock()
    mock_db.delete_user = AsyncMock()

    return mock_db


@pytest.fixture
def mock_auth_service():
    mock_service = Mock()
    mock_service.authenticate_user_by_username = AsyncMock()
    mock_service.authenticate_user_by_email = AsyncMock()

    return mock_service

@pytest.fixture
def sample_user_create(sample_user):
    """Sample UserCreate object"""
    return UserCreate(
        id=str(uuid4()),
        email=sample_user.email,
        username=sample_user.username,
        plain_text_password="TestPassword123!",
    )


@pytest.fixture
def sample_user():
    """Sample User object"""
    return UserAuthInfo(
        id=str(uuid4()),
        username="testuser",
        email="test@example.com",
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
        email="admin@example.com",
        username="admin",
        is_superuser=True,
        is_active=True,
        hashed_password=pwdhasher.hash("TestPassword123!"),
        updated_at=int(datetime.now(UTC).timestamp()),
    )


@pytest.fixture
def sample_user_in_db(sample_user):
    """Sample UserInDB object"""
    return UserInDB(
        id=sample_user.id,
        email=sample_user.email,
        username=sample_user.username,
        hashed_password=pwdhasher.hash("TestPassword123!"),
        is_superuser=sample_user.is_superuser,
        is_active=sample_user.is_active,
        created_at=sample_user.created_at,
        updated_at=sample_user.updated_at,
    )


@pytest.fixture
def mock_access_token(sample_user):
    """Generate a valid access token"""
    return AuthService.create_access_token(sample_user.id)


@pytest.fixture
def mock_refresh_token(sample_user):
    return AuthService.create_refresh_token(sample_user.id)
