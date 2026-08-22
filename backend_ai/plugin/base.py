"""
Base Plugin
===========

Plugin cơ sở để mở rộng hệ thống.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class PluginContext:
    """Context cho plugin."""
    gateway: Any  # Gateway instance
    config: Dict[str, Any] = None
    data: Dict[str, Any] = None


class BasePlugin(ABC):
    """Plugin cơ sở."""

    def __init__(self, name: str, version: str = "1.0.0"):
        self.name = name
        self.version = version
        self.enabled = True
        self.context: Optional[PluginContext] = None

    @abstractmethod
    def initialize(self, context: PluginContext) -> bool:
        """Khởi tạo plugin."""
        pass

    @abstractmethod
    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Xử lý dữ liệu."""
        pass

    def on_event(self, event_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Xử lý sự kiện (có thể override)."""
        return data

    def shutdown(self):
        """Dọn dẹp khi plugin bị tắt."""
        pass