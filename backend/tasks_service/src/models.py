from enum import StrEnum, auto

from pydantic import BaseModel, Field


class FrequencySpecifier(StrEnum):
    DAILY = auto()
    WEEKLY = auto()
    MONTHLY = auto()
    YEARLY = auto()


class DurationSpecifier(StrEnum):
    FOREVER = auto()
    NUMBER_OF_TIMES = auto()
    UNTIL_DATE = auto()


class RepeatDuration(BaseModel):
    """
    Duration of repetition:
    - FOREVER: value is ignored
    - NUMBER_OF_TIMES: value = how many times to repeat
    - UNTIL_DATE: value = timestamp until which to repeat
    """
    specifier: DurationSpecifier | None = DurationSpecifier.FOREVER
    value: int | None = None


class RepeatFrequency(BaseModel):
    """
    Frequency of repetition:
    - specifier:
        - DAILY: repeat daily
        - WEEKLY: repeat weekly, specify days_of_week (0=Mon ... 6=Sun)
        - MONTHLY: specify day_of_month (1-31)
        - YEARLY: specify day_of_month (1-31) and month_of_year (1-12)
    - value: amount to repeat (ex: every x days/weeks/months/year where x is value)
    """

    specifier: FrequencySpecifier | None = None
    value: int | None = Field(default=None, ge=1)

    days_of_week: list[int] | None = Field(default=None, max_items=7)
    day_of_month: int | None = Field(default=None, ge=1, le=31)
    month_of_year: int | None = Field(default=None, ge=1, le=12)


class RepeatRule(BaseModel):
    """
    Repetition details:
    frequency: how often to repeat
    duration: when to stop repetition
    """
    frequency: RepeatFrequency | None = None
    duration: RepeatDuration | None = None


class Task(BaseModel):
    """
    Task data model
    - id: id of task, optional at creation
    - user_id: owner of task
    - name, desc, cat: descriptive fields
    - due_date: timestamp when task is due (repetition starts here)
    - repeat_rule: how to repeat, if at all
    """
    id: str | None = None
    user_id: str
    name: str
    desc: str
    cat: str | None = None
    due_date: int

    repeat_rule: RepeatRule | None = None


class TaskInDB(Task):
    created_at: int = -1
    updated_at: int = -1

    def to_base(self):
        return Task.model_validate(self.model_dump(), extra="ignore")


class TaskUpdate(BaseModel):
    id: str
    name: str | None = None
    desc: str | None = None
    cat: str | None = None
    due_date: int | None = None
    repeat_rule: RepeatRule | None = None


class PaginatedTasks(BaseModel):
    continuation_token: str | None = None
    tasks: list[TaskInDB]
