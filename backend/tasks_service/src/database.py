from datetime import date

from azure.cosmos import CosmosDict, exceptions
from azure.cosmos.aio import ContainerProxy
from pydantic import ValidationError
from shared.db import generate_id, now_timestamp
from shared.exceptions.db import (
    EmptyRecordUpdateError,
    GeneralQueryError,
    RecordAlreadyExistsError,
    RecordCreationError,
    RecordDeletionError,
    RecordNotFoundError,
    RecordUpdateError,
)
from shared.simple_logging import logger

from src.models import TaskInDB, TaskUpdate


class TaskDB:
    def __init__(self, container: ContainerProxy):
        self.container = container
        logger.debug("Created TaskDB")

    async def create_task(self, new_task: TaskInDB):
        try:
            logger.debug(
                f"Trying to create task: {new_task.model_dump()}, first setting default values (id, create/update timestamps)"
            )
            new_task.id = generate_id()
            new_task.created_at = now_timestamp()
            new_task.updated_at = now_timestamp()
            logger.debug("Sending task to DB")
            item: CosmosDict = await self.container.create_item(
                body=new_task.model_dump(mode="json")
            )
            logger.debug("Successfully sent to DB, validating response")
            created_task = TaskInDB.model_validate(item, extra="ignore")
            logger.debug(f"Successfully created task: {created_task.model_dump()}")
            return created_task.id
        except exceptions.CosmosResourceExistsError:
            logger.error(
                f"Error creating task ({new_task.model_dump()}): task already exists"
            )
            raise RecordAlreadyExistsError()
        except Exception as e:
            logger.error(
                f"Error creating task ({new_task.model_dump()}), unexpected error: {e}"
            )
            raise RecordCreationError()

    async def get_task_by_id(self, task_id: str) -> TaskInDB:
        try:
            logger.debug(f"Trying to get task with ID {task_id}")
            item: CosmosDict = await self.container.read_item(
                item=task_id, partition_key=task_id
            )
            task = TaskInDB.model_validate(item, extra="ignore")
            logger.debug(
                f"Successfully got task with ID {task_id}: {task.model_dump()}"
            )
            return task
        except exceptions.CosmosResourceNotFoundError:
            logger.error(f"Error getting task with ID {task_id}: not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(f"Error getting task with ID {task_id}, unexpected: {e}")
            raise GeneralQueryError()

    async def get_users_tasks_in_range(
        self, user_id: str, reference_start: date, reference_end: date
    ):
        query = """
            SELECT * FROM c
            WHERE c.user_id = @user_id
            AND c.first_relevant_date <= @reference_end
            AND c.last_relevant_date >= @reference_start
        """
        parameters = [
            {"name": "@user_id", "value": user_id},
            {"name": "@reference_start", "value": reference_start.isoformat()},
            {"name": "@reference_end", "value": reference_end.isoformat()},
        ]

        try:
            logger.debug(
                f"Trying to get all tasks of user with ID '{user_id}' from dates '{reference_start}' to '{reference_end}'"
            )
            async for item in self.container.query_items(query=query, parameters=parameters):
                yield TaskInDB.model_validate(item, extra="ignore")
        except Exception as e:
            logger.error(
                f"Error getting all tasks of user with ID '{user_id}' from dates '{reference_start}' to '{reference_end}', unexpected: {e}"
            )
            raise GeneralQueryError()

    async def update_task(self, task_update: TaskUpdate):
        patch_operations = []
        task_update_json = task_update.model_dump(mode="json")
        try:
            logger.debug(f"Trying to update task: {task_update_json}")
            if task_update.name is not None:
                logger.debug(
                    f"Updating name to '{task_update.name}' for task with ID '{task_update.id}'"
                )
                patch_operations.append(
                    {"op": "replace", "path": "/name", "value": task_update.name}
                )

            if task_update.desc is not None:
                logger.debug(
                    f"Updating description to '{task_update.desc}' for task with ID '{task_update.id}'"
                )
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/desc",
                        "value": task_update.desc,
                    }
                )

            if task_update.cat is not None:
                logger.debug(
                    f"Updating category to '{task_update.cat}' for task with ID '{task_update.id}'"
                )
                patch_operations.append(
                    {"op": "replace", "path": "/cat", "value": task_update.cat}
                )

            if task_update.first_relevant_date is not None:
                logger.debug(
                    f"Updating due date to '{task_update_json['first_relevant_date']}' for task with ID '{task_update.id}'"
                )
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/first_relevant_date",
                        "value": task_update_json["first_relevant_date"],
                    }
                )

            if task_update.repeat_rule is not None:
                logger.debug(
                    f"Updating repeat rule to '{task_update.repeat_rule}' for task with ID '{task_update.id}'"
                )
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/repeat_rule",
                        "value": task_update.repeat_rule.model_dump(mode="json"),
                    }
                )
            if task_update.completions is not None:
                logger.debug(
                    f"Updating completions to '{task_update_json['completions']}' for task with ID '{task_update.id}'"
                )
                patch_operations.append(
                    {
                        "op": "replace",
                        "path": "/completions",
                        "value": task_update_json["completions"],
                    }
                )

            if len(patch_operations) == 0:
                logger.debug(
                    f"No valid operations when trying to update task with ID '{task_update.id}'"
                )
                raise EmptyRecordUpdateError()

            if task_update.repeat_rule is not None or task_update.first_relevant_date is not None:
                old_task = await self.get_task_by_id(task_update.id)
                if task_update.repeat_rule is not None:
                    old_task.repeat_rule = task_update.repeat_rule
                if task_update.first_relevant_date is not None:
                    old_task.first_relevant_date = task_update.first_relevant_date
                old_task.calculate_last_relevant_date()
                if old_task.last_relevant_date is not None:
                    logger.debug(
                        f"Updating last relevant date for task with ID '{task_update.id}'"
                    )
                    patch_operations.append(
                        {
                            "op": "replace",
                            "path": "/last_relevant_date",
                            "value": old_task.last_relevant_date.isoformat(),
                        }
                    )

            logger.debug(
                f"Updating 'updated_at' timestamp for task with ID '{task_update.id}'"
            )
            patch_operations.append(
                {
                    "op": "replace",
                    "path": "/updated_at",
                    "value": now_timestamp().isoformat(),
                }
            )

            logger.debug(f"Sending update for task with ID '{task_update.id}' to DB")
            item = await self.container.patch_item(
                item=task_update.id,
                partition_key=task_update.id,
                patch_operations=patch_operations,
            )
            logger.debug(f"Successfully updated task on DB: {item}")
        except exceptions.CosmosResourceNotFoundError:
            logger.error(
                f"Error trying to update task with ID '{task_update.id}': not found"
            )
            raise RecordNotFoundError()
        except EmptyRecordUpdateError:
            raise
        except Exception as e:
            logger.error(
                f"Error trying to update task with ID '{task_update.id}', unexpected: {e}"
            )
            raise RecordUpdateError()

    async def delete_task(self, task_id: str):
        try:
            logger.debug(f"Trying to delete task with ID '{task_id}'")
            await self.container.delete_item(item=task_id, partition_key=task_id)
            logger.debug(f"Successfully deleted task with ID '{task_id}'")
        except exceptions.CosmosResourceNotFoundError:
            logger.error(f"Error deleting task with ID '{task_id}': not found")
            raise RecordNotFoundError()
        except Exception as e:
            logger.error(f"Error deleting task with ID '{task_id}', unexpected: {e}")
            raise RecordDeletionError()
