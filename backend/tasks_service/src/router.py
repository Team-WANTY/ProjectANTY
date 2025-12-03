from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from shared.auth import get_current_user
from shared.exceptions.auth import AuthError
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
    EmptyRecordUpdateError,
)
from shared.models.users import UserInDB
from shared.simple_logging import logger

from src.dependencies import get_tasks_service
from src.models import OccurrencesByDate, TaskCreate, TaskInDB, TaskUpdate
from src.service import TasksService

tasks_router = APIRouter()


@tasks_router.post("/", status_code=status.HTTP_201_CREATED, tags=["tasks"])
async def create_task(
    new_task: TaskCreate,
    tasks_service: TasksService = Depends(get_tasks_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        return {"task_id": await tasks_service.create_task(new_task, current_user)}
    except AuthError:
        logger.warning(
            f"Error creating task: {new_task.model_dump()}: authorization error"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordAlreadyExistsError:
        logger.error(f"Error creating task: {new_task.model_dump()}: already exists")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Task exists already"
        )
    except RecordCreationError:
        logger.error(f"Error creating task: {new_task.model_dump()}: creation error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating task",
        )
    except Exception as e:
        logger.error(f"Error creating task: {new_task.model_dump()}, unexpected: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating task",
        )


@tasks_router.get("/id/{task_id}", response_model=TaskInDB, tags=["tasks"])
async def get_task_by_id(
    task_id: str,
    tasks_service: TasksService = Depends(get_tasks_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        return await tasks_service.get_task_by_id(
            task_id, current_user
        )  # TODO return full record?
    except RecordNotFoundError:
        logger.error(f"Error getting task with ID '{task_id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except AuthError:
        logger.warning(f"Error getting task with ID '{task_id}': authorization error")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except GeneralQueryError:
        logger.error(f"Error getting task with ID '{task_id}': query error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting task by ID",
        )
    except Exception as e:
        logger.error(f"Error getting task with ID '{task_id}', unexpected: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting task by ID",
        )


@tasks_router.get(
    "/user_id/{user_id}", response_model=OccurrencesByDate, tags=["tasks"]
)
async def get_users_task_ids_in_range(
    user_id: str,
    start_date: date,
    end_date: date,
    tasks_service: TasksService = Depends(get_tasks_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        return await tasks_service.get_users_task_ids_in_range(
            user_id, start_date, end_date, current_user
        )
    except RecordNotFoundError:
        logger.error(f"Error getting tasks for user with ID '{user_id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except AuthError:
        logger.warning(
            f"Error getting tasks for user with ID '{user_id}', authorization error"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except GeneralQueryError:
        logger.error(f"Error getting tasks for user with ID '{user_id}': query error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting tasks by user ID",
        )
    except Exception as e:
        logger.error(
            f"Error getting tasks for user with ID '{user_id}', unexpected: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting tasks by user ID",
        )


@tasks_router.patch("/", status_code=status.HTTP_204_NO_CONTENT, tags=["tasks"])
async def update_task(
    task_update: TaskUpdate,
    tasks_service: TasksService = Depends(get_tasks_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        await tasks_service.update_task(task_update, current_user)
    except AuthError:
        logger.warning(
            f"Error updating task '{task_update.model_dump()}': authorization error"
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(f"Error updating task '{task_update.model_dump()}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except EmptyRecordUpdateError:
        logger.error(f"Error updating task '{task_update.model_dump()}': no update operations")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update operations",
        )
    except RecordUpdateError:
        logger.error(f"Error updating task '{task_update.model_dump()}': update error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating task",
        )
    except Exception as e:
        logger.error(
            f"Error updating task '{task_update.model_dump()}', unexpected: {e}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating task",
        )


@tasks_router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["tasks"])
async def delete_task(
    task_id: str,
    tasks_service: TasksService = Depends(get_tasks_service),
    current_user: UserInDB = Depends(get_current_user),
):
    try:
        await tasks_service.delete_task(task_id, current_user)
    except AuthError:
        logger.warning(f"Error deleting task with ID '{task_id}': authorization error")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except RecordNotFoundError:
        logger.error(f"Error deleting task with ID '{task_id}': not found")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    except RecordDeletionError:
        logger.error(f"Error deleting task with ID '{task_id}': deletion error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting profile",
        )
    except Exception as e:
        logger.error(f"Error deleting task with ID '{task_id}', unexpected: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting profile",
        )
