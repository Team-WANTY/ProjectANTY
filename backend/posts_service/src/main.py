from fastapi import FastAPI

from src.router import posts_router

app = FastAPI(title="Posts Service with CosmosDB", root_path="/posts")

app.include_router(posts_router)
