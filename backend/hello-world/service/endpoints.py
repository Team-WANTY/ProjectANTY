
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status

from .models import Message
from .service import say_hello, set_new_msg

app = FastAPI()

@app.post("/set_msg")
async def change_message(
    changed: Annotated[Message, Depends(set_new_msg)],
):
    if not changed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message, must be of length < 20 characters.",
        )

@app.get("/message")
async def get_message(
) -> Message:
    return say_hello()
