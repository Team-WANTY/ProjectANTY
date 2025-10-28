from fastapi import FastAPI

from src.router import redirect_router

# Setup endpoints
app = FastAPI(title="Redirect Service with CosmosDB", root_path="/redirect")

app.include_router(redirect_router)
