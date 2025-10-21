
from fastapi import FastAPI

from src.router import auth_router


# Setup endpoints
app = FastAPI(title="Auth Service with CosmosDB",
              docs_url="/auth/docs",
              redoc_url="/auth/redoc",
              openapi_url="/auth/openapi.json")

app.include_router(auth_router, prefix="/auth")
