from fastapi import FastAPI

from src.router import friends_router

app = FastAPI(title="Friends Service with CosmoDB", root_path="/friends")
app.include_router(friends_router)
