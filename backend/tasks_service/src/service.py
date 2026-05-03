from datetime import date

from shared.auth import authorize_operation
from shared.models.users import UserInDB
from shared.settings import settings as shared_settings
from shared.simple_logging import logger

from src.database import TaskDB
from src.models import OccurrencesByDate, TaskCreate, TaskUpdate


class TasksService:
    def __init__(self, task_db: TaskDB):
        self.task_db = task_db

    async def create_task(self, new_task: TaskCreate, creater: UserInDB):
        logger.debug(
            f"Starting to create task: {new_task.model_dump()}, starting with authorization"
        )
        await authorize_operation(creater, new_task.user_id)
        new_task_in_db = new_task.to_task_in_db()
        logger.debug("Created task for DB, calculating 'last_relevant_date' field")
        new_task_in_db.calculate_last_relevant_date()
        return await self.task_db.create_task(new_task_in_db)

    async def get_task_by_id(self, task_id: str, getter: UserInDB):
        task = await self.task_db.get_task_by_id(task_id)
        await authorize_operation(getter, task.user_id)
        return task

    async def get_users_task_ids_in_range(
        self, user_id: str, start_date: date, end_date: date, getter: UserInDB
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

    async def update_task(self, task_update: TaskUpdate, updater: UserInDB):
        task = await self.get_task_by_id(task_update.id, updater)
        logger.debug(
            f"Starting task update on task with ID '{task_update.id}', starting with authorization"
        )
        await authorize_operation(updater, task.user_id)
        await self.task_db.update_task(task_update)
        # TODO need input validation to prevent spam attacks from users maliciously sending task updates
        if task_update.completions is not None:
            async with AsyncClient() as client:
                resp = await client.get(
                    f"{shared_settings.FRIENDS_SERVICE_URL}/{task.user_id}",
                    headers={"X-Interservice-Key": shared_settings.INTERSERVICE_KEY},
                )    
                if resp.status_code == 404:
                    return #no friends, no one to notify
                elif resp.status_code != 200:
                    raise GeneralQueryError()
                else:
                    friend_ids = resp.json()

                response = await client.post(
                    f"{shared_settings.NOTIFICATIONS_SERVICE_URL}",
                    headers={"X-Interservice-Key": shared_settings.INTERSERVICE_KEY},
                    json={
                        "recipient_user_ids": friend_ids,
                        "actor_user_id": task.user_id,
                        "detail": "task.completed",
                        "entity_type": "task",
                        "entity_id": task.id,
                    }
                )
                if response.status_code != 201:
                    raise RecordCreationError()

    async def delete_task(self, task_id: str, deleter: UserInDB):
        task = await self.get_task_by_id(task_id, deleter)
        logger.debug(
            f"Starting to delete task with ID '{task_id}', starting with authorization"
        )
        await authorize_operation(deleter, task.user_id)
        await self.task_db.delete_task(task_id)
