from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from PIL import Image
import numpy as np


class BaseModelAdapter(ABC):
    """
    Abstract base class for all Vision/Language Model Adapters.
    Allows swapping between models (Qwen2.5-VL, OpenAI, Gemini, etc.)
    without changing the rest of the architecture.
    """

    @abstractmethod
    def is_available(self) -> bool:
        """Check if the model is ready to use (loaded, GPU available, etc.)"""
        pass

    @abstractmethod
    def load_model(self) -> bool:
        """Load the model into memory. Returns True if successful."""
        pass

    @abstractmethod
    def unload_model(self) -> None:
        """Unload the model from memory to free resources."""
        pass

    @abstractmethod
    def process_image(
        self,
        image: Any,  # Can be PIL Image, numpy array, or bytes
        prompt: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Process an image with a text prompt.
        
        Args:
            image: PIL Image, numpy array, or raw bytes
            prompt: The instruction/prompt for the model
            **kwargs: Additional model-specific parameters
            
        Returns:
            Dict with keys like:
                - text: The generated text response
                - success: bool
                - confidence: float (if applicable)
                - error: str (if failed)
                - processing_time: float
        """
        pass

    @abstractmethod
    def chat(
        self,
        messages: list,
        **kwargs
    ) -> Dict[str, Any]:
        """
        General chat completion (for text-only or multimodal conversations).
        
        Args:
            messages: List of message dicts in OpenAI format:
                [{"role": "user", "content": [{"type": "text", "text": "..."}]}]
            **kwargs: Additional model-specific parameters
            
        Returns:
            Dict with keys like:
                - text: The response text
                - success: bool
                - error: str (if failed)
        """
        pass

    def get_model_info(self) -> Dict[str, Any]:
        """Return metadata about the model."""
        return {
            "adapter": self.__class__.__name__,
            "available": self.is_available(),
        }
