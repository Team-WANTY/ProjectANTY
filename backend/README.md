# Initial setup:
`https://docs.astral.sh/uv/getting-started/installation/`
All future commands are ran from the `backend` folder
    source .venv/bin/activate    
    uv sync --all-extras
    uv lock

# Adding packages:
    uv add --optional <service (auth_service, user_service)> <package name>

# Format & lint
    uv run ruff check
    uv run ruff format
    uv run ty check

# Test Cases
    uv run pytest

# Generating encryption keys
## Linux
### Token Key Pair
    openssl genpkey -algorithm RSA -out token_private_key.pem -pkeyopt rsa_keygen_bits:2048 && openssl rsa -pubout -in token_private_key.pem -out token_public_key.pem
### Interservice Key
    openssl rand -hex 64 > interservice_key.pem
## Windows
### Token Key Pair
### Interservice Key

# Running the program
    uv run --extra <service> fastapi dev <service>/main.py 