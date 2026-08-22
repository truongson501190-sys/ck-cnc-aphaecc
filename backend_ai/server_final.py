"""Compatibility wrapper for the canonical OCR server.

This file intentionally stays tiny so legacy scripts can still import
``app`` without duplicating the OCR logic in multiple places.
"""

from backend_ai.ocr_server import app

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
