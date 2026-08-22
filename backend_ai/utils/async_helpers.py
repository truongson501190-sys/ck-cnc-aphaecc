# utils/async_helpers.py

import asyncio
from typing import Coroutine, Any


def run_async(coro: Coroutine) -> Any:
    """Run an async coroutine in a synchronous context."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        # No running loop, create a new one
        return asyncio.run(coro)
    else:
        # Running in existing loop, use run_coroutine_threadsafe if needed
        # But for simplicity, we'll create a new loop in a separate thread
        # This is a simplified version; for production, consider using anyio or more robust approach.
        return asyncio.run_coroutine_threadsafe(coro, loop).result()