from fastapi import FastAPI

from src.router import notifications_router

app = FastAPI(title="Notification Service with CosmosDB", root_path="/notifications")

app.include_router(notifications_router)
