import random
from datetime import date, timedelta

import pytest

from src.models import (
    DurationSpecifier,
    FrequencySpecifier,
    RepeatDuration,
    RepeatFrequency,
    RepeatRule,
    TaskInDB,
)


def rand_date(start=date(2000, 1, 1), end=date(2100, 1, 1)):
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))


def generate_expected(task: TaskInDB, start: date, end: date):
    occurrences = []

    if task.repeat_rule is None:
        return [task.first_relevant_date]

    freq_spec = task.repeat_rule.frequency.specifier
    freq_val = task.repeat_rule.frequency.value
    dur_spec = task.repeat_rule.duration.specifier
    dur_val = task.repeat_rule.duration.value

    d = task.first_relevant_date

    # number-of-times cutoff
    if dur_spec == DurationSpecifier.NUMBER_OF_TIMES:
        max_count = dur_val
    else:
        max_count = float("inf")

    count = 0

    # main loop
    while True:
        # STOP: exceeded count
        if isinstance(max_count, int) and count > max_count:
            break

        # STOP: UNTIL_DATE cutoff
        if (
            dur_spec == DurationSpecifier.UNTIL_DATE
            and isinstance(dur_val, date)
            and d > dur_val
        ):
            break

        # STOP: beyond range
        if d > end:
            break

        # include only if >= start
        if d >= start:
            occurrences.append(d)

        # increment
        if freq_spec == FrequencySpecifier.DAILY:
            d += timedelta(days=freq_val)
        elif freq_spec == FrequencySpecifier.WEEKLY:
            d += timedelta(weeks=freq_val)
        elif freq_spec == FrequencySpecifier.MONTHLY:
            d = task._add_months(d, freq_val)
        elif freq_spec == FrequencySpecifier.YEARLY:
            d = task._add_years(d, freq_val)

        count += 1

    return occurrences


def params():
    for _ in range(10):
        # random first date
        first = rand_date()

        # ensure start <= end
        start = rand_date()
        end = rand_date()
        if start > end:
            start, end = end, start

        # random duration UNTIL_DATE selection
        until = rand_date()
        for freq_spec in [
            FrequencySpecifier.DAILY,
            FrequencySpecifier.WEEKLY,
            FrequencySpecifier.MONTHLY,
            FrequencySpecifier.YEARLY,
        ]:
            for freq_val in [1, 2, 3]:
                # FOREVER
                yield (
                    first,
                    freq_spec,
                    freq_val,
                    DurationSpecifier.FOREVER,
                    None,
                    start,
                    end,
                )

                # NUMBER OF TIMES (1–4)
                for n in [1, 2, 3, 4]:
                    yield (
                        first,
                        freq_spec,
                        freq_val,
                        DurationSpecifier.NUMBER_OF_TIMES,
                        n,
                        start,
                        end,
                    )

                yield (
                    first,
                    freq_spec,
                    freq_val,
                    DurationSpecifier.UNTIL_DATE,
                    until,
                    start,
                    end,
                )


@pytest.mark.parametrize(
    "first,freq_spec,freq_val,dur_spec,dur_val,start,end",
    list(params()),
)
def test_generate_occurrences_exhaustive(
    first, freq_spec, freq_val, dur_spec, dur_val, start, end
):
    # Build task
    repeat_rule = RepeatRule(
        frequency=RepeatFrequency(specifier=freq_spec, value=freq_val),
        duration=RepeatDuration(specifier=dur_spec, value=dur_val),
    )

    task = TaskInDB(
        id="t1",
        user_id="u1",
        name="Test",
        first_relevant_date=first,
        created_at=date.today(),
        updated_at=date.today(),
        repeat_rule=repeat_rule,
    )

    # Compute expected results manually
    expected = generate_expected(task, start, end)

    # Get actual
    actual = task.generate_occurrences_in_range(start, end)

    assert actual == expected, (
        f"\nMismatch:\n"
        f"first={first}, start={start}, freq={freq_spec.name}({freq_val}), dur={dur_spec.name}({dur_val})\n"
        f"expected={expected}\n"
        f"actual={actual}\n"
    )
