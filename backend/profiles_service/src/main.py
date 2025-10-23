from fastapi import FastAPI

from src.router import profiles_router

app = FastAPI(title="Profiles Service with CosmosDB", root_path="/profiles")

app.include_router(profiles_router)
