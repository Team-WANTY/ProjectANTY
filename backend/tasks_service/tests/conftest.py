from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from shared.auth import get_current_user_auth
from shared.db import now_timestamp
from shared.models.auth import UserAuthInfo

from src.database import TaskDB
from src.dependencies import get_tasks_service
from src.main import app
from src.models import OccurrencesByDate, TaskCreate, TaskInDB
from src.service import TasksService


@pytest.fixture
def sample_task_create():
    return TaskCreate(
        user_id="user123",
        name="Test Task",
        desc="Task made for testing",
        cat="Testing",
        first_relevant_date=now_timestamp().date(),
    )


@pytest.fixture
def sample_task_in_db():
    return TaskInDB(
        id="task123",
        user_id="user123",
        name="Test Task",
        desc="Task made for testing",
        cat="Testing",
        first_relevant_date=now_timestamp().date(),
        created_at=now_timestamp(),
        updated_at=now_timestamp(),
        # omitted repeat for simplicity
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
def mock_tasks_db(mock_container):
    return TaskDB(mock_container)


@pytest.fixture
def mock_tasks_service(mock_db):
    return TasksService(mock_db)


@pytest.fixture
def client():
    """Fixture for FastAPI test client"""
    return TestClient(app)


@pytest.fixture(autouse=True)
def dependency_overrides(mock_service, sample_user_auth_info):
    app.dependency_overrides[get_tasks_service] = lambda: mock_service
    app.dependency_overrides[get_current_user_auth] = lambda: sample_user_auth_info


@pytest.fixture
def sample_occurrences():
    return OccurrencesByDate(occurrences={now_timestamp().date(): ["task123"]})
