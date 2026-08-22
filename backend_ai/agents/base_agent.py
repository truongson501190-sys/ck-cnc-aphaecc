"""
Base Agent
==========

Lớp cơ sở cho tất cả các agent trong hệ thống.
Mỗi agent thực hiện một nhiệm vụ cụ thể trong pipeline xử lý tài liệu.
"""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, List
from enum import Enum

logger = logging.getLogger(__name__)


class AgentStatus(str, Enum):
    """Trạng thái của agent."""
    IDLE = "idle"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class AgentResult:
    """
    Kết quả trả về sau khi agent chạy.
    """
    success: bool
    message: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    status: AgentStatus = AgentStatus.SUCCESS
    processing_time: float = 0.0
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "message": self.message,
            "data": self.data,
            "status": self.status.value,
            "processing_time": self.processing_time,
            "error": self.error,
        }


class BaseAgent(ABC):
    """
    Lớp cơ sở trừu tượng cho tất cả các agent.

    Mỗi agent cần implement phương thức `run()`.
    Có thể override các phương thức hook như `before_run()`, `after_run()`.
    """

    def __init__(
        self,
        name: str,
        enabled: bool = True,
        config: Optional[Dict[str, Any]] = None,
        dependencies: Optional[List[str]] = None,
    ):
        """
        :param name: Tên agent (duy nhất trong hệ thống)
        :param enabled: Bật/tắt agent
        :param config: Cấu hình riêng cho agent
        :param dependencies: Danh sách tên agent phải chạy trước
        """
        self.name = name
        self.enabled = enabled
        self.config = config or {}
        self.dependencies = dependencies or []

        self._status = AgentStatus.IDLE
        self._last_result: Optional[AgentResult] = None
        self._start_time: Optional[float] = None
        self._end_time: Optional[float] = None

        logger.debug("Initialized agent: %s (enabled=%s)", name, enabled)

    @property
    def status(self) -> AgentStatus:
        return self._status

    @property
    def last_result(self) -> Optional[AgentResult]:
        return self._last_result

    @property
    def execution_time(self) -> float:
        if self._start_time and self._end_time:
            return self._end_time - self._start_time
        return 0.0

    def before_run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Hook chạy trước khi agent thực thi.
        Có thể dùng để validate context hoặc chuẩn bị dữ liệu.
        """
        return context

    def after_run(self, context: Dict[str, Any], result: AgentResult) -> Dict[str, Any]:
        """
        Hook chạy sau khi agent thực thi.
        Có thể dùng để dọn dẹp hoặc ghi log.
        """
        return context

    @abstractmethod
    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Phương thức chính của agent.

        :param context: Dict chứa dữ liệu đầu vào (processing context)
        :return: Dict chứa dữ liệu đầu ra (cập nhật context)
        """
        pass

    def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Thực thi agent với các hooks và error handling.

        :param context: Dict chứa dữ liệu đầu vào
        :return: Dict chứa dữ liệu đầu ra (cập nhật context)
        """
        if not self.enabled:
            self._status = AgentStatus.SKIPPED
            logger.debug("Agent %s is disabled, skipping", self.name)
            return context

        self._status = AgentStatus.RUNNING
        self._start_time = time.time()

        logger.debug("Agent %s starting...", self.name)

        try:
            # Before hook
            context = self.before_run(context)

            # Main execution
            result_context = self.run(context)

            # After hook
            result_context = self.after_run(context, self._last_result)

            self._status = AgentStatus.SUCCESS
            logger.debug("Agent %s completed successfully", self.name)

            return result_context

        except Exception as e:
            self._status = AgentStatus.FAILED
            self._last_result = AgentResult(
                success=False,
                error=str(e),
                status=AgentStatus.FAILED,
                message=f"Agent {self.name} failed: {str(e)}",
            )
            logger.exception("Agent %s failed: %s", self.name, e)

            # Có thể raise exception hoặc trả về context với error
            # Tuỳ theo chiến lược của hệ thống
            context["_errors"] = context.get("_errors", [])
            context["_errors"].append({
                "agent": self.name,
                "error": str(e),
                "timestamp": time.time(),
            })

            # Vẫn trả về context để pipeline tiếp tục (nếu có thể)
            return context

        finally:
            self._end_time = time.time()
            elapsed = self._end_time - self._start_time
            logger.debug("Agent %s finished in %.3f s", self.name, elapsed)

    def reset(self):
        """Reset trạng thái agent."""
        self._status = AgentStatus.IDLE
        self._last_result = None
        self._start_time = None
        self._end_time = None

    def get_info(self) -> Dict[str, Any]:
        """Lấy thông tin về agent."""
        return {
            "name": self.name,
            "enabled": self.enabled,
            "status": self._status.value,
            "dependencies": self.dependencies,
            "last_result": self._last_result.to_dict() if self._last_result else None,
            "execution_time": self.execution_time,
        }


class AgentChain(BaseAgent):
    """
    Agent đặc biệt: chạy một chuỗi các agent con theo thứ tự.
    Cho phép nhóm các agent lại với nhau.
    """

    def __init__(
        self,
        name: str,
        agents: List[BaseAgent],
        enabled: bool = True,
        config: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(name, enabled, config)
        self.agents = agents

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Chạy lần lượt các agent con."""
        for agent in self.agents:
            logger.debug("Chain %s: running %s", self.name, agent.name)
            context = agent.execute(context)

            # Nếu agent thất bại và chain yêu cầu dừng, break
            if agent.status == AgentStatus.FAILED and self.config.get("stop_on_error", True):
                logger.warning("Chain %s stopped early due to agent %s failure", self.name, agent.name)
                break

        return context