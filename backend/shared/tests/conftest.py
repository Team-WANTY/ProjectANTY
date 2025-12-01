import pytest
from shared.db import now_timestamp

from auth import UserInDB


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
