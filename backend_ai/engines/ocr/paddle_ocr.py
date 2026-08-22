# backend_ai/engines/ocr/paddle_ocr.py

import time
import logging
from typing import List, Dict, Any, Optional

import cv2
import numpy as np

try:
    from paddleocr import PaddleOCR
except Exception as exc:
    PaddleOCR = None
    PADDLE_IMPORT_ERROR = exc
else:
    PADDLE_IMPORT_ERROR = None

from config.settings import settings
from .base_ocr_adapter import BaseOCRAdapter, OCRResult, OCRLine

logger = logging.getLogger(__name__)

class PaddleOCRService(BaseOCRAdapter):
    """OCR engine sử dụng PaddleOCR (primary, local, free) - CPU trước, GPU sau"""
    
    _instance = None
    _ocr = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        self._initialized = False
        self._init_error: Optional[str] = None
    
    # ============ BaseOCRAdapter Interface ============
    def get_engine_name(self) -> str:
        return "paddle"
    
    def is_available(self) -> bool:
        if PaddleOCR is None:
            return False
        if self._ocr is not None:
            return True
        return False
    
    def initialize(self) -> bool:
        if self._initialized and self._ocr is not None:
            return True
        if PaddleOCR is None:
            logger.warning(
                "⚠️ PaddleOCR backend unavailable. Falling back to Tesseract. "
                f"Import error: {PADDLE_IMPORT_ERROR}"
            )
            self._init_error = str(PADDLE_IMPORT_ERROR)
            self._initialized = True
            return False

        try:
            self._ocr = PaddleOCR(
                use_angle_cls=True,
                lang=settings.ocr_lang,
                show_log=False,
                use_gpu=settings.ocr_use_gpu,
                enable_mkldnn=True,
                cpu_threads=4
            )
            self._initialized = True
            logger.info(
                f"✅ PaddleOCR initialized (lang: {settings.ocr_lang}, "
                f"gpu: {settings.ocr_use_gpu})"
            )
            return True
        except Exception as e:
            logger.error(f"❌ Failed to initialize PaddleOCR: {e}")
            self._ocr = None
            self._initialized = True
            self._init_error = str(e)
            return False
    
    def _read_image(
        self,
        image_np: np.ndarray,
        lang: Optional[str] = None,
        **kwargs
    ) -> OCRResult:
        """Internal OCR processing on a numpy BGR image"""
        if self._ocr is None:
            return OCRResult(
                success=False,
                error=self._init_error or "PaddleOCR not initialized"
            )
        
        try:
            # Ensure RGB (Paddle expects RGB or BGR, usually works with BGR)
            img = image_np
            if len(img.shape) == 2:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
            elif img.shape[2] == 4:
                img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
            
            result = self._ocr.ocr(img, cls=True)
            
            if not result or not result[0]:
                return OCRResult(text="", confidence=0.0)
            
            lines: List[OCRLine] = []
            full_text_parts: List[str] = []
            confidences: List[float] = []
            boxes: List[Any] = []

            for line in result[0]:
                box = line[0]
                text = line[1][0]
                conf = float(line[1][1])
                lines.append(OCRLine(text=text, confidence=conf, bbox=box))
                full_text_parts.append(text)
                confidences.append(conf)
                boxes.append(box)
            
            full_text = "\n".join(full_text_parts)
            avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
            
            logger.debug(
                f"PaddleOCR: {len(lines)} lines, avg conf: {avg_conf*100:.1f}%"
            )
            
            return OCRResult(
                text=full_text,
                confidence=avg_conf,
                lines=lines,
                boxes=boxes,
                success=True
            )
            
        except Exception as e:
            logger.error(f"❌ PaddleOCR _read_image error: {e}")
            return OCRResult(success=False, error=str(e))

# Singleton
paddle_ocr = PaddleOCRService()