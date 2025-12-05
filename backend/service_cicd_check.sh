for dir in *_service/; do
    if [ -d "$dir" ]; then
        echo "Checking $dir"
        cd "$dir"
        uv sync
        uv run pytest --cov=src --cov-report=term-missing
        uv run ty check
        uv run ruff check --fix
        uv run ruff format
        rm .coverage
        cd ..
        echo
    fi
done