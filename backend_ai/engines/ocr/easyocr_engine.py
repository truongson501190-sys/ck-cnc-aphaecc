# backend_ai/engines/ocr/easyocr_engine.py

import time
import logging
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional

import cv2
import numpy as np
import easyocr
from PIL import Image

from .base_ocr_adapter import BaseOCRAdapter, OCRResult, OCRLine

logger = logging.getLogger(__name__)

class EasyOCREngine(BaseOCRAdapter):
    """OCR engine sử dụng EasyOCR (backup option)"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        self._initialized = False
        self._reader = None
        self._init_error: Optional[str] = None
    
    # ============ BaseOCRAdapter Interface ============
    def get_engine_name(self) -> str:
        return "easyocr"
    
    def is_available(self) -> bool:
        if not self._initialized:
            self.initialize()
        return self._reader is not None
    
    def initialize(self) -> bool:
        if self._initialized:
            return self._reader is not None
        try:
            # Initialize EasyOCR with Vietnamese and English support
            self._reader = easyocr.Reader(['vi', 'en'], gpu=False, verbose=False)
            self._initialized = True
            logger.info("✅ EasyOCR initialized (langs: vi, en, gpu: False)")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to initialize EasyOCR: {e}")
            self._init_error = str(e)
            self._reader = None
            self._initialized = True
            return False
    
    def _read_image(
        self,
        image_np: np.ndarray,
        lang: Optional[str] = None,
        **kwargs
    ) -> OCRResult:
        if self._reader is None:
            return OCRResult(
                success=False,
                error=self._init_error or "EasyOCR not initialized"
            )
        
        try:
            # Write to temp file because EasyOCR works well with file paths sometimes
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
                temp_path = f.name
                cv2.imwrite(temp_path, image_np)
            
            try:
                # Also accept numpy array directly
                try:
                    result = self._reader.readtext(image_np)
                except Exception:
                    # Fallback to reading from path
                    result = self._reader.readtext(temp_path)
            finally:
                Path(temp_path).unlink(missing_ok=True)
            
            lines: List[OCRLine] = []
            full_text_parts: List[str] = []
            confidences: List[float] = []
            boxes: List[Any] = []

            for detection in result:
                # detection = [bbox, text, confidence]
                bbox = detection[0]
                text = str(detection[1])
                conf = float(detection[2])
                lines.append(OCRLine(text=text, confidence=conf, bbox=bbox))
                full_text_parts.append(text)
                confidences.append(conf)
                boxes.append(bbox)
            
            full_text = "\n".join(full_text_parts)
            avg_conf = float(np.mean(confidences)) if confidences else 0.0
            
            return OCRResult(
                text=full_text,
                confidence=avg_conf,
                lines=lines,
                boxes=boxes,
                success=True
            )
            
        except Exception as e:
            logger.error(f"❌ EasyOCR _read_image error: {e}")
            return OCRResult(success=False, error=str(e))

# Backward compatibility alias
OCREngine = EasyOCREngine

# Singleton
easyocr_engine = EasyOCREngine()