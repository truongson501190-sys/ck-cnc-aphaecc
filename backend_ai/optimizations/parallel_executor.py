"""
Parallel Executor
=================

Hỗ trợ thực thi song song các tác vụ độc lập.
"""

from __future__ import annotations

import asyncio
import logging
from typing import List, Callable, Any, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import time

logger = logging.getLogger(__name__)


class ParallelExecutor:
    """
    Thực thi các tác vụ song song với cả thread và process pool.
    """

    def __init__(self, max_workers: int = 4, use_process: bool = False):
        self.max_workers = max_workers
        self.use_process = use_process

    def run_tasks(self, tasks: List[Callable], args_list: Optional[List[tuple]] = None) -> List[Any]:
        """
        Chạy nhiều tác vụ song song.

        :param tasks: Danh sách các hàm cần chạy
        :param args_list: Danh sách tuple tham số cho từng hàm
        """
        if args_list is None:
            args_list = [()] * len(tasks)

        executor_class = ProcessPoolExecutor if self.use_process else ThreadPoolExecutor
        results = []

        with executor_class(max_workers=self.max_workers) as executor:
            futures = []
            for i, (task, args) in enumerate(zip(tasks, args_list)):
                future = executor.submit(task, *args)
                futures.append((i, future))

            for i, future in futures:
                try:
                    result = future.result(timeout=300)
                    results.append((i, result))
                except Exception as e:
                    logger.exception("Task %d failed: %s", i, e)
                    results.append((i, {"error": str(e)}))

        # Sắp xếp theo thứ tự
        results.sort(key=lambda x: x[0])
        return [r[1] for r in results]

    async def run_async_tasks(self, tasks: List[Callable], args_list: Optional[List[tuple]] = None) -> List[Any]:
        """
        Chạy async song song với asyncio.
        """
        if args_list is None:
            args_list = [()] * len(tasks)

        async def run_one(task, args):
            if asyncio.iscoroutinefunction(task):
                return await task(*args)
            else:
                # Chạy hàm sync trong executor để không block event loop
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, task, *args)

        tasks_async = [run_one(task, args) for task, args in zip(tasks, args_list)]
        return await asyncio.gather(*tasks_async, return_exceptions=True)