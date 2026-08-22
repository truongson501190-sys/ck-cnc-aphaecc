# backend_ai/engines/vision/processor.py

import cv2
import numpy as np
from PIL import Image
import io
from typing import Optional, Tuple


class VisionProcessor:
    """Image preprocessing tuned for OCR quality."""

    def __init__(self, target_size: Tuple[int, int] = (1024, 768)):
        self.target_size = target_size

    def process(self, image_bytes: bytes) -> np.ndarray:
        img = self._load_image(image_bytes)
        if img is None:
            return np.zeros((64, 64, 3), dtype=np.uint8)
        return self._preprocess(img)

    def preprocess_variants(self, image_bytes: bytes) -> list[np.ndarray]:
        img = self._load_image(image_bytes)
        if img is None:
            return []

        # Keep the original image as the first and most faithful OCR candidate.
        variants: list[np.ndarray] = [img.copy()]

        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        gray = cv2.medianBlur(gray, 3)
        equalized = cv2.equalizeHist(gray)

        adaptive = cv2.adaptiveThreshold(
            equalized, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 10
        )
        threshold = cv2.threshold(equalized, 140, 255, cv2.THRESH_BINARY)[1]
        smooth = cv2.GaussianBlur(equalized, (3, 3), 0)

        variants.append(cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB))
        variants.append(cv2.cvtColor(equalized, cv2.COLOR_GRAY2RGB))
        variants.append(cv2.cvtColor(adaptive, cv2.COLOR_GRAY2RGB))
        variants.append(cv2.cvtColor(threshold, cv2.COLOR_GRAY2RGB))
        variants.append(cv2.cvtColor(smooth, cv2.COLOR_GRAY2RGB))
        return variants
    
    def _load_image(self, image_bytes: bytes) -> np.ndarray:
        """Load ảnh từ bytes"""
        img = Image.open(io.BytesIO(image_bytes))
        img_array = np.array(img)
        
        # Chuyển sang RGB nếu cần
        if len(img_array.shape) == 2:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
        elif img_array.shape[2] == 4:
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)
        
        return img_array
    
    def _preprocess(self, img: np.ndarray) -> np.ndarray:
        """Return a balanced OCR-friendly image representation."""
        h, w = img.shape[:2]
        target_w, target_h = self.target_size
        if h > target_h or w > target_w:
            scale = min(target_w / w, target_h / h)
            new_w = int(w * scale)
            new_h = int(h * scale)
            img = cv2.resize(img, (new_w, new_h))

        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
            gray = cv2.medianBlur(gray, 3)
            gray = cv2.equalizeHist(gray)
            return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        return cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    
    def deskew(self, img: np.ndarray) -> np.ndarray:
        """Xoay ảnh nếu bị nghiêng"""
        # TODO: implement deskew
        return img
    
    def remove_noise(self, img: np.ndarray) -> np.ndarray:
        """Loại bỏ nhiễu"""
        return cv2.medianBlur(img, 3)