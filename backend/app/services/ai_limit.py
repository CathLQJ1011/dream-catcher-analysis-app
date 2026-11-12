"""Hourly limits for the small AI calls that save nothing (decision 17).

Readings are counted from the database; these calls leave no rows, so they're counted
here, per process. Enough for one server; the counts reset when it restarts.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from app.errors import ApiError

_recent: dict[tuple[str, int], deque[float]] = defaultdict(deque)


def check(user_id: int, kind: str, limit: int, message: str) -> None:
    now, calls = time.monotonic(), _recent[(kind, user_id)]
    while calls and now - calls[0] > 3600:
        calls.popleft()
    if len(calls) >= limit:
        raise ApiError(429, "too_many_ai_requests", message)
    calls.append(now)


def reset() -> None:
    """For tests."""
    _recent.clear()
