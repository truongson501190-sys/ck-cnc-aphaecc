"""
Hybrid OCR Runner
=================

Chạy nhiều OCR engine song song, chọn kết quả tốt nhất.
"""

from __future__ import annotations

import logging
import re
import concurrent.futures
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum

from .base_ocr_adapter import OCRResult, BaseOCRAdapter
from .paddle_ocr import paddle_ocr
from .tesseract_ocr import tesseract_ocr

try:
    from .easyocr_engine import EasyOCREngine
    easyocr_engine = EasyOCREngine()
except Exception:
    easyocr_engine = None

logger = logging.getLogger(__name__)


class OCRSource(str, Enum):
    PADDLE = "paddle"
    EASYOCR = "easyocr"
    TESSERACT = "tesseract"


class OCRHybridRunner:
    """Hybrid OCR strategy với parallel execution và scoring."""

    DEFAULT_ENGINE_ORDER = [
        OCRSource.PADDLE,
        OCRSource.EASYOCR,
        OCRSource.TESSERACT,
    ]

    def __init__(
        self,
        engine_order: Optional[List[OCRSource]] = None,
        timeout_seconds: float = 10.0,
        word_list: Optional[set] = None,
    ):
        self.engine_order = engine_order or self.DEFAULT_ENGINE_ORDER
        self.timeout = timeout_seconds

        self.engines: Dict[OCRSource, BaseOCRAdapter] = {}
        for source in self.engine_order:
            engine = self._get_engine(source)
            if engine is not None and engine.is_available():
                self.engines[source] = engine

        if not self.engines:
            logger.warning("No OCR engines available.")

        self.word_set = word_list or self._load_builtin_words()

    def _get_engine(self, source: OCRSource) -> Optional[BaseOCRAdapter]:
        if source == OCRSource.PADDLE:
            return paddle_ocr
        elif source == OCRSource.EASYOCR:
            return easyocr_engine
        elif source == OCRSource.TESSERACT:
            return tesseract_ocr
        return None

    @staticmethod
    def _load_builtin_words() -> set:
        return {
            "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
            "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
            "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
            "or", "an", "will", "my", "one", "all", "would", "there", "their",
            "what", "so", "up", "out", "if", "about", "who", "get", "which", "go",
            "me", "when", "make", "can", "like", "time", "no", "just", "him",
            "know", "take", "people", "into", "year", "your", "good", "some",
            "could", "them", "see", "other", "than", "then", "now", "look",
            "only", "come", "its", "over", "think", "also", "back", "after",
            "use", "two", "how", "our", "work", "first", "well", "way", "even",
            "new", "want", "because", "any", "these", "give", "day", "most",
            "us", "is", "am", "are", "was", "were", "been", "being", "have",
            "has", "had", "do", "does", "did", "will", "would", "could", "should",
            "may", "might", "must", "shall", "can", "need", "dare", "used"
        }

    def score(self, result: OCRResult) -> float:
        if not result.success or not result.text:
            return 0.0

        text = result.text.strip()
        if not text:
            return 0.0

        total_chars = len(text)
        alpha_chars = sum(c.isalpha() for c in text)
        digit_chars = sum(c.isdigit() for c in text)
        punct_chars = sum(not c.isalnum() and not c.isspace() for c in text)

        words = re.findall(r'\b\w+\b', text.lower())
        num_words = len(words)
        valid_words = sum(1 for w in words if w in self.word_set)
        valid_ratio = valid_words / max(1, num_words)

        alpha_ratio = alpha_chars / max(1, total_chars)
        digit_bonus = min(digit_chars * 0.05, 2.0)
        punct_penalty = punct_chars * 0.02

        base_score = result.confidence * 100.0
        validity_score = valid_ratio * 50.0
        alpha_score = alpha_ratio * 30.0
        bonus = digit_bonus - punct_penalty

        score = base_score + validity_score + alpha_score + bonus

        if num_words < 3 or alpha_ratio < 0.2:
            score *= 0.5

        return max(0.0, score)

    def read(self, image: Any) -> Tuple[OCRResult, str]:
        if not self.engines:
            return OCRResult(success=False, error="No OCR engines available"), ""

        results: Dict[OCRSource, Tuple[OCRResult, float]] = {}

        with concurrent.futures.ThreadPoolExecutor(max_workers=len(self.engines)) as executor:
            future_to_engine = {
                executor.submit(self._run_single_engine, source, image): source
                for source in self.engines
            }

            for future in concurrent.futures.as_completed(future_to_engine):
                source = future_to_engine[future]
                try:
                    result = future.result(timeout=self.timeout)
                    if result.success:
                        score = self.score(result)
                        results[source] = (result, score)
                        logger.debug("OCR %s scored %.2f", source.value, score)
                    else:
                        logger.warning("OCR %s failed: %s", source.value, result.error)
                except concurrent.futures.TimeoutError:
                    logger.warning("OCR %s timed out", source.value)
                except Exception as e:
                    logger.exception("OCR %s exception: %s", source.value, e)

        best_engine = None
        best_score = -1.0
        best_result = None

        for source, (result, score) in results.items():
            if score > best_score:
                best_score = score
                best_result = result
                best_engine = source.value

        if best_result is None:
            return OCRResult(success=False, error="All OCR engines failed"), ""

        return best_result, best_engine

    def _run_single_engine(self, source: OCRSource, image: Any) -> OCRResult:
        engine = self.engines.get(source)
        if engine is None:
            return OCRResult(success=False, error=f"Engine {source.value} not available")

        if not engine.is_available():
            engine.initialize()

        result = engine.read(image)

        if isinstance(result, dict):
            result = OCRResult(
                text=result.get("text", ""),
                confidence=result.get("confidence", 0.0),
                boxes=result.get("boxes", []),
                success=result.get("success", True),
                error=result.get("error")
            )

        if not isinstance(result, OCRResult):
            return OCRResult(success=False, error=f"Unexpected result type from {source.value}")

        return result