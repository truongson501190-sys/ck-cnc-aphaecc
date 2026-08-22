# backend_ai/engines/ocr/tesseract_ocr.py

import time
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional

import cv2
import numpy as np
import pytesseract

from .base_ocr_adapter import BaseOCRAdapter, OCRResult, OCRLine

logger = logging.getLogger(__name__)

class TesseractOCRService(BaseOCRAdapter):
    """Fallback OCR engine sử dụng Tesseract (local, free)"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        self._initialized = False
        self.available = False
        self._tesseract_version: Optional[str] = None
    
    # ============ BaseOCRAdapter Interface ============
    def get_engine_name(self) -> str:
        return "tesseract"
    
    def is_available(self) -> bool:
        if not self._initialized:
            self.initialize()
        return self.available
    
    def initialize(self) -> bool:
        if self._initialized:
            return self.available
        try:
            # Check if Tesseract is installed
            result = subprocess.run(
                ['tesseract', '--version'],
                capture_output=True, text=True, timeout=10
            )
            self.available = result.returncode == 0
            if self.available and result.stdout:
                self._tesseract_version = result.stdout.splitlines()[0]
                logger.info(f"✅ Tesseract found: {self._tesseract_version}")
            else:
                logger.warning("⚠️ Tesseract not installed or not working.")
                self.available = False
        except Exception as e:
            logger.warning(f"⚠️ Tesseract not available: {e}")
            self.available = False
        self._initialized = True
        return self.available
    
    def _read_image(
        self,
        image_np: np.ndarray,
        lang: Optional[str] = None,
        **kwargs
    ) -> OCRResult:
        """Internal OCR processing on a numpy BGR image"""
        if not self.available:
            return OCRResult(
                success=False,
                error="Tesseract not installed or not available"
            )
        
        tesseract_lang = lang or kwargs.get("tesseract_lang", "vie")
        
        try:
            # Write image to temp file
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
                temp_path = f.name
                cv2.imwrite(temp_path, image_np)
            
            try:
                # Run Tesseract
                psm = kwargs.get("psm", "6")
                result = subprocess.run(
                    ["tesseract", temp_path, "stdout", "--psm", str(psm), "-l", tesseract_lang],
                    capture_output=True, text=True, timeout=60
                )
                text = result.stdout.strip()
            finally:
                # Clean up temp file
                Path(temp_path).unlink(missing_ok=True)
            
            # Estimate confidence (rough heuristic: more text = higher confidence)
            confidence = min(len(text) / 100, 0.95) if text else 0.0
            
            lines: List[OCRLine] = []
            if text:
                # Split into lines, assign equal rough confidence
                raw_lines = text.splitlines()
                if raw_lines:
                    per_line_conf = confidence
                    for raw in raw_lines:
                        if raw.strip():
                            lines.append(OCRLine(text=raw.strip(), confidence=per_line_conf))
            
            return OCRResult(
                text=text,
                confidence=confidence,
                lines=lines,
                success=True
            )
            
        except Exception as e:
            logger.error(f"❌ Tesseract _read_image error: {e}")
            return OCRResult(success=False, error=str(e))

# Singleton
tesseract_ocr = TesseractOCRService()