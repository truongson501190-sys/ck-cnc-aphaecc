import json
import os
import sys
import time
from pathlib import Path

import fitz

os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")

sys.path.append(".")

from engines.vision.processor import VisionProcessor
from engines.ocr.paddle_ocr import paddle_ocr
from engines.ocr.easyocr_engine import easyocr_engine
from engines.ocr.tesseract_ocr import tesseract_ocr

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
REPORT_PATH = BASE_DIR / "ocr_real_benchmark.json"

PDF_FILES = [
    UPLOAD_DIR / "20260718_181151_bc5-4-1(1-4).pdf",
    UPLOAD_DIR / "20260720_075142_20260718_181151_bc5-4-1(1-4).pdf",
    UPLOAD_DIR / "20260721_101303_bc5-4-1(1-4).pdf",
    UPLOAD_DIR / "20260722_104448_bc5-4-1(1-4).pdf",
    UPLOAD_DIR / "20260722_113426_bc5-4-1(1-4).pdf",
]


def render_first_page(pdf_path: Path) -> bytes:
    doc = fitz.open(str(pdf_path))
    try:
        page = doc.load_page(0)
        pix = page.get_pixmap(dpi=200, alpha=False)
        return pix.tobytes("png")
    finally:
        doc.close()


def main() -> None:
    processor = VisionProcessor()
    report = []

    for pdf_path in PDF_FILES:
        if not pdf_path.exists():
            report.append({"file": str(pdf_path), "error": "file missing"})
            continue

        image_bytes = render_first_page(pdf_path)
        original = processor._load_image(image_bytes)
        preprocessed = processor.process(image_bytes)

        for engine_name, engine in [
            ("paddle", paddle_ocr),
            ("easyocr", easyocr_engine),
            ("tesseract", tesseract_ocr),
        ]:
            start = time.time()
            try:
                init_ok = bool(engine.initialize())
                input_image = preprocessed if engine_name != "easyocr" else original
                res = engine.read(input_image)
                elapsed = round(time.time() - start, 4)
                report.append(
                    {
                        "file": str(pdf_path.relative_to(BASE_DIR)),
                        "engine": engine_name,
                        "available": bool(engine.is_available()),
                        "init_ok": init_ok,
                        "success": bool(getattr(res, "success", False)),
                        "confidence": round(float(getattr(res, "confidence", 0.0) or 0.0), 5),
                        "processing_time_sec": elapsed,
                        "raw_text": str(getattr(res, "text", ""))[:1200].replace("\n", " "),
                        "error": getattr(res, "error", None),
                    }
                )
            except Exception as exc:
                elapsed = round(time.time() - start, 4)
                report.append(
                    {
                        "file": str(pdf_path.relative_to(BASE_DIR)),
                        "engine": engine_name,
                        "available": False,
                        "init_ok": False,
                        "success": False,
                        "confidence": 0.0,
                        "processing_time_sec": elapsed,
                        "raw_text": "",
                        "error": str(exc),
                    }
                )

    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
