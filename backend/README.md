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


### Interservice Key
    openssl rand -hex 64 > interservice_key.pem
