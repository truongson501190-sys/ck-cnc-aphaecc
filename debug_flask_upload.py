import sys
import traceback

sys.path.insert(0, r'.\backend_ocr')
import server_simple

app = server_simple.app
app.testing = True
client = app.test_client()

with open(r'.\backend_ocr\uploads\20260718_181151_bc5-4-1(1-4).pdf', 'rb') as f:
    data = {'file': (f, '20260718_181151_bc5-4-1(1-4).pdf')}
    resp = client.post('/ocr', data=data, content_type='multipart/form-data')
    print('status', resp.status_code)
    print(resp.get_data(as_text=True))
