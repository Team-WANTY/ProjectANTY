# Initial setup:
    uv sync --dev

# Adding packages:
    uv add <package name>
    uv sync
    uv lock

# Format & lint
    uv run ruff check
    uv run ruff format
    uv run ty check

# Test Cases
    uv run pytest

# Generating encryption keys (applicable for Linux)
## Token Key Pair
openssl genpkey -algorithm RSA -out token_private_key.pem -pkeyopt rsa_keygen_bits:2048 && openssl rsa -pubout -in token_private_key.pem -out token_public_key.pem

# Running the program
uv run uvicorn backend.main:app --reload