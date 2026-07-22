import os
import sys
import traceback

sys.path.insert(0, r'.\backend_ocr')
import server_simple

pdf_path = r'.\backend_ocr\uploads\20260718_181151_bc5-4-1(1-4).pdf'
print('exists', os.path.exists(pdf_path))
try:
    result = server_simple.process_pdf(pdf_path)
    print('result=', result)
except Exception:
    traceback.print_exc()
