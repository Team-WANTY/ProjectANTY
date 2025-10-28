import logging

from shared.auth import authorize_operation
from shared.models.auth import UserAuthInfo

from src.database import TaskDB
from src.models import Task, TaskUpdate

logger = logging.getLogger("tasks_service")


class TasksService:
    def __init__(self, task_db: TaskDB):
        self.task_db = task_db

    async def create_task(self, new_task: Task, creater: UserAuthInfo):
        await authorize_operation(creater, new_task.user_id)
        return await self.task_db.create_task(new_task)

    async def get_task_by_id(self, task_id: str, getter: UserAuthInfo):
        task = await self.task_db.get_task_by_id(task_id)
        await authorize_operation(getter, task.user_id)
        return task

    async def get_tasks_by_user_id(self, user_id: str, qty: int, getter: UserAuthInfo):
        await authorize_operation(getter, user_id)
        return await self.task_db.get_tasks_by_user_id(user_id, qty)

    async def update_task(self, task_upate: TaskUpdate, updater: UserAuthInfo) -> Task:
        task_owner_id = self.get_task_by_id(task_upate.id, updater).user_id
        await authorize_operation(updater, task_owner_id)
        return await self.task_db.update_task(task_upate)

    async def delete_task(self, task_id: str, deleter: UserAuthInfo):
        task_owner_id = self.get_task_by_id(task_id, deleter).user_id
        await authorize_operation(deleter, task_owner_id)
        await self.task_db.delete_task(task_id)
