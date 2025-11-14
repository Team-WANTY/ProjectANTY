import logging

from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from shared.db import generate_id, now_timestamp
from shared.exceptions.db import (
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)

from src.models import Task, TaskInDB, TaskUpdate, PaginatedTasks
from json import dumps, loads, JSONDecodeError

logger = logging.getLogger("tasks_service")


# TODO should these functions return TaskInDB instead?
class TaskDB:
    def __init__(self, container: ContainerProxy):
        self.container = container

    async def create_task(self, new_task: Task) -> TaskInDB:
        try:
            new_task_in_db = TaskInDB.model_validate(
                new_task.model_dump(), extra="ignore"
            )
            new_task_in_db.id = generate_id()
            new_task_in_db.created_at: int = now_timestamp()
            new_task_in_db.updated_at: int = now_timestamp()
            item: CosmosDict = await self.container.create_item(
                body=new_task_in_db.model_dump()
            )
            created_task = TaskInDB.model_validate(item, extra="ignore")
            return created_task
        except exceptions.CosmosResourceExistsError:
            raise RecordAlreadyExistsError()
        except Exception as e:
            logger.debug(f"Error: {e}")
            raise RecordCreationError()

    async def get_task_by_id(self, task_id: str) -> TaskInDB:
        try:
            item: CosmosDict = await self.container.read_item(
                item=task_id, partition_key=task_id
            )
            print(item)
            task = TaskInDB.model_validate(item, extra="ignore")
            return task
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception:
            raise GeneralQueryError()

    async def get_tasks_by_user_id(
        self, user_id: str, quantity:int, cont_token:str | None = None
    ) -> tuple[list[TaskInDB], str | None]:
        def normalize_continuation_token(raw: str | None) -> dict | None:
            if not raw:
                return None
            
            try:
                parsed = loads(raw)
            except JSONDecodeError:
                return None

            if isinstance(parsed, dict):
                return dumps(parsed)
            elif isinstance(parsed, list) and len(parsed) > 0 and isinstance(parsed[0], dict):
                return dumps(parsed[0])

            return None

        query = "SELECT * FROM c WHERE c.user_id = @user_id"
        parameters: list[dict[str, object]] = [{"name": "@user_id", "value": user_id}]
        try:
            result_iterable = self.container.query_items(
                query=query,
                parameters=parameters,
                max_item_count=quantity,
            )
            pager = result_iterable.by_page(cont_token)
            tasks: list[TaskInDB] = []
            async for page in pager:
                async for item in page:
                    tasks.append(TaskInDB.model_validate(item, extra="ignore"))
                break  # do only one page
            new_cont_token = normalize_continuation_token(pager.continuation_token)
            return PaginatedTasks(continuation_token=new_cont_token, tasks=tasks) # return continuation token, function can be recalled with the continuation token to get the next list of items
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception as e:
            print("ERROR!:",e)
            raise GeneralQueryError()

    

    async def update_task(self, task_upate: TaskUpdate) -> TaskInDB | None:
        patch_operations = []
        try:
            if task_upate.name is not None:
                patch_operations.append(
                    {"op": "replace", "path": "/name", "value": task_upate.name}
                )

            if task_upate.desc is not None:
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/desc",
                        "value": task_upate.desc,
                    }
                )

            if task_upate.cat is not None:
                patch_operations.append(
                    {"op": "replace", "path": "/cat", "value": task_upate.cat}
                )

            if task_upate.due_date is not None:
                patch_operations.append(
                    {"op": "replace", "path": "/due_date", "value": task_upate.due_date}
                )

            if task_upate.repeat_rule is not None:
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/repeat_rule",
                        "value": task_upate.repeat_rule.model_dump(),
                    }
                )

            if len(patch_operations) == 0:
                return None

            patch_operations.append(
                {
                    "op": "replace",
                    "path": "/updated_at",
                    "value": now_timestamp(),
                }
            )

            item = await self.container.patch_item(
                item=task_upate.id,
                partition_key=task_upate.id,
                patch_operations=patch_operations,
            )
            task = TaskInDB.model_validate(item, extra="ignore")
            return task
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception:
            raise RecordUpdateError()

    async def delete_task(self, task_id: str):
        try:
            await self.container.delete_item(item=task_id, partition_key=task_id)
        except exceptions.CosmosResourceNotFoundError:
            raise RecordNotFoundError()
        except Exception:
            raise RecordDeletionError()
