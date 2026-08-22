"""
Structured Logger
=================

Cung cấp logging với cấu trúc JSON để dễ dàng phân tích.
"""

import logging
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional
import traceback


class JSONFormatter(logging.Formatter):
    """Format log thành JSON."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if hasattr(record, "extra"):
            log_entry["extra"] = record.extra

        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exc(),
            }

        # Thêm correlation_id nếu có
        if hasattr(record, "correlation_id"):
            log_entry["correlation_id"] = record.correlation_id

        return json.dumps(log_entry, ensure_ascii=False)


class Logger:
    """Wrapper cho logger với các phương thức tiện ích."""

    def __init__(self, name: str = "backend_ai", json_output: bool = True):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)

        if not self.logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            if json_output:
                handler.setFormatter(JSONFormatter())
            else:
                handler.setFormatter(logging.Formatter(
                    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
                ))
            self.logger.addHandler(handler)

    def _log(self, level: str, message: str, extra: Optional[Dict[str, Any]] = None, correlation_id: Optional[str] = None):
        """Ghi log với extra fields."""
        if extra is None:
            extra = {}
        if correlation_id:
            extra["correlation_id"] = correlation_id

        log_method = getattr(self.logger, level.lower())
        if extra:
            log_method(message, extra=extra)
        else:
            log_method(message)

    def info(self, message: str, extra: Optional[Dict] = None, correlation_id: Optional[str] = None):
        self._log("info", message, extra, correlation_id)

    def warning(self, message: str, extra: Optional[Dict] = None, correlation_id: Optional[str] = None):
        self._log("warning", message, extra, correlation_id)

    def error(self, message: str, extra: Optional[Dict] = None, correlation_id: Optional[str] = None):
        self._log("error", message, extra, correlation_id)

    def debug(self, message: str, extra: Optional[Dict] = None, correlation_id: Optional[str] = None):
        self._log("debug", message, extra, correlation_id)

    def exception(self, message: str, extra: Optional[Dict] = None, correlation_id: Optional[str] = None):
        if extra is None:
            extra = {}
        if correlation_id:
            extra["correlation_id"] = correlation_id
        self.logger.exception(message, extra=extra)

    def set_level(self, level: str):
        self.logger.setLevel(getattr(logging, level.upper()))


# Global logger
_logger = None

def get_logger(name: str = "backend_ai") -> Logger:
    global _logger
    if _logger is None:
        _logger = Logger(name)
    return _logger