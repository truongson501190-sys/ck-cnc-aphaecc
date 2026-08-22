"""
Plugin Manager
==============

Quản lý tải và điều phối các plugin.
"""

import importlib
import logging
from typing import Dict, List, Any, Optional
from pathlib import Path
import json

from .base import BasePlugin, PluginContext

logger = logging.getLogger(__name__)


class PluginManager:
    """Quản lý plugin."""

    def __init__(self, gateway):
        self.gateway = gateway
        self.plugins: Dict[str, BasePlugin] = {}
        self._context = PluginContext(gateway=gateway)

    def load_plugin(self, plugin_path: str) -> bool:
        """Tải plugin từ đường dẫn."""
        try:
            # Import module
            module = importlib.import_module(plugin_path)
            # Tìm class kế thừa BasePlugin
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if (
                    isinstance(attr, type) 
                    and issubclass(attr, BasePlugin) 
                    and attr is not BasePlugin
                ):
                    plugin = attr()
                    if plugin.initialize(self._context):
                        self.plugins[plugin.name] = plugin
                        logger.info("Loaded plugin: %s v%s", plugin.name, plugin.version)
                        return True
            return False
        except Exception as e:
            logger.exception("Failed to load plugin %s: %s", plugin_path, e)
            return False

    def load_plugins_from_dir(self, dir_path: str):
        """Tải tất cả plugin từ thư mục."""
        path = Path(dir_path)
        if not path.exists():
            logger.warning("Plugin directory not found: %s", dir_path)
            return

        for file in path.glob("*.py"):
            if file.name.startswith("_"):
                continue
            module_name = f"{file.parent.name}.{file.stem}"
            self.load_plugin(module_name)

    def get_plugin(self, name: str) -> Optional[BasePlugin]:
        return self.plugins.get(name)

    def run_plugin(self, name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Chạy một plugin."""
        plugin = self.get_plugin(name)
        if not plugin:
            return {"error": f"Plugin {name} not found"}
        if not plugin.enabled:
            return {"error": f"Plugin {name} is disabled"}
        try:
            return plugin.process(data)
        except Exception as e:
            logger.exception("Plugin %s failed: %s", name, e)
            return {"error": str(e)}

    def run_all_plugins(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Chạy tất cả plugin đang bật."""
        result = data
        for name, plugin in self.plugins.items():
            if plugin.enabled:
                result = self.run_plugin(name, result)
        return result

    def shutdown_all(self):
        """Tắt tất cả plugin."""
        for name, plugin in self.plugins.items():
            try:
                plugin.shutdown()
            except Exception as e:
                logger.exception("Plugin %s shutdown failed: %s", name, e)