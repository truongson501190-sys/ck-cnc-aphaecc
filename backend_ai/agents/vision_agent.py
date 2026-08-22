"""
Vision Agent
============

Xử lý tiền xử lý ảnh và tạo biến thể cho OCR.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from .base_agent import BaseAgent
from engines.vision.processor import VisionProcessor

logger = logging.getLogger(__name__)


class VisionAgent(BaseAgent):
    """
    Agent tiền xử lý ảnh:
    - Tạo nhiều biến thể ảnh (độ sáng, contrast, xoay, ...)
    - Chọn ảnh tốt nhất làm primary
    """

    def __init__(
        self,
        vision_processor: VisionProcessor,
        enabled: bool = True,
        config: Dict[str, Any] = None,
    ):
        super().__init__(
            name="vision_agent",
            enabled=enabled,
            config=config or {},
            dependencies=[]
        )
        self.vision = vision_processor

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Xử lý ảnh và tạo biến thể."""
        image_bytes = context.get("image_bytes")
        if image_bytes is None:
            raise ValueError("Missing image_bytes in context")

        try:
            variants = self.vision.preprocess_variants(image_bytes)
            if not variants:
                variants = [self.vision.process(image_bytes)]
        except Exception as e:
            logger.warning("Variant preprocessing failed: %s", e)
            variants = [self.vision.process(image_bytes)]

        context["variants"] = variants
        context["primary_image"] = variants[0]
        context["variant_count"] = len(variants)

        logger.debug("Created %d image variants", len(variants))
        return context