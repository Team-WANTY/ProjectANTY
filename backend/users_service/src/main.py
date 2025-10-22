from fastapi import FastAPI

from .router import users_router

app = FastAPI(title="Users Service with CosmosDB")

app.include_router(users_router)
