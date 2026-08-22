"""
Plugin System
=============

Cho phép mở rộng hệ thống với các plugin tùy chỉnh.
"""

from .base import BasePlugin, PluginContext
from .manager import PluginManager

__all__ = ["BasePlugin", "PluginContext", "PluginManager"]