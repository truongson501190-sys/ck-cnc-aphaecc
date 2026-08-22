# backend_ai/models/qwen/qwen_vl.py

import time
import logging
from typing import Dict, Any, Optional
from PIL import Image
import numpy as np

from ..base_model_adapter import BaseModelAdapter

logger = logging.getLogger(__name__)

class QwenVLModel(BaseModelAdapter):
    """
    Qwen2.5-VL Vision Model Adapter - runs locally
    Follows the BaseModelAdapter interface for easy swapping
    """
    
    def __init__(self, model_name: str = "Qwen/Qwen2.5-VL-7B-Instruct"):
        self.model_name = model_name
        self.model = None
        self.processor = None
        self.loaded = False
    
    def is_available(self) -> bool:
        return self.loaded
    
    def load_model(self) -> bool:
        """Load model (requires GPU and model download)"""
        if self.loaded:
            return True
        try:
            # TODO: Enable when GPU and model are available
            # from transformers import Qwen2VLForConditionalGeneration, AutoProcessor
            # self.model = Qwen2VLForConditionalGeneration.from_pretrained(
            #     self.model_name, torch_dtype="auto", device_map="auto"
            # )
            # self.processor = AutoProcessor.from_pretrained(self.model_name)
            # self.loaded = True
            # logger.info(f"✅ QwenVL loaded: {self.model_name}")
            
            logger.info(f"ℹ️ QwenVL model not loaded (needs GPU and model download)")
            self.loaded = False
            return False
        except Exception as e:
            logger.error(f"❌ QwenVL load error: {e}")
            self.loaded = False
            return False
    
    def unload_model(self) -> None:
        """Free resources"""
        if self.model is not None:
            try:
                import gc
                import torch
                del self.model
                del self.processor
                gc.collect()
                torch.cuda.empty_cache()
                logger.info("🗑️ QwenVL model unloaded")
            except Exception as e:
                logger.warning(f"⚠️ Error unloading QwenVL: {e}")
        self.model = None
        self.processor = None
        self.loaded = False
    
    def _to_pil(self, image: Any) -> Optional[Image.Image]:
        """Convert various image formats to PIL Image"""
        if image is None:
            return None
        if isinstance(image, Image.Image):
            return image
        if isinstance(image, np.ndarray):
            try:
                import cv2
                if len(image.shape) == 2:
                    image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
                elif image.shape[2] == 4:
                    image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
                return Image.fromarray(image)
            except Exception:
                return None
        if isinstance(image, (bytes, bytearray)):
            try:
                from io import BytesIO
                return Image.open(BytesIO(image))
            except Exception:
                return None
        return None
    
    def process_image(
        self,
        image: Any,
        prompt: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Đọc và hiểu ảnh bằng QwenVL
        """
        start_time = time.time()
        if not self.loaded:
            return {
                "text": "",
                "success": False,
                "error": "Model not loaded",
                "processing_time": time.time() - start_time
            }
        
        pil_image = self._to_pil(image)
        if pil_image is None:
            return {
                "text": "",
                "success": False,
                "error": "Invalid image format",
                "processing_time": time.time() - start_time
            }
        
        try:
            # Conversation
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": pil_image},
                        {"type": "text", "text": prompt or "Đọc và trích xuất thông tin từ ảnh này"}
                    ]
                }
            ]
            
            # TODO: Enable when model is loaded
            # text = self.processor.apply_chat_template(messages, tokenize=False)
            # inputs = self.processor(text, images=pil_image, return_tensors="pt")
            # outputs = self.model.generate(**inputs, max_new_tokens=kwargs.get("max_new_tokens", 1024))
            # response = self.processor.decode(outputs[0], skip_special_tokens=True)
            
            # return {
            #     "text": response,
            #     "success": True,
            #     "processing_time": time.time() - start_time
            # }
            
            return {
                "text": "",
                "success": False,
                "error": "Not implemented - model not loaded",
                "processing_time": time.time() - start_time
            }
            
        except Exception as e:
            logger.error(f"❌ QwenVL process_image error: {e}")
            return {
                "text": "",
                "success": False,
                "error": str(e),
                "processing_time": time.time() - start_time
            }
    
    def chat(
        self,
        messages: list,
        **kwargs
    ) -> Dict[str, Any]:
        """General chat completion"""
        start_time = time.time()
        if not self.loaded:
            return {
                "text": "",
                "success": False,
                "error": "Model not loaded",
                "processing_time": time.time() - start_time
            }
        
        try:
            # TODO: Implement when model is loaded
            # text = self.processor.apply_chat_template(messages, tokenize=False)
            # inputs = self.processor(text, return_tensors="pt")
            # outputs = self.model.generate(**inputs, max_new_tokens=kwargs.get("max_new_tokens", 2048))
            # response = self.processor.decode(outputs[0], skip_special_tokens=True)
            
            # return {
            #     "text": response,
            #     "success": True,
            #     "processing_time": time.time() - start_time
            # }
            
            return {
                "text": "",
                "success": False,
                "error": "Not implemented - model not loaded",
                "processing_time": time.time() - start_time
            }
        except Exception as e:
            logger.error(f"❌ QwenVL chat error: {e}")
            return {
                "text": "",
                "success": False,
                "error": str(e),
                "processing_time": time.time() - start_time
            }
    
    def get_model_info(self) -> Dict[str, Any]:
        info = super().get_model_info()
        info["model_name"] = self.model_name
        return info