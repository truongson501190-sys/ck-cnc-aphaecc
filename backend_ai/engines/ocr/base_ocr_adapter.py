from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Union
from pathlib import Path
import numpy as np
from PIL import Image


class OCRLine:
    """Represents a single OCR line result with bounding box and confidence"""
    def __init__(
        self,
        text: str,
        confidence: float = 0.0,
        bbox: Optional[List[List[float]]] = None,
    ):
        self.text = text
        self.confidence = confidence
        self.bbox = bbox or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "confidence": self.confidence,
            "bbox": self.bbox,
        }


class OCRResult(dict):
    """
    Structured OCR result.
    Inherits from dict to maintain 100% backward compatibility with old code that does
    result.get("text") or result["confidence"] etc.
    Also exposes the data as attributes for cleaner new code.
    """
    def __init__(
        self,
        text: str = "",
        confidence: float = 0.0,
        lines: Optional[List[OCRLine]] = None,
        boxes: Optional[List[Any]] = None,
        processing_time: float = 0.0,
        success: bool = True,
        error: Optional[str] = None,
    ):
        super().__init__()
        self.lines = lines or []
        self.boxes = boxes or []
        # Populate dict with backward-compatible keys
        self["text"] = text
        self["confidence"] = confidence
        self["boxes"] = self.boxes
        self["time"] = processing_time
        self["success"] = success
        self["error"] = error
        self["lines"] = [line.to_dict() for line in self.lines]

    # Attribute accessors (for new code) that delegate to dict storage
    @property
    def text(self) -> str:
        return self.get("text", "")

    @text.setter
    def text(self, value: str) -> None:
        self["text"] = value or ""

    @property
    def confidence(self) -> float:
        return float(self.get("confidence", 0.0))

    @confidence.setter
    def confidence(self, value: float) -> None:
        self["confidence"] = float(value or 0.0)

    @property
    def processing_time(self) -> float:
        return float(self.get("time", 0.0))

    @processing_time.setter
    def processing_time(self, value: float) -> None:
        self["time"] = float(value or 0.0)

    @property
    def success(self) -> bool:
        return bool(self.get("success", True))

    @success.setter
    def success(self, value: bool) -> None:
        self["success"] = bool(value)

    @property
    def error(self) -> Optional[str]:
        return self.get("error")

    @error.setter
    def error(self, value: Optional[str]) -> None:
        self["error"] = value

    def to_dict(self) -> Dict[str, Any]:
        return dict(self)


class BaseOCRAdapter(ABC):
    """
    Abstract base class for all OCR Engine Adapters.
    Allows swapping between PaddleOCR (primary), Tesseract (fallback),
    EasyOCR, or any other OCR engine without changing the rest of the architecture.
    """

    @abstractmethod
    def is_available(self) -> bool:
        """Check if the OCR engine is installed and ready to use."""
        pass

    @abstractmethod
    def get_engine_name(self) -> str:
        """Return the name of the OCR engine (e.g., 'paddle', 'tesseract', 'easyocr')."""
        pass

    @abstractmethod
    def initialize(self) -> bool:
        """Initialize/load the OCR engine. Returns True if successful."""
        pass

    def read(
        self,
        image: Any,  # Can be numpy array, PIL Image, bytes, or file path
        lang: Optional[str] = None,
        **kwargs
    ) -> OCRResult:
        """
        Read text from an image. This is the main entry point.
        Handles input conversion and dispatches to _read_image().
        """
        import time
        start_time = time.time()

        if not self.is_available():
            if not self.initialize():
                return OCRResult(
                    success=False,
                    error=f"OCR engine '{self.get_engine_name()}' not available",
                    processing_time=time.time() - start_time
                )

        try:
            # Convert various inputs to numpy array (BGR for OpenCV compatibility)
            img_np = self._to_numpy_array(image)
            if img_np is None:
                return OCRResult(
                    success=False,
                    error="Invalid image format",
                    processing_time=time.time() - start_time
                )

            result = self._read_image(img_np, lang=lang, **kwargs)
            result.processing_time = time.time() - start_time
            return result
        except Exception as e:
            return OCRResult(
                success=False,
                error=str(e),
                processing_time=time.time() - start_time
            )

    @abstractmethod
    def _read_image(
        self,
        image_np: np.ndarray,
        lang: Optional[str] = None,
        **kwargs
    ) -> OCRResult:
        """
        Internal method: perform OCR on a numpy BGR image.
        Must be implemented by subclasses.
        """
        pass

    def _to_numpy_array(self, image: Any) -> Optional[np.ndarray]:
        """Convert various image formats to numpy array (BGR, HxWxC)."""
        import cv2

        if image is None:
            return None

        # Already numpy array
        if isinstance(image, np.ndarray):
            return image

        # PIL Image
        if isinstance(image, Image.Image):
            rgb = np.array(image.convert("RGB"))
            return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

        # Bytes / bytearray
        if isinstance(image, (bytes, bytearray)):
            try:
                arr = np.frombuffer(image, dtype=np.uint8)
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                if img is not None:
                    return img
            except Exception:
                pass

        # File path (str or Path)
        if isinstance(image, (str, Path)):
            try:
                img = cv2.imread(str(image))
                if img is not None:
                    return img
            except Exception:
                pass

        return None
