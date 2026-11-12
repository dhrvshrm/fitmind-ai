"""Work-hours break reminder timing (pure functions, no I/O).

A reminder is due at every ``interval`` minutes after the work start, up to
(not including) the work end, on work days. Shifts that cross midnight
(22:00 to 06:00) count as starting on the day they begin.
"""
from datetime import datetime, time, timedelta
from typing import Optional, Sequence
from zoneinfo import ZoneInfo

# A reminder older than this is skipped rather than sent late.
MAX_LATENESS = timedelta(minutes=20)


def parse_hhmm(value: str) -> time:
    hours, minutes = value.split(":")
    return time(int(hours), int(minutes))


def latest_slot(
    now: datetime,
    tz: str,
    work_start: str,
    work_end: str,
    interval_minutes: int,
    work_days: Sequence[int],
) -> Optional[datetime]:
    """The most recent reminder time at or before ``now`` (local, aware), or None.

    ``work_days`` uses Monday=0 ... Sunday=6.
    """
    local = now.astimezone(ZoneInfo(tz))
    start_t, end_t = parse_hhmm(work_start), parse_hhmm(work_end)
    start_minutes = start_t.hour * 60 + start_t.minute
    end_minutes = end_t.hour * 60 + end_t.minute
    length = (end_minutes - start_minutes) % (24 * 60)
    if length == 0 or interval_minutes <= 0:
        return None
    for days_back in (0, 1):
        day = local.date() - timedelta(days=days_back)
        if day.weekday() not in work_days:
            continue
        shift_start = datetime.combine(day, start_t, tzinfo=local.tzinfo)
        shift_end = shift_start + timedelta(minutes=length)
        if not (shift_start <= local < shift_end):
            continue
        count = int((local - shift_start).total_seconds() // 60 // interval_minutes)
        if count < 1:
            return None
        slot = shift_start + timedelta(minutes=count * interval_minutes)
        return slot if slot < shift_end else None
    return None


def slot_index(slot: datetime, work_start: str, interval_minutes: int) -> int:
    """Which reminder of the shift this is (1 for the first), for rotating routines."""
    start_t = parse_hhmm(work_start)
    shift_start = datetime.combine(slot.date(), start_t, tzinfo=slot.tzinfo)
    if shift_start > slot:
        shift_start -= timedelta(days=1)
    return int((slot - shift_start).total_seconds() // 60 // interval_minutes)
