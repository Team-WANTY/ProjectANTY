from calendar import monthrange
from datetime import date, datetime, timedelta
from enum import StrEnum, auto

from pydantic import BaseModel, Field
from shared.db import generate_id, now_timestamp


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
    - UNTIL_DATE: value = date until which to repeat
    """

    specifier: DurationSpecifier = DurationSpecifier.FOREVER
    value: None | int | date = (
        None  # None for forever, int for number_of_times, date for until_date
    )


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

    specifier: FrequencySpecifier
    value: int = Field(default=1, ge=1)


class RepeatRule(BaseModel):
    """
    Repetition details:
    frequency: how often to repeat
    duration: when to stop repetition
    """

    frequency: RepeatFrequency
    duration: RepeatDuration


class TaskCreate(BaseModel):
    user_id: str
    name: str
    desc: str | None = None
    cat: str | None = None

    first_relevant_date: date
    repeat_rule: RepeatRule | None = None

    def to_task_in_db(self) -> """TaskInDB""":
        return TaskInDB(
            id=generate_id(),
            user_id=self.user_id,
            name=self.name,
            desc=self.desc,
            cat=self.cat,
            first_relevant_date=self.first_relevant_date,
            repeat_rule=self.repeat_rule,
            created_at=now_timestamp(),
            updated_at=now_timestamp(),
        )


class TaskInDB(BaseModel):
    """
    Task data model
    - id: id of task, optional at creation
    - user_id: owner of task
    - name, desc, cat: descriptive fields

    - repeat_rule: how to repeat, if at all
    """

    id: str
    user_id: str
    name: str
    desc: str | None = None
    cat: str | None = None
    completions: list[date] | None = (
        None  # TODO only supports tasks that can be completed once a day, add support for tasks that can be completed multiple times (`drank a cup of water` 4 times today)
    )

    first_relevant_date: date
    last_relevant_date: date | None = None
    repeat_rule: RepeatRule | None = None

    created_at: datetime
    updated_at: datetime

    def _add_months(self, d: date, months: int) -> date:
        new_year = d.year + (d.month - 1 + months) // 12
        new_month = (d.month - 1 + months) % 12 + 1
        last_day = monthrange(new_year, new_month)[1]
        new_day = min(self.first_relevant_date.day, last_day)
        return date(new_year, new_month, new_day)

    @staticmethod
    def _add_years(d: date, years: int) -> date:
        try:
            return d.replace(year=d.year + years)
        except ValueError:
            # Feb 29 → Feb 28 for non-leap years
            return d.replace(year=d.year + years, day=28)

    def calculate_last_relevant_date(self):
         # One-off task (no repeat_rule) -> last = first
        if self.repeat_rule is None:
            self.last_relevant_date = self.first_relevant_date
            return

        freq = self.repeat_rule.frequency
        dur = self.repeat_rule.duration

        match dur.specifier:
            case DurationSpecifier.FOREVER:
                self.last_relevant_date = None
                return

            case DurationSpecifier.NUMBER_OF_TIMES:
                n = dur.value
                if not isinstance(n, int):
                    raise ValueError("NUMBER_OF_TIMES duration must be int")

                match freq.specifier:
                    case FrequencySpecifier.DAILY:
                        self.last_relevant_date = self.first_relevant_date + timedelta(
                            days=freq.value * n
                        )
                    case FrequencySpecifier.WEEKLY:
                        self.last_relevant_date = self.first_relevant_date + timedelta(
                            weeks=freq.value * n
                        )
                    case FrequencySpecifier.MONTHLY:
                        self.last_relevant_date = self._add_months(
                            self.first_relevant_date, freq.value * n
                        )
                    case FrequencySpecifier.YEARLY:
                        self.last_relevant_date = self._add_years(
                            self.first_relevant_date, freq.value * n
                        )
                return

            case DurationSpecifier.UNTIL_DATE:
                if not isinstance(dur.value, date):
                    raise ValueError("UNTIL_DATE duration must be a date")

                due_date = dur.value
                prev_d = None
                curr_d = self.first_relevant_date

                while curr_d <= due_date:
                    prev_d = curr_d
                    match freq.specifier:
                        case FrequencySpecifier.DAILY:
                            curr_d += timedelta(days=freq.value)
                        case FrequencySpecifier.WEEKLY:
                            curr_d += timedelta(weeks=freq.value)
                        case FrequencySpecifier.MONTHLY:
                            curr_d = self._add_months(curr_d, freq.value)
                        case FrequencySpecifier.YEARLY:
                            curr_d = self._add_years(curr_d, freq.value)

                self.last_relevant_date = prev_d
                return

    def generate_occurrences_in_range(self, start: date, end: date) -> list[date]:
        # Handle one-off tasks (no repeat_rule)
        if self.repeat_rule is None:
            if start <= self.first_relevant_date <= end:
                return [self.first_relevant_date]
            return []

        freq = self.repeat_rule.frequency
        dur = self.repeat_rule.duration

        def within_duration(d: date) -> bool:
            if d > end:
                return False

            # UNTIL_DATE cutoff
            if dur.specifier == DurationSpecifier.UNTIL_DATE and isinstance(
                dur.value, date
            ):
                if d > dur.value:
                    return False

            # NUMBER_OF_TIMES cutoff
            if dur.specifier == DurationSpecifier.NUMBER_OF_TIMES:
                n = dur.value
                if isinstance(n, int):
                    match freq.specifier:
                        case FrequencySpecifier.DAILY:
                            last_valid = self.first_relevant_date + timedelta(
                                days=freq.value * n
                            )
                        case FrequencySpecifier.WEEKLY:
                            last_valid = self.first_relevant_date + timedelta(
                                weeks=freq.value * n
                            )
                        case FrequencySpecifier.MONTHLY:
                            last_valid = self._add_months(
                                self.first_relevant_date, freq.value * n
                            )
                        case FrequencySpecifier.YEARLY:
                            last_valid = self._add_years(
                                self.first_relevant_date, freq.value * n
                            )
                    if d > last_valid:
                        return False
            return True

        results = []
        every = freq.value

        # DAILY
        if freq.specifier == FrequencySpecifier.DAILY:
            if start > self.first_relevant_date:
                raw_diff = (start - self.first_relevant_date).days
                snap = 0 if raw_diff % every == 0 else (every - (raw_diff % every))
                snapped_diff = raw_diff + snap
                first = self.first_relevant_date + timedelta(days=snapped_diff)
                if first < start:
                    first += timedelta(days=every)
            else:
                first = self.first_relevant_date

            if self.last_relevant_date and first > self.last_relevant_date:
                return []
            d = first
            while within_duration(d):
                results.append(d)
                d += timedelta(days=every)
            return results

        # WEEKLY
        if freq.specifier == FrequencySpecifier.WEEKLY:
            if start > self.first_relevant_date:
                raw_diff = (start - self.first_relevant_date).days // 7
                snap = 0 if raw_diff % every == 0 else (every - (raw_diff % every))
                snapped_diff = raw_diff + snap
                first = self.first_relevant_date + timedelta(weeks=snapped_diff)
                if first < start:
                    first += timedelta(weeks=every)
            else:
                first = self.first_relevant_date

            if self.last_relevant_date and first > self.last_relevant_date:
                return []
            d = first
            while within_duration(d):
                results.append(d)
                d += timedelta(weeks=every)
            return results

        # MONTHLY
        if freq.specifier == FrequencySpecifier.MONTHLY:
            if start > self.first_relevant_date:
                raw_diff = (start.year - self.first_relevant_date.year) * 12 + (
                    start.month - self.first_relevant_date.month
                )
                snap = 0 if raw_diff % every == 0 else (every - (raw_diff % every))
                snapped_diff = raw_diff + snap
                first = self._add_months(self.first_relevant_date, snapped_diff)
                if first < start:
                    first = self._add_months(first, every)

            else:
                first = self.first_relevant_date

            if self.last_relevant_date and first > self.last_relevant_date:
                return []
            d = first
            while within_duration(d):
                results.append(d)
                d = self._add_months(d, every)
            return results

        # YEARLY
        if freq.specifier == FrequencySpecifier.YEARLY:
            if start <= self.first_relevant_date:
                first = self.first_relevant_date
            else:
                raw_diff = start.year - self.first_relevant_date.year
                snap = 0 if raw_diff % every == 0 else (every - (raw_diff % every))
                snapped_diff = raw_diff + snap

                first = self._add_years(self.first_relevant_date, snapped_diff)
                if first < start:
                    first = self._add_years(first, every)

            if self.last_relevant_date and first > self.last_relevant_date:
                return []
            d = first
            while within_duration(d):
                results.append(d)
                d = self._add_years(d, every)
            return results

        return []


class TaskUpdate(BaseModel):
    id: str
    name: str | None = None
    desc: str | None = None
    cat: str | None = None
    completions: list[date] | None = None
    first_relevant_date: date | None = None
    repeat_rule: RepeatRule | None = None


class OccurrencesByDate(BaseModel):
    occurrences: dict[date, list[str]]
