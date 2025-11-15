from fastapi import FastAPI

from src.router import images_router

app = FastAPI(title="Image Service with Azure Blob", root_path="/images")

app.include_router(images_router)
