FROM python:3.12-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:0.9.5 /uv /uvx /bin/

WORKDIR /app

# Copy source code
COPY ./shared ./shared
COPY ./users_service ./users_service

WORKDIR /app/users_service

# The proper thing to do is uv sync --lock, with a uv.lock in version control.
# But prof doesn't want us to commit lock files so we can't.
RUN uv sync && uv lock

CMD ["uv", "run", "fastapi", "run", "src/main.py", "--host", "0.0.0.0", "--port", "8000"]
