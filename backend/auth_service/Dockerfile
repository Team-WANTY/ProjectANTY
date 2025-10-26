FROM python:3.12-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:0.9.5 /uv /uvx /bin/

WORKDIR /app

# Copy source code
COPY ./shared ./shared
COPY ./auth_service ./auth_service

WORKDIR /app/auth_service

RUN uv sync --locked

RUN groupadd -r anty && useradd -r -m -g anty anty

USER anty

CMD ["uv", "run", "fastapi", "src/main.py", "--host", "0.0.0.0","--port", "8000"]
