# ============================================================
# ERP AI BENCHMARK
# Benchmark toàn bộ báo cáo BC4 -> BC26
# Version: Production
# ============================================================

from pathlib import Path
import json
import time
import traceback
from datetime import datetime

import pandas as pd

from core.pipeline import Pipeline

# ============================================================
# DATASET
# ============================================================

DATASET_ROOT = Path(
    r"D:\BÁO CÁO XƯƠNG\BÁO CÁO 2026\Hinh"
)

# ============================================================
# OUTPUT
# ============================================================

OUTPUT_DIR = Path("benchmark_results")

JSON_DIR = OUTPUT_DIR / "json"
EXCEL_DIR = OUTPUT_DIR / "excel"
SUMMARY_DIR = OUTPUT_DIR / "summary"

JSON_DIR.mkdir(parents=True, exist_ok=True)
EXCEL_DIR.mkdir(parents=True, exist_ok=True)
SUMMARY_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================
# AI PIPELINE
# ============================================================

pipeline = Pipeline()

# ============================================================
# IMAGE EXTENSIONS
# ============================================================

IMAGE_EXTS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".tif",
    ".tiff",
    ".pdf",
}

# ============================================================
# HELPERS
# ============================================================

def natural_key(path: Path):
    """
    0.jpg
    1.jpg
    2.jpg

    thay vì

    0
    1
    10
    11
    """

    stem = path.stem

    try:
        return int(stem)
    except:
        return stem


def collect_report_folders(root: Path):

    folders = []

    for folder in sorted(root.iterdir()):

        if not folder.is_dir():
            continue

        if folder.name.lower().startswith("bc"):
            folders.append(folder)

    return folders


def collect_images(folder: Path):

    files = []

    for f in folder.iterdir():

        if f.suffix.lower() in IMAGE_EXTS:
            files.append(f)

    return sorted(files, key=natural_key)


def safe(value):

    if value is None:
        return ""

    return value


def prediction_to_row(prediction, elapsed, folder_name):

    metadata = prediction.metadata or {}

    return {

        "Folder": folder_name,

        "Filename": metadata.get("filename",""),

        "DocumentType": prediction.document_type,

        "Confidence": prediction.confidence,

        "OCR Engine": metadata.get("ocr_engine_used",""),

        "LLM Used": metadata.get("llm_used",False),

        "Processing Time": elapsed,

        "Validation":
            prediction.validation.get("is_valid",False),

        "Reasoning":
            prediction.reasoning,

        "Raw Text":
            metadata.get("raw_text",""),

        "Fields":
            json.dumps(
                prediction.fields,
                ensure_ascii=False
            ),

    }