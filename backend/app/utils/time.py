"""User-local date and time helpers.

The server runs in UTC, but "today" for a user depends on their timezone (a
meal logged at 1 AM IST belongs to the IST day, not the previous UTC day).

The active request's timezone lives in a context variable set by the auth
dependency (``get_current_user``) and the WebSocket handshake, so services can
call :func:`local_today` without threading a timezone through every function.
Background jobs set it explicitly per user with :func:`use_timezone`.
"""
from contextlib import contextmanager
from contextvars import ContextVar
from datetime import date, datetime, timezone
from typing import Iterator, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

# India-first product: users without a stored timezone default to IST.
DEFAULT_TIMEZONE = "Asia/Kolkata"

_current_timezone: ContextVar[str] = ContextVar("current_timezone", default=DEFAULT_TIMEZONE)


def is_valid_timezone(name: Optional[str]) -> bool:
    """Return True if ``name`` is a known IANA timezone (e.g. ``Asia/Kolkata``)."""
    if not name:
        return False
    try:
        ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return False
    return True


def set_current_timezone(name: Optional[str]) -> None:
    """Set the timezone for the current request/task, ignoring invalid names."""
    _current_timezone.set(name if is_valid_timezone(name) else DEFAULT_TIMEZONE)


def get_current_timezone() -> str:
    """Return the timezone active for the current request/task."""
    return _current_timezone.get()


@contextmanager
def use_timezone(name: Optional[str]) -> Iterator[None]:
    """Temporarily run code in ``name``'s timezone (used by background jobs)."""
    token = _current_timezone.set(name if is_valid_timezone(name) else DEFAULT_TIMEZONE)
    try:
        yield
    finally:
        _current_timezone.reset(token)


def local_now(tz: Optional[str] = None) -> datetime:
    """Return the current aware datetime in ``tz`` (or the active timezone)."""
    return datetime.now(timezone.utc).astimezone(ZoneInfo(tz or get_current_timezone()))


def local_today(tz: Optional[str] = None) -> date:
    """Return today's date in ``tz`` (or the active timezone)."""
    return local_now(tz).date()


def local_today_iso(tz: Optional[str] = None) -> str:
    """Return today's date in ``tz`` (or the active timezone) as ``YYYY-MM-DD``."""
    return local_today(tz).isoformat()
