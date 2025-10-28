from enum import StrEnum, auto

from pydantic import BaseModel, Field


class FrequencySpecifier(StrEnum):
    NO_REPEAT = auto()
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
    specifier = FOREVER: value is ignored
    specifier = NUMBER_OF_TIMES: value dictates how many times to repeat until
    specifier = UNTIL: value is a timestamp for when to repeat until
    """

    specifier: DurationSpecifier = DurationSpecifier.FOREVER
    value: int = 0


class RepeatFrequency(BaseModel):
    """
    Frequency of repetition:
    NO_REPEAT: default value, repetition is ignored
    DAILY_REPEAT: repeat daily
    WEEKLY_REPEAT: repeat weekly, specify days_of_week to repeat on (Ex: every '0','2' (M,W))
    MONTHLY_REPEAT: repeat monthly, specify a day_of_month to repeat on (Ex: every '16'th)
    YEARLY_REPEAT: repeat yearly, specify a day_of_month and month_of_year to repeat on (Ex: every '1'/'10' (Jan 10th))
    """

    specifier: FrequencySpecifier = FrequencySpecifier.NO_REPEAT
    value: int = Field(default=1, ge=1)

    days_of_week: list[int] = Field(
        default_factory=list, description="0=Monday ... 6=Sunday", max_items=7
    )  # only applicable for weekly repeat
    day_of_month: int | None = Field(
        default=None, ge=1, le=31
    )  # only applicable for monthly & yearly repeat
    month_of_year: int | None = Field(
        default=None, ge=1, le=12
    )  # only applicable for yearly repeat


class RepeatRule(BaseModel):
    """
    Repetition details
    frequency (RepeatFrequency): how often to repeat
    duration (RepeatDuration): when to stop repetition
    """

    frequency: RepeatFrequency
    duration: RepeatDuration


class Task(BaseModel):
    """
    Task data model
    id (str): ID of task
    name (str): name of task
    desc (str): description of task
    cat (str): category of task
    due_date (int): timestamp of when task is due, repetition starts on this date
    repeat_rule (RepeatRule): how to repeat, if at all
    """

    id: str
    user_id: str
    name: str
    desc: str
    cat: str
    due_date: int

    repeat_rule: RepeatRule


class TaskInDB(Task):
    created_at: int = -1
    updated_at: int = -1


class TaskUpdate(BaseModel):
    id: str
    name: str | None = None
    description: str | None = None
    category: str | None = None

    due_date: int | None = None

    repeat_rule: RepeatRule | None = None
