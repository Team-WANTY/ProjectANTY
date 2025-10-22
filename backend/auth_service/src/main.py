
from fastapi import FastAPI

from .router import auth_router

app = FastAPI(title="Auth Service with CosmosDB")

app.include_router(auth_router)
