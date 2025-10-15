# To run
Install [uv](https://docs.astral.sh/uv/getting-started/installation/). 

Run `uv sync --dev` to update packages, then `uv run uvicorn service.views:hello_router --reload` to test the service.

To check formatting, run `uv run ruff check`. To fix errors, run `uv run ruff check --fix`.
