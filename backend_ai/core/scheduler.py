# backend_ai/core/scheduler.py

import time
import threading
import logging
from typing import Dict, Any, Callable, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class Scheduler:
    """
    Scheduler - Lên lịch các tác vụ định kỳ
    """
    
    def __init__(self):
        self.tasks = {}
        self.running = False
        self.thread = None
    
    def add_task(self, name: str, interval_seconds: int, 
                 callback: Callable, **kwargs):
        """
        Thêm một tác vụ định kỳ
        """
        self.tasks[name] = {
            "interval": interval_seconds,
            "callback": callback,
            "kwargs": kwargs,
            "last_run": None,
            "next_run": datetime.now()
        }
        logger.info(f"📅 Task added: {name} (every {interval_seconds}s)")
    
    def start(self):
        """Bắt đầu scheduler"""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        logger.info("✅ Scheduler started")
    
    def stop(self):
        """Dừng scheduler"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=2)
        logger.info("⏹️ Scheduler stopped")
    
    def _run(self):
        """Vòng lặp chính"""
        while self.running:
            now = datetime.now()
            for name, task in self.tasks.items():
                if task["next_run"] <= now:
                    try:
                        task["callback"](**task["kwargs"])
                        task["last_run"] = now
                        task["next_run"] = now + timedelta(seconds=task["interval"])
                        logger.debug(f"✅ Task executed: {name}")
                    except Exception as e:
                        logger.error(f"❌ Task error {name}: {e}")
            
            time.sleep(1)

# Singleton
scheduler = Scheduler()