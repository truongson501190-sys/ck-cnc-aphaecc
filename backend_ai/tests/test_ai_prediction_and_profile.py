import unittest

from document_profiles.cnc_dispatch import CNCDispatchProfile
from models.ai_prediction import AIPrediction


class AIPredictionAndProfileTests(unittest.TestCase):
    def test_prediction_serialization(self) -> None:
        prediction = AIPrediction(
            document_type="cnc_dispatch",
            fields={"machine_code": "MC06"},
            confidence=0.984,
            reasoning="Machine detected",
            reasoning_steps=["OCR đọc MC06", "Layout đúng vùng Machine"],
            confidence_breakdown={"ocr": 0.95, "layout": 0.97},
            validation_messages=["Đủ trường bắt buộc"],
            validation={"is_valid": True},
            model_version="v1.0",
            processing_time=0.12,
            metadata={"source": "ocr"},
        )

        payload = prediction.to_dict()
        self.assertEqual(payload["document_type"], "cnc_dispatch")
        self.assertEqual(payload["fields"]["machine_code"], "MC06")
        self.assertEqual(payload["reasoning_steps"][0], "OCR đọc MC06")
        self.assertTrue(payload["validation"]["is_valid"])

    def test_cnc_dispatch_profile(self) -> None:
        profile = CNCDispatchProfile()
        text = "Phiếu điều độ CNC\nMáy: MC06\nSản phẩm: SP001\nSố lượng: 10"

        self.assertTrue(profile.detect(text))
        regions = profile.extract_regions(text)
        self.assertIn("machine", regions)
        parsed = profile.parse(text)
        self.assertEqual(parsed["machine_code"], "MC06")
        self.assertEqual(parsed["product_code"], "SP001")
        self.assertEqual(parsed["quantity"], 10)
        self.assertTrue(profile.validate_required_fields(parsed))


if __name__ == "__main__":
    unittest.main()
