
from fastapi import FastAPI

from src.router import auth_router

app = FastAPI(title="Auth Service with CosmosDB", root_path="/auth")

app.include_router(auth_router)
