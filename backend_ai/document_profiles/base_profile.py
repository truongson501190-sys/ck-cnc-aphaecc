from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Mapping, Optional


class BaseDocumentProfile(ABC):
    """Base abstraction for document-specific parsing behavior."""

    document_type: str = "unknown"

    @abstractmethod
    def detect(self, text: str) -> bool:
        """Return True when the text matches this document type."""

    @abstractmethod
    def extract_regions(self, text: str) -> Dict[str, Any]:
        """Return a structured mapping of extracted regions or fields."""

    @abstractmethod
    def parse(self, text: str) -> Dict[str, Any]:
        """Parse the text into normalized fields."""

    @abstractmethod
    def validate_required_fields(self, fields: Mapping[str, Any]) -> bool:
        """Validate that required fields are present and meaningful."""
