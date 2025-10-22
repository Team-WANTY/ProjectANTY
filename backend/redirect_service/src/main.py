
from fastapi import FastAPI

from src.router import redirect_router

# Setup endpoints
app = FastAPI(title="Redirect Service with CosmosDB",
              docs_url="/redirect/docs",
              redoc_url="/redirect/redoc",
              openapi_url="/redirect/openapi.json")

app.include_router(redirect_router, prefix="/redirect")
