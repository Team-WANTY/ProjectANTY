from fastapi import FastAPI

from src.router import users_router

app = FastAPI(title="Users Service with CosmosDB", root_path="/users")

app.include_router(users_router)
