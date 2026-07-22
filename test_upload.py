import requests
from pathlib import Path

url = 'http://127.0.0.1:5001/ocr'
path = Path(r'D:\My Job\BC-kho-ckcnc\backend_ocr\uploads\20260718_181151_bc5-4-1(1-4).pdf')
with path.open('rb') as f:
    files = {'file': (path.name, f, 'application/pdf')}
    resp = requests.post(url, files=files, timeout=1800)
    print(resp.status_code)
    print(resp.text)
