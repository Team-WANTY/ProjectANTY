from datetime import date

from shared.auth import authorize_operation
from shared.models.auth import UserAuthInfo
from shared.simple_logging import logger

from src.database import TaskDB
from src.models import OccurrencesByDate, TaskCreate, TaskUpdate


class TasksService:
    def __init__(self, task_db: TaskDB):
        self.task_db = task_db

    async def create_task(self, new_task: TaskCreate, creater: UserAuthInfo):
        logger.debug(
            f"Starting to create task: {new_task.model_dump()}, starting with authorization"
        )
        await authorize_operation(creater, new_task.user_id)
        new_task_in_db = new_task.to_task_in_db()
        logger.debug("Created task for DB, calculating 'last_relevant_date' field")
        new_task_in_db.calculate_last_relevant_date()
        await self.task_db.create_task(new_task_in_db)

    async def get_task_by_id(self, task_id: str, getter: UserAuthInfo):
        task = await self.task_db.get_task_by_id(task_id)
        await authorize_operation(getter, task.user_id)
        return task

    async def get_users_task_ids_in_range(
        self, user_id: str, start_date: date, end_date: date, getter: UserAuthInfo
    ):
        logger.debug(
            f"Starting to get all tasks from dates '{start_date}' to '{end_date}' for user with ID '{user_id}', starting with authorization"
        )
        await authorize_operation(getter, user_id)

        results: dict[date, list[str]] = {}

        logger.debug(
            f"Getting tasks for user with ID '{user_id}', for each task calculate occurrences between '{start_date}'-'{end_date}'"
        )
        async for task in self.task_db.get_users_tasks_in_range(
            user_id, start_date, end_date
        ):
            logger.debug(
                f"For user with ID '{user_id}', got task with ID '{task.id}'. Calculating occurrences"
            )
            for d in task.generate_occurrences_in_range(start_date, end_date):
                results.setdefault(d, []).append(task.id)
        logger.debug(
            f"Got all task occurrences for user with ID '{user_id}': {results}"
        )
        return OccurrencesByDate(occurrences=results)

    async def update_task(self, task_update: TaskUpdate, updater: UserAuthInfo):
        task = await self.get_task_by_id(task_update.id, updater)
        logger.debug(
            f"Starting task update on task with ID '{task_update.id}', starting with authorization"
        )
        await authorize_operation(updater, task.user_id)
        updated_task = await self.task_db.update_task(task_update)
        logger.debug(f"Returning updated task: {updated_task.model_dump()}")
        return updated_task  # updates could be empty

    async def delete_task(self, task_id: str, deleter: UserAuthInfo):
        task = await self.get_task_by_id(task_id, deleter)
        logger.debug(
            f"Starting to delete task with ID '{task_id}', starting with authorization"
        )
        await authorize_operation(deleter, task.user_id)
        await self.task_db.delete_task(task_id)
