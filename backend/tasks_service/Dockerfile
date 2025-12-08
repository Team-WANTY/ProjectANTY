FROM python:3.12-slim

RUN pip install --no-cache-dir uv

WORKDIR /app

# Copy shared package first so it can be installed before service code
COPY ./shared ./shared

# Copy service code
COPY ./tasks_service ./tasks_service

WORKDIR /app/tasks_service

# Install both with uv
# RUN cd /app/shared && uv sync

RUN uv sync && uv lock

CMD ["uv", "run", "fastapi", "run", "src/main.py", "--host", "0.0.0.0","--port", "8000"]
