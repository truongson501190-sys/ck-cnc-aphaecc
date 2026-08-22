from __future__ import annotations

from typing import Optional

from .base_profile import BaseDocumentProfile
from .cnc_dispatch import CNCDispatchProfile
from .production_report import ProductionReportProfile

__all__ = ["BaseDocumentProfile", "CNCDispatchProfile", "ProductionReportProfile", "get_document_profile"]


def get_document_profile(text: str) -> Optional[BaseDocumentProfile]:
    """Return the first document profile that matches the provided text."""
    profiles = [ProductionReportProfile(), CNCDispatchProfile()]
    for profile in profiles:
        if profile.detect(text):
            return profile
    return None
