"""
Pytest configuration
"""

import pytest
from backend_ai.gateway import get_gateway
from backend_ai.processing_context import ProcessingContext


@pytest.fixture
def gateway():
    """Fixture cung cấp Gateway instance."""
    return get_gateway()


@pytest.fixture
def sample_image_bytes():
    """Fixture cung cấp ảnh mẫu (bytes)."""
    with open("tests/sample.jpg", "rb") as f:
        return f.read()


@pytest.fixture
def sample_context():
    """Fixture cung cấp ProcessingContext mẫu."""
    return ProcessingContext(
        document_id="test_001",
        filename="sample.jpg",
        raw_text="Test OCR text",
        fields={"customer_name": "Test Company"},
        confidence=0.85,
    )