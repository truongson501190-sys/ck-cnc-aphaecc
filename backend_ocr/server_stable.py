from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
import os
import tempfile
import re

app = Flask(__name__)
CORS(app)  # Cho phép mọi nguồn gọi (dễ dàng cho dev)

# Khởi tạo EasyOCR (chỉ 1 lần)
print("⏳ Đang khởi tạo EasyOCR...")
reader = easyocr.Reader(['vi', 'en'], gpu=False, verbose=False)
print("✅ EasyOCR sẵn sàng!")

# Kiểm tra PyMuPDF để xử lý PDF
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
    print("✅ PyMuPDF có sẵn – hỗ trợ PDF")
except ImportError:
    PYMUPDF_AVAILABLE = False
    print("⚠️ PyMuPDF chưa cài – không hỗ trợ PDF (cài: pip install PyMuPDF)")

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def extract_text_from_image(image_path):
    """OCR từ ảnh bằng EasyOCR"""
    try:
        result = reader.readtext(image_path, detail=0)
        text = '\n'.join(result)
        return text.strip()
    except Exception as e:
        print(f"❌ Lỗi OCR ảnh: {e}")
        return None

def extract_text_from_pdf(pdf_path):
    """Trích xuất văn bản từ PDF bằng PyMuPDF + EasyOCR cho từng trang"""
    if not PYMUPDF_AVAILABLE:
        return None
    try:
        doc = fitz.open(pdf_path)
        all_text = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            # Chuyển trang thành ảnh
            pix = page.get_pixmap(dpi=200)
            img_data = pix.tobytes("png")
            # Lưu tạm ảnh để OCR
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                tmp.write(img_data)
                tmp_path = tmp.name
            # OCR trang
            text = extract_text_from_image(tmp_path)
            os.unlink(tmp_path)
            if text:
                all_text.append(f"--- Trang {page_num+1} ---\n{text}")
        doc.close()
        return '\n\n'.join(all_text)
    except Exception as e:
        print(f"❌ Lỗi xử lý PDF: {e}")
        return None

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'engines': {
            'easyocr': True,
            'pymupdf': PYMUPDF_AVAILABLE
        }
    })

@app.route('/ocr', methods=['POST'])
def ocr():
    try:
        # Kiểm tra file
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'message': 'Không có file'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'status': 'error', 'message': 'Tên file rỗng'}), 400

        # Lưu file tạm
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            file.save(tmp.name)
            filepath = tmp.name

        # Xác định loại file
        is_pdf = file.filename.lower().endswith('.pdf')
        
        # Xử lý OCR
        if is_pdf:
            text = extract_text_from_pdf(filepath)
        else:
            text = extract_text_from_image(filepath)

        # Xóa file tạm
        if os.path.exists(filepath):
            os.unlink(filepath)

        if text is None:
            return jsonify({'status': 'error', 'message': 'Không thể trích xuất văn bản'}), 500

        # Làm sạch text
        text = re.sub(r'\s+', ' ', text).strip()

        return jsonify({
            'status': 'success' if text else 'error',
            'text': text or '⚠️ Không tìm thấy chữ',
            'length': len(text),
            'filename': file.filename,
            'file_type': 'pdf' if is_pdf else 'image'
        })

    except Exception as e:
        print(f"❌ Lỗi server: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 OCR Server (Stable) chạy tại http://localhost:5001")
    print("📌 Endpoint: POST /ocr")
    print("📌 Health: GET /health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5001, debug=False)