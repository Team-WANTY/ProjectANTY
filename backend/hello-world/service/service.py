from typing import Any

from .models import Message

message: dict[str, Any] = {"message": "Hello World!"}

def set_new_msg(request: Message) -> bool:
    global message
    if len(request.message) > 20:
        return False

    message["message"] = request.message

    return True

def say_hello() -> Message:
    return Message(**message)
