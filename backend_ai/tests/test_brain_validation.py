import unittest

from document_profiles import get_document_profile
from document_profiles.production_report import ProductionReportProfile
from engines.brain.interpreter import Interpreter
from engines.validation.validator import Validator


class BrainValidationTests(unittest.TestCase):
    def test_interpreter_normalizes_common_cnc_fields(self) -> None:
        interpreter = Interpreter()
        text = "MEy CNC 01\nsun phEm SP-100\ns0lung 120"
        fields, confidence, reasoning = interpreter.interpret(text)

        self.assertEqual(fields.get("machine_code"), "MC01")
        self.assertEqual(fields.get("product_code"), "SP100")
        self.assertEqual(fields.get("quantity"), 120)
        self.assertEqual(fields.get("operator"), "SUN")
        self.assertGreaterEqual(confidence, 0.0)
        self.assertIn("machine_code", reasoning)

    def test_interpreter_parses_report_header_fields(self) -> None:
        interpreter = Interpreter()
        text = (
            "ECC\n"
            "BÁO CÁO GIA CÔNG\n"
            "NGÀY: 2024-01-15\n"
            "CA: Đêm\n"
            "MAY: MC01\n"
            "DỰ ÁN: SP-100\n"
            "SỐ LƯỢNG: 120\n"
            "NGƯỜI VẬN HÀNH: SUN\n"
            "NGƯỜI KIỂM TRA: THU"
        )
        fields, confidence, reasoning = interpreter.interpret(text)

        self.assertEqual(fields.get("machine_code"), "MC01")
        self.assertEqual(fields.get("date"), "2024-01-15")
        self.assertEqual(fields.get("shift"), "3")
        self.assertEqual(fields.get("operator"), "SUN")
        self.assertEqual(fields.get("product_code"), "SP100")
        self.assertEqual(fields.get("quantity"), 120)
        self.assertGreaterEqual(confidence, 0.0)
        self.assertIn("header parsing", reasoning.lower())

    def test_production_profile_matches_report_and_parses_full_fields(self) -> None:
        profile = ProductionReportProfile()
        text = (
            "BÁO CÁO GIA CÔNG\n"
            "NGÀY: 2024-01-15\n"
            "CA: Đêm\n"
            "MÁY: MC01\n"
            "DỰ ÁN: SP-100\n"
            "SỐ LƯỢNG: 120\n"
            "VẬT LIỆU: THÉP\n"
            "SỐ BẢN VẼ: BV-01\n"
            "CHI TIẾT SỐ: CT-10\n"
            "TÊN CHI TIẾT: LỤC GIÁC\n"
            "NG.CÔNG SỐ: 5\n"
            "TỔNG NG.CÔNG: 8\n"
            "T.GIAN GC/CÁI: 0.5\n"
            "TỔNG T.GIAN: 60\n"
            "NGƯỜI VẬN HÀNH: SUN\n"
            "NGƯỜI KIỂM TRA: THU"
        )

        self.assertTrue(profile.match(text))
        parsed = profile.parse(text)
        self.assertEqual(parsed.get("date"), "2024-01-15")
        self.assertEqual(parsed.get("shift"), "3")
        self.assertEqual(parsed.get("machine_code"), "MC01")
        self.assertEqual(parsed.get("project_code"), "SP-100")
        self.assertEqual(parsed.get("quantity"), 120)
        self.assertEqual(parsed.get("material"), "THÉP")
        self.assertEqual(parsed.get("drawing_number"), "BV-01")
        self.assertEqual(parsed.get("detail_number"), "CT-10")
        self.assertEqual(parsed.get("detail_name"), "LỤC GIÁC")
        self.assertEqual(parsed.get("labor_number"), "5")
        self.assertEqual(parsed.get("total_labor"), "8")
        self.assertEqual(parsed.get("gc_time_per_piece"), "0.5")
        self.assertEqual(parsed.get("total_time"), "60")
        self.assertEqual(parsed.get("operator"), "SUN")
        self.assertEqual(parsed.get("checker"), "THU")

    def test_profile_selector_prefers_production_report_for_report_templates(self) -> None:
        text = (
            "BÁO CÁO GIA CÔNG\n"
            "NGÀY: 2024-01-15\n"
            "CA: Đêm\n"
            "MÁY: MC01\n"
            "DỰ ÁN: SP-100\n"
            "SỐ LƯỢNG: 120\n"
            "NGƯỜI VẬN HÀNH: SUN"
        )
        profile = get_document_profile(text)
        self.assertIsNotNone(profile)
        self.assertEqual(profile.document_type, "production_report")

    def test_interpreter_extracts_full_production_report_fields(self) -> None:
        interpreter = Interpreter()
        text = (
            "BÁO CÁO GIA CÔNG\n"
            "NGÀY: 2024-01-15\n"
            "CA: Đêm\n"
            "MÁY: MC01\n"
            "DỰ ÁN: SP-100\n"
            "SỐ LƯỢNG: 120\n"
            "VẬT LIỆU: THÉP\n"
            "SỐ BẢN VẼ: BV-01\n"
            "CHI TIẾT SỐ: CT-10\n"
            "TÊN CHI TIẾT: LỤC GIÁC\n"
            "NG.CÔNG SỐ: 5\n"
            "TỔNG NG.CÔNG: 8\n"
            "T.GIAN GC/CÁI: 0.5\n"
            "TỔNG T.GIAN: 60\n"
            "NGƯỜI VẬN HÀNH: SUN\n"
            "NGƯỜI KIỂM TRA: THU"
        )
        fields, confidence, reasoning = interpreter.interpret(text)
        self.assertEqual(fields.get("document_type"), "production_report")
        self.assertEqual(fields.get("date"), "2024-01-15")
        self.assertEqual(fields.get("shift"), "3")
        self.assertEqual(fields.get("machine_code"), "MC01")
        self.assertEqual(fields.get("product_code"), "SP100")
        self.assertEqual(fields.get("quantity"), 120)
        self.assertEqual(fields.get("material"), "THÉP")
        self.assertEqual(fields.get("drawing_number"), "BV-01")
        self.assertEqual(fields.get("detail_number"), "CT-10")
        self.assertEqual(fields.get("detail_name"), "LỤC GIÁC")
        self.assertEqual(fields.get("labor_number"), "5")
        self.assertEqual(fields.get("total_labor"), "8")
        self.assertEqual(fields.get("gc_time_per_piece"), "0.5")
        self.assertEqual(fields.get("total_time"), "60")
        self.assertEqual(fields.get("operator"), "SUN")
        self.assertEqual(fields.get("checker"), "THU")
        self.assertGreaterEqual(confidence, 0.0)
        self.assertIn("production_report", reasoning.lower())

    def test_validator_can_correct_and_accept_normalized_values(self) -> None:
        validator = Validator()
        fields = {
            "machine_code": "MC01",
            "product_code": "SP100",
            "quantity": 120,
            "date": "2024-01-15",
            "operator": "SUN",
        }
        is_valid, reason = validator.check(fields)
        self.assertTrue(is_valid)
        self.assertIn("hợp lệ", reason)


if __name__ == "__main__":
    unittest.main()
