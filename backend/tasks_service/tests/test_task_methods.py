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

# helper functions


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


class TestGenerateOccurrences:
    @pytest.mark.parametrize(
        "first,freq_spec,freq_val,dur_spec,dur_val,start,end",
        list(params()),
    )
    def test_generate_occurrences_exhaustive(
        self, first, freq_spec, freq_val, dur_spec, dur_val, start, end
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


class TestHelperMethods:
    def test_add_months(self):
        dates = [rand_date(), rand_date()]
        sorted_dates = sorted(dates)
        task = TaskInDB(
            id="t1",
            user_id="u1",
            name="Test",
            first_relevant_date=sorted_dates[0],
            created_at=date.today(),
            updated_at=date.today(),
        )

        month_diff = abs(
            (sorted_dates[1].year - sorted_dates[0].year) * 12
            + (sorted_dates[1].month - sorted_dates[0].month)
        )
        assert (
            task._add_months(sorted_dates[0], month_diff).month == sorted_dates[1].month
        )

    def test_add_years(self):
        dates = [rand_date(), rand_date()]
        sorted_dates = sorted(dates)
        task = TaskInDB(
            id="t1",
            user_id="u1",
            name="Test",
            first_relevant_date=sorted_dates[0],
            created_at=date.today(),
            updated_at=date.today(),
        )

        year_diff = sorted_dates[1].year - sorted_dates[0].year
        assert task._add_years(sorted_dates[0], year_diff).year == sorted_dates[1].year

    def test_add_years_leap_year(self):
        assert TaskInDB._add_years(date(2000, 2, 29), 1) == date(2001, 2, 28)


class TestCalculateLastRelevantDate:
    def test_calculate_last_relevant_date_forever(self, sample_repeat_rule):
        rr = sample_repeat_rule
        rr.duration.specifier = DurationSpecifier.FOREVER
        task = TaskInDB(
            id="t1",
            user_id="u1",
            name="Test",
            first_relevant_date=date(2000, 1, 1),
            repeat_rule=rr,
            created_at=date.today(),
            updated_at=date.today(),
        )

        task.calculate_last_relevant_date()
        assert task.last_relevant_date is None

    def test_calculate_last_relevant_number_of_times_value_not_int(
        self, sample_repeat_rule
    ):
        rr = sample_repeat_rule
        rr.duration.specifier = DurationSpecifier.NUMBER_OF_TIMES
        rr.duration.value = None
        task = TaskInDB(
            id="t1",
            user_id="u1",
            name="Test",
            first_relevant_date=date(2000, 1, 1),
            repeat_rule=rr,
            created_at=date.today(),
            updated_at=date.today(),
        )

        with pytest.raises(ValueError):
            task.calculate_last_relevant_date()

    def test_calculate_last_relevant_number_of_times_daily_3_times(
        self, sample_repeat_rule
    ):
        rr = sample_repeat_rule
        rr.duration.specifier = DurationSpecifier.NUMBER_OF_TIMES
        rr.duration.value = 3
        rr.frequency.specifier = FrequencySpecifier.DAILY
        rr.frequency.value = 1
        task = TaskInDB(
            id="t1",
            user_id="u1",
            name="Test",
            first_relevant_date=date(2000, 1, 1),
            repeat_rule=rr,
            created_at=date.today(),
            updated_at=date.today(),
        )

        task.calculate_last_relevant_date()
        assert task.last_relevant_date == date(2000, 1, 4)

    def test_calculate_last_relevant_number_of_times_weekly_3_times(
        self, sample_repeat_rule
    ):
        rr = sample_repeat_rule
        rr.duration.specifier = DurationSpecifier.NUMBER_OF_TIMES
        rr.duration.value = 3
        rr.frequency.specifier = FrequencySpecifier.WEEKLY
        rr.frequency.value = 1
        task = TaskInDB(
            id="t1",
            user_id="u1",
            name="Test",
            first_relevant_date=date(2000, 1, 1),
            repeat_rule=rr,
            created_at=date.today(),
            updated_at=date.today(),
        )

        task.calculate_last_relevant_date()
        assert task.last_relevant_date == date(2000, 1, 22)

    def test_calculate_last_relevant_number_of_times_monthly_3_times(
        self, sample_repeat_rule
    ):
        rr = sample_repeat_rule
        rr.duration.specifier = DurationSpecifier.NUMBER_OF_TIMES
        rr.duration.value = 3
        rr.frequency.specifier = FrequencySpecifier.MONTHLY
        rr.frequency.value = 1
        task = TaskInDB(
            id="t1",
            user_id="u1",
            name="Test",
            first_relevant_date=date(2000, 1, 1),
            repeat_rule=rr,
            created_at=date.today(),
            updated_at=date.today(),
        )

        task.calculate_last_relevant_date()
        assert task.last_relevant_date == date(2000, 4, 1)

    def test_calculate_last_relevant_number_of_times_yearly_3_times(
        self, sample_repeat_rule
    ):
        rr = sample_repeat_rule
        rr.duration.specifier = DurationSpecifier.NUMBER_OF_TIMES
        rr.duration.value = 3
        rr.frequency.specifier = FrequencySpecifier.YEARLY
        rr.frequency.value = 1
        task = TaskInDB(
            id="t1",
            user_id="u1",
            name="Test",
            first_relevant_date=date(2000, 1, 1),
            repeat_rule=rr,
            created_at=date.today(),
            updated_at=date.today(),
        )

        task.calculate_last_relevant_date()
        assert task.last_relevant_date == date(2003, 1, 1)

    def test_calculate_last_relevant_until_date_value_not_date(
        self, sample_repeat_rule
    ):
        rr = sample_repeat_rule
        rr.duration.specifier = DurationSpecifier.UNTIL_DATE
        rr.duration.value = None
        task = TaskInDB(
            id="t1",
            user_id="u1",
            name="Test",
            first_relevant_date=date(2000, 1, 1),
            repeat_rule=rr,
            created_at=date.today(),
            updated_at=date.today(),
        )

        with pytest.raises(ValueError):
            task.calculate_last_relevant_date()

    def test_calculate_last_relevant_until_date_daily(self, sample_repeat_rule):
        rr = sample_repeat_rule
        rr.duration.specifier = DurationSpecifier.UNTIL_DATE
        rr.duration.value = date(2003, 1, 1)
        rr.frequency.specifier = FrequencySpecifier.DAILY
        rr.frequency.value = 1
        task = TaskInDB(
            id="t1",
            user_id="u1",
            name="Test",
            first_relevant_date=date(2000, 1, 1),
            repeat_rule=rr,
            created_at=date.today(),
            updated_at=date.today(),
        )

        task.calculate_last_relevant_date()
        assert task.last_relevant_date == date(2003, 1, 1)

    def test_calculate_last_relevant_until_date_weekly(self, sample_repeat_rule):
        rr = sample_repeat_rule
        rr.duration.specifier = DurationSpecifier.UNTIL_DATE
        rr.duration.value = date(2003, 1, 1)
        rr.frequency.specifier = FrequencySpecifier.WEEKLY
        rr.frequency.value = 1
        task = TaskInDB(
            id="t1",
            user_id="u1",
            name="Test",
            first_relevant_date=date(2000, 1, 1),
            repeat_rule=rr,
            created_at=date.today(),
            updated_at=date.today(),
        )

        task.calculate_last_relevant_date()
        assert task.last_relevant_date == date(2002, 12, 28)

    def test_calculate_last_relevant_until_date_monthly(self, sample_repeat_rule):
        rr = sample_repeat_rule
        rr.duration.specifier = DurationSpecifier.UNTIL_DATE
        rr.duration.value = date(2003, 1, 1)
        rr.frequency.specifier = FrequencySpecifier.MONTHLY
        rr.frequency.value = 1
        task = TaskInDB(
            id="t1",
            user_id="u1",
            name="Test",
            first_relevant_date=date(2003, 1, 1),
            repeat_rule=rr,
            created_at=date.today(),
            updated_at=date.today(),
        )

        task.calculate_last_relevant_date()
        assert task.last_relevant_date == date(2003, 1, 1)

    def test_calculate_last_relevant_until_date_yearly(self, sample_repeat_rule):
        rr = sample_repeat_rule
        rr.duration.specifier = DurationSpecifier.UNTIL_DATE
        rr.duration.value = date(2003, 1, 1)
        rr.frequency.specifier = FrequencySpecifier.YEARLY
        rr.frequency.value = 1
        task = TaskInDB(
            id="t1",
            user_id="u1",
            name="Test",
            first_relevant_date=date(2000, 1, 1),
            repeat_rule=rr,
            created_at=date.today(),
            updated_at=date.today(),
        )

        task.calculate_last_relevant_date()
        assert task.last_relevant_date == date(2003, 1, 1)
