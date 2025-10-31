from fastapi import FastAPI

from src.router import tasks_router

app = FastAPI(title="Tasks Service with CosmosDB", root_path="/tasks")

app.include_router(tasks_router)
