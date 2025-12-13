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
# To Run

For dev, use `docker compose -f compose.yml -f compose.dev.yml up --build`. If setting up for the first time, follow the instructions under Dev Notes.

# Dev Notes
Installing mkcert:
`sudo dnf install nss-tools -y` 
`curl -JLO https://dl.filippo.io/mkcert/latest?for=linux/amd64` 
`chmod +x mkcert-v*-linux-amd64` 
`sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert` 


### Interservice Key
    openssl rand -hex 64 > interservice_key.pem

`mkcert -install` 

`mkcert localhost 127.0.0.1 ::1 "*.localhost"` 

`mkdir -p certs` 
`mv localhost+x-key.pem certs/key.pem` 
`mv localhost+x.pem certs/cert.pem` 


`python -m http.server 8080 --bind 127.0.0.1`

### Mega Code Analysis
`uv run ty check; uv run ruff check --fix; uv run ruff format; uv run mypy src; uv run pylint src; uv run flake8 src; uv run bandit -r src; uv run black src; uv run vulture src`