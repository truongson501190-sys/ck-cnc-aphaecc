"""
Test Gateway
"""

import pytest
from backend_ai.gateway import get_gateway
from backend_ai.processing_context import ProcessingContext


def test_gateway_initialization(gateway):
    """Kiểm tra khởi tạo Gateway."""
    assert gateway is not None
    assert hasattr(gateway, "vision")
    assert hasattr(gateway, "ocr")
    assert hasattr(gateway, "brain")


def test_health_check(gateway):
    """Kiểm tra health check."""
    health = gateway.health_checker.check_all()
    assert "gateway" in health
    assert health["gateway"]["status"] in ["ok", "degraded", "error"]


def test_process_document(gateway, sample_image_bytes):
    """Kiểm tra xử lý tài liệu."""
    result = gateway.process_document(
        image_bytes=sample_image_bytes,
        filename="test.jpg",
        user_id="test_user"
    )
    assert isinstance(result, ProcessingContext)
    assert result.document_id is not None
    assert result.filename == "test.jpg"


def test_learn_from_correction(gateway):
    """Kiểm tra học từ sửa chữa."""
    result = gateway.learn_from_correction(
        document_id="test_001",
        corrected_fields={"customer_name": "Corrected Company"},
        user_id="test_user"
    )
    # Không có exception là pass
    assert True