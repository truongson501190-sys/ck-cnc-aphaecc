// backend_ocr/server_final.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
import os
import tempfile

app = Flask(__name__)
CORS(app)

# Khởi tạo EasyOCR (chỉ 1 lần)
reader = easyocr.Reader(['vi', 'en'], gpu=False)

@app.route('/health', methods=['GET'])
def health():
    return 'OK', 200

@app.route('/ocr', methods=['POST'])
def ocr():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'Empty filename'}), 400

    # Lưu file tạm
    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        # OCR với EasyOCR
        result = reader.readtext(tmp_path, detail=0)
        full_text = '\n'.join(result)

        return jsonify({
            'status': 'success' if full_text else 'error',
            'text': full_text or '⚠️ Không tìm thấy chữ',
            'length': len(full_text),
            'filename': file.filename,
            'file_type': file.content_type
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

if __name__ == '__main__':
    print("🚀 OCR Server (EasyOCR only) running on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)