from fastapi import FastAPI

from src.router import comments_router

app = FastAPI(title="Comments Service with CosmosDB", root_path="/comments")

app.include_router(comments_router)
