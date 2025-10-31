from datetime import UTC, datetime
from uuid import uuid4


def generate_id() -> str:
    """Generate a unique ID for records."""
    return uuid4().hex


def now_timestamp() -> int:
    return int(datetime.now(UTC).timestamp())
