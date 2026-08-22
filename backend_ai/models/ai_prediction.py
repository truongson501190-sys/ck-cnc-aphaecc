from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


@dataclass
class AIPrediction:
    """Normalized prediction payload shared across pipeline components."""

    document_type: str = "unknown"
    fields: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0
    reasoning: str = ""
    reasoning_steps: List[str] = field(default_factory=list)
    confidence_breakdown: Dict[str, float] = field(default_factory=dict)
    validation: Dict[str, Any] = field(default_factory=dict)
    validation_messages: List[str] = field(default_factory=list)
    model_version: str = "v0.1"
    processing_time: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.created_at:
            self.created_at = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, payload: Dict[str, Any]) -> "AIPrediction":
        return cls(**payload)
