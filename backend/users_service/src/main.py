from fastapi import FastAPI

from src.router import users_router

# Setup endpoints
app = FastAPI(title="Users Service with CosmosDB",
              docs_url="/users/docs",
              redoc_url="/users/redoc",
              openapi_url="/users/openapi.json")

app.include_router(users_router, prefix="/users")
