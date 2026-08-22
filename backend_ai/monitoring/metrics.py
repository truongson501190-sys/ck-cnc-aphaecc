"""
Metrics Collection
==================

Thu thập và xuất metrics cho Prometheus hoặc các hệ thống khác.
"""

from __future__ import annotations

import time
from typing import Dict, Any, List, Optional
from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class Metric:
    """Một metric đơn lẻ."""
    name: str
    value: float
    labels: Dict[str, str] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)


class MetricsCollector:
    """
    Thu thập metrics in-memory (có thể export sang Prometheus).
    """

    def __init__(self):
        self._counters: Dict[str, int] = defaultdict(int)
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, List[float]] = defaultdict(list)
        self._timers: Dict[str, List[float]] = defaultdict(list)
        self._last_timer: Dict[str, float] = {}

    def counter_inc(self, name: str, amount: int = 1, labels: Optional[Dict] = None):
        """Tăng counter."""
        key = self._make_key(name, labels)
        self._counters[key] += amount

    def gauge_set(self, name: str, value: float, labels: Optional[Dict] = None):
        """Set gauge."""
        key = self._make_key(name, labels)
        self._gauges[key] = value

    def histogram_observe(self, name: str, value: float, labels: Optional[Dict] = None):
        """Ghi nhận giá trị vào histogram."""
        key = self._make_key(name, labels)
        self._histograms[key].append(value)

    def timer_start(self, name: str, labels: Optional[Dict] = None):
        """Bắt đầu timer."""
        key = self._make_key(name, labels)
        self._last_timer[key] = time.time()

    def timer_stop(self, name: str, labels: Optional[Dict] = None):
        """Dừng timer và ghi vào timers."""
        key = self._make_key(name, labels)
        if key in self._last_timer:
            elapsed = time.time() - self._last_timer[key]
            self._timers[key].append(elapsed)
            del self._last_timer[key]
            return elapsed
        return None

    def timer_context(self, name: str, labels: Optional[Dict] = None):
        """Context manager cho timer."""
        class TimerContext:
            def __enter__(self):
                self._key = self._make_key(name, labels)
                self._start = time.time()
                return self
            def __exit__(self, *args):
                elapsed = time.time() - self._start
                self._timers[self._key].append(elapsed)
        return TimerContext()

    def _make_key(self, name: str, labels: Optional[Dict]) -> str:
        if labels:
            label_str = ",".join(f"{k}={v}" for k, v in sorted(labels.items()))
            return f"{name}:{label_str}"
        return name

    def get_counter(self, name: str, labels: Optional[Dict] = None) -> int:
        key = self._make_key(name, labels)
        return self._counters.get(key, 0)

    def get_gauge(self, name: str, labels: Optional[Dict] = None) -> float:
        key = self._make_key(name, labels)
        return self._gauges.get(key, 0.0)

    def get_histogram_stats(self, name: str, labels: Optional[Dict] = None) -> Dict:
        key = self._make_key(name, labels)
        values = self._histograms.get(key, [])
        if not values:
            return {"count": 0, "mean": 0, "min": 0, "max": 0, "p50": 0, "p90": 0, "p99": 0}
        sorted_vals = sorted(values)
        count = len(values)
        total = sum(values)
        return {
            "count": count,
            "mean": total / count,
            "min": sorted_vals[0],
            "max": sorted_vals[-1],
            "p50": sorted_vals[int(count * 0.5)],
            "p90": sorted_vals[int(count * 0.9)],
            "p99": sorted_vals[int(count * 0.99)],
        }

    def get_all_metrics(self) -> Dict[str, Any]:
        """Lấy tất cả metrics."""
        return {
            "counters": dict(self._counters),
            "gauges": dict(self._gauges),
            "histograms": {k: self.get_histogram_stats(k) for k in self._histograms},
            "timers": {k: self.get_histogram_stats(k) for k in self._timers},
        }

    def reset(self):
        """Reset tất cả metrics."""
        self._counters.clear()
        self._gauges.clear()
        self._histograms.clear()
        self._timers.clear()
        self._last_timer.clear()


# Global instance
_metrics = None

def get_metrics() -> MetricsCollector:
    global _metrics
    if _metrics is None:
        _metrics = MetricsCollector()
    return _metrics