import logging

from fastapi import APIRouter, Depends, HTTPException, status
from shared.auth import get_current_user_auth
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.models.auth import UserAuthInfo

from src.dependencies import get_tasks_service
from src.models import PaginatedTasks, Task, TaskUpdate
from src.service import TasksService

logger = logging.getLogger("tasks_service")

tasks_router = APIRouter()


@tasks_router.post(
    "/", status_code=status.HTTP_201_CREATED, response_model=Task, tags=["tasks"]
)
async def create_task(
    new_task: Task,
    tasks_service: TasksService = Depends(get_tasks_service),
    current_user: UserAuthInfo = Depends(get_current_user_auth),
):
    try:
        created_task = await tasks_service.create_task(new_task, current_user)
        return created_task.to_base()
    except AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordAlreadyExistsError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Task exists already"
        )
    except RecordCreationError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating task",
        )


@tasks_router.get("/", response_model=PaginatedTasks, tags=["tasks"])
async def get_task(
    task_id: str | None = None,
    user_id: str | None = None,
    continuation_token: str | None = None,
    quantity: int = 10,
    tasks_service: TasksService = Depends(get_tasks_service),
    current_user: UserAuthInfo = Depends(get_current_user_auth),
):
    if task_id is not None:
        try:
            return await tasks_service.get_task_by_id(
                task_id, current_user
            )  # TODO return full record?
        except RecordNotFoundError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        except AuthError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        except GeneralQueryError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error getting task by ID",
            )
    if user_id is not None:
        try:
            return await tasks_service.get_tasks_by_user_id(
                user_id, quantity, continuation_token, current_user
            )  # TODO return full records?
        except AuthError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
        except RecordNotFoundError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
        except GeneralQueryError:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error getting task by user ID",
            )


@tasks_router.patch("/", response_model=Task, tags=["tasks"])
async def update_task(
    task_update: TaskUpdate,
    tasks_service: TasksService = Depends(get_tasks_service),
    current_user: UserAuthInfo = Depends(get_current_user_auth),
):
    try:
        task = await tasks_service.update_task(task_update, current_user)
        return task
    except AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordUpdateError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating task",
        )


@tasks_router.delete("/", status_code=status.HTTP_204_NO_CONTENT, tags=["tasks"])
async def delete_task(
    task_id: str,
    tasks_service: TasksService = Depends(get_tasks_service),
    current_user: UserAuthInfo = Depends(get_current_user_auth),
):
    try:
        await tasks_service.delete_task(task_id, current_user)
    except AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordDeletionError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting profile",
        )
