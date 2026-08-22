"""
Agent Manager
=============

Quản lý đăng ký, khởi tạo và điều phối các agent trong hệ thống.

Hỗ trợ:
- Đăng ký agent
- Dependency resolution
- Chạy tuần tự hoặc song song
- Monitoring và logging
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional, Set, Type, Union
from collections import defaultdict

from .base_agent import BaseAgent, AgentStatus, AgentResult

logger = logging.getLogger(__name__)


class AgentManager:
    """
    Quản lý và điều phối các agent trong hệ thống.
    """

    def __init__(self, name: str = "default"):
        self.name = name
        self._agents: Dict[str, BaseAgent] = {}
        self._execution_order: List[str] = []
        self._context_history: List[Dict[str, Any]] = []
        self._start_time: Optional[float] = None
        self._end_time: Optional[float] = None

        logger.info("AgentManager '%s' initialized", name)

    def register(self, agent: BaseAgent) -> None:
        """
        Đăng ký một agent vào hệ thống.

        :param agent: Instance của BaseAgent
        :raises ValueError: Nếu tên agent đã tồn tại
        """
        if agent.name in self._agents:
            raise ValueError(f"Agent '{agent.name}' already registered")

        self._agents[agent.name] = agent
        logger.debug("Registered agent: %s", agent.name)

    def register_many(self, agents: List[BaseAgent]) -> None:
        """Đăng ký nhiều agent cùng lúc."""
        for agent in agents:
            self.register(agent)

    def unregister(self, name: str) -> bool:
        """Xoá một agent khỏi hệ thống."""
        if name in self._agents:
            del self._agents[name]
            logger.debug("Unregistered agent: %s", name)
            return True
        return False

    def get_agent(self, name: str) -> Optional[BaseAgent]:
        """Lấy agent theo tên."""
        return self._agents.get(name)

    def get_all_agents(self) -> Dict[str, BaseAgent]:
        """Lấy tất cả agent."""
        return self._agents.copy()

    def enable_agent(self, name: str, enabled: bool = True) -> bool:
        """Bật/tắt một agent."""
        agent = self._agents.get(name)
        if agent:
            agent.enabled = enabled
            logger.debug("Agent %s enabled=%s", name, enabled)
            return True
        return False

    def resolve_dependencies(self, agent_name: str, visited: Optional[Set[str]] = None) -> List[str]:
        """
        Giải quyết dependencies của một agent (thứ tự chạy).

        :param agent_name: Tên agent cần giải quyết
        :param visited: Set đã duyệt (dùng cho đệ quy)
        :return: Danh sách tên agent theo thứ tự từ đầu đến cuối
        :raises ValueError: Nếu có dependency cycle
        """
        if visited is None:
            visited = set()

        if agent_name in visited:
            raise ValueError(f"Circular dependency detected: {' -> '.join(visited)} -> {agent_name}")

        visited.add(agent_name)

        agent = self._agents.get(agent_name)
        if not agent:
            raise ValueError(f"Agent '{agent_name}' not found")

        result = []
        for dep in agent.dependencies:
            dep_order = self.resolve_dependencies(dep, visited.copy())
            result.extend(dep_order)

        result.append(agent_name)
        return result

    def get_execution_order(self) -> List[str]:
        """
        Tính toán thứ tự chạy tối ưu dựa trên dependencies.
        """
        if self._execution_order:
            return self._execution_order

        all_agents = list(self._agents.keys())
        ordered = []
        visited = set()

        for agent_name in all_agents:
            if agent_name not in visited:
                try:
                    order = self.resolve_dependencies(agent_name, set())
                    for o in order:
                        if o not in visited:
                            ordered.append(o)
                            visited.add(o)
                except ValueError as e:
                    logger.error("Dependency resolution failed: %s", e)
                    # Fallback: chạy theo thứ tự đăng ký
                    logger.warning("Falling back to registration order")
                    return all_agents

        self._execution_order = ordered
        logger.debug("Execution order: %s", ordered)
        return ordered

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Chạy tất cả agent theo thứ tự đã tính toán.

        :param context: Dict chứa dữ liệu đầu vào
        :return: Dict chứa dữ liệu đầu ra (cập nhật context)
        """
        self._start_time = time.time()
        self._context_history.append(context.copy())

        logger.info("AgentManager '%s' starting with %d agents", self.name, len(self._agents))

        # Lấy thứ tự chạy
        execution_order = self.get_execution_order()

        # Chạy từng agent
        for agent_name in execution_order:
            agent = self._agents.get(agent_name)
            if not agent:
                logger.warning("Agent '%s' not found, skipping", agent_name)
                continue

            context = agent.execute(context)

            # Lưu kết quả để tracking
            self._context_history.append(context.copy())

            # Nếu agent thất bại và cấu hình stop_on_error = True, dừng
            if agent.status == AgentStatus.FAILED:
                if self.config.get("stop_on_error", True):
                    logger.warning("Stopping due to agent '%s' failure", agent_name)
                    break

        self._end_time = time.time()
        elapsed = self._end_time - self._start_time
        logger.info("AgentManager '%s' finished in %.3f s", self.name, elapsed)

        return context

    def run_parallel(self, context: Dict[str, Any], agent_names: List[str]) -> Dict[str, Any]:
        """
        Chạy các agent song song (cho các agent không có dependency lẫn nhau).

        TODO: Implement với ThreadPoolExecutor hoặc asyncio
        """
        # Hiện tại fallback về tuần tự
        logger.warning("run_parallel not implemented, using sequential")
        for name in agent_names:
            agent = self._agents.get(name)
            if agent:
                context = agent.execute(context)
        return context

    def get_status(self) -> Dict[str, Dict[str, Any]]:
        """Lấy trạng thái của tất cả agent."""
        return {
            name: agent.get_info()
            for name, agent in self._agents.items()
        }

    def get_summary(self) -> Dict[str, Any]:
        """Lấy tổng kết chạy agent."""
        total_time = 0
        success_count = 0
        failed_count = 0
        skipped_count = 0

        for agent in self._agents.values():
            if agent.status == AgentStatus.SUCCESS:
                success_count += 1
            elif agent.status == AgentStatus.FAILED:
                failed_count += 1
            elif agent.status == AgentStatus.SKIPPED:
                skipped_count += 1
            total_time += agent.execution_time

        return {
            "total_agents": len(self._agents),
            "success": success_count,
            "failed": failed_count,
            "skipped": skipped_count,
            "total_time": total_time,
            "execution_order": self._execution_order,
            "start_time": self._start_time,
            "end_time": self._end_time,
        }

    def reset_all(self):
        """Reset tất cả agent."""
        for agent in self._agents.values():
            agent.reset()
        self._execution_order = []
        self._context_history = []
        self._start_time = None
        self._end_time = None

    def set_config(self, config: Dict[str, Any]):
        """Cập nhật cấu hình."""
        self.config = config