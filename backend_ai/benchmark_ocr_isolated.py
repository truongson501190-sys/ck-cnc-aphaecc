import json
import sys
import time
from pathlib import Path

import cv2

sys.path.append('.')

from engines.vision.processor import VisionProcessor
from engines.ocr.paddle_ocr import paddle_ocr
from engines.ocr.easyocr_engine import easyocr_engine
from engines.ocr.tesseract_ocr import tesseract_ocr


SOURCE_IMAGE = Path('bao_cao_mau.jpg')
OUTPUT_ORIGINAL = Path('original.jpg')
OUTPUT_PREPROCESSED = Path('preprocessed.jpg')
REPORT_PATH = Path('ocr_isolated_benchmark.json')


def build_report() -> list[dict]:
    img_bytes = SOURCE_IMAGE.read_bytes()
    processor = VisionProcessor()
    original_rgb = processor._load_image(img_bytes)
    preprocessed = processor.process(img_bytes)

    cv2.imwrite(str(OUTPUT_ORIGINAL), cv2.cvtColor(original_rgb, cv2.COLOR_RGB2BGR))
    cv2.imwrite(str(OUTPUT_PREPROCESSED), preprocessed)

    engines = [
        ('paddle', paddle_ocr),
        ('easyocr', easyocr_engine),
        ('tesseract', tesseract_ocr),
    ]
    inputs = [
        ('original', original_rgb),
        ('preprocessed', preprocessed),
    ]

    results: list[dict] = []
    for engine_name, engine in engines:
        for input_name, image_np in inputs:
            start = time.time()
            try:
                init_ok = engine.initialize()
                res = engine.read(image_np)
                elapsed = time.time() - start
                results.append({
                    'engine_used': engine_name,
                    'input_image': input_name,
                    'available': bool(engine.is_available()),
                    'init_ok': bool(init_ok),
                    'success': bool(getattr(res, 'success', False)),
                    'raw_text': (res.text or '')[:2500],
                    'ocr_confidence': round(float(res.confidence or 0.0), 5),
                    'processing_time_sec': round(elapsed, 5),
                    'error': getattr(res, 'error', None),
                })
            except Exception as exc:
                elapsed = time.time() - start
                results.append({
                    'engine_used': engine_name,
                    'input_image': input_name,
                    'available': False,
                    'init_ok': False,
                    'success': False,
                    'raw_text': '',
                    'ocr_confidence': 0.0,
                    'processing_time_sec': round(elapsed, 5),
                    'error': str(exc),
                })

    REPORT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    return results


if __name__ == '__main__':
    report = build_report()
    print(json.dumps(report, ensure_ascii=False, indent=2))
