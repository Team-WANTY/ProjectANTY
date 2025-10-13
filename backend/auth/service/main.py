from fastapi import FastAPI

from service.routers.auth import auth_router
from service.routers.user import user_router

app = FastAPI(title="Auth Service with CosmosDB")

app.include_router(auth_router)
app.include_router(user_router)


@app.get("/")
async def root():
    return {"message": "Root for ProjectANTY backend"}
