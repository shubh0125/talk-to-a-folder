import time
import logging
from collections import defaultdict
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class SlidingWindowRateLimiter:
    """
    In-memory sliding window rate limiter keyed by an arbitrary string (e.g. user ID).

    Each call to check() records a timestamp. Calls older than `window_seconds`
    are evicted before the count is evaluated, giving a true sliding window
    rather than a fixed bucket.
    """

    def __init__(self, max_calls: int, window_seconds: int, label: str = ""):
        self.max_calls = max_calls
        self.window = window_seconds
        self.label = label
        self._history: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str) -> None:
        now = time.time()
        window_start = now - self.window

        # Evict timestamps outside the sliding window
        self._history[key] = [t for t in self._history[key] if t > window_start]

        if len(self._history[key]) >= self.max_calls:
            logger.warning(
                "Rate limit hit [%s] for key=%s (%d calls in %ds)",
                self.label, key, self.max_calls, self.window,
            )
            raise HTTPException(
                status_code=429,
                detail=f"Too many requests. You can send up to {self.max_calls} messages per minute.",
            )

        self._history[key].append(now)

    def reset(self, key: str) -> None:
        """Clear history for a key — useful on logout."""
        self._history.pop(key, None)


# 20 chat messages per user per minute
chat_limiter = SlidingWindowRateLimiter(max_calls=20, window_seconds=60, label="chat")

# 5 folder loads per user per 10 minutes (embedding is expensive)
folder_limiter = SlidingWindowRateLimiter(max_calls=5, window_seconds=600, label="folder_load")
