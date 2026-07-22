# server_cors_fixed.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
import os
from datetime import datetime
from pdf2image import convert_from_path
import zipfile
import tempfile

app = Flask(__name__)

# CORS mở hoàn toàn
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

print("Dang khoi tao EasyOCR...")
reader = easyocr.Reader(['vi', 'en'], gpu=False)
print("EasyOCR san sang!")

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Duong dan poppler
POPPLER_PATHS = [
    r'D:\My Job\poppler\Release-26.02.0-0\poppler-26.02.0\Library\bin',
    r'D:\My Job\poppler\Release-26.02.0-0\poppler-26.02.0\bin',
]

POPPLER_PATH = None
for path in POPPLER_PATHS:
    if os.path.exists(path):
        POPPLER_PATH = path
        print(f"Tim thay poppler tai: {POPPLER_PATH}")
        break

def is_pdf(filename):
    return filename.lower().endswith('.pdf')

def is_image(filename):
    return any(filename.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff'])

def is_zip(filename):
    return filename.lower().endswith('.zip')

def process_pdf(filepath):
    """Xu ly PDF - tra ve text cua tat ca trang"""
    if POPPLER_PATH is None:
        return None, 'Poppler chua duoc cai dat.'
    try:
        os.environ['PATH'] = POPPLER_PATH + os.pathsep + os.environ['PATH']
        images = convert_from_path(filepath, dpi=200)
        all_texts = []
        for i, img in enumerate(images):
            temp_path = os.path.join(UPLOAD_FOLDER, f"temp_page_{i}.jpg")
            img.save(temp_path, "JPEG")
            result = reader.readtext(temp_path)
            os.remove(temp_path)
            if result:
                page_text = '\n'.join([item[1] for item in result])
                all_texts.append(f"--- Trang {i+1} ---\n{page_text}")
        return '\n\n'.join(all_texts), None
    except Exception as e:
        return None, str(e)

def process_image(filepath):
    """Xu ly anh"""
    result = reader.readtext(filepath)
    if not result:
        return 'Khong tim thay chu', None
    return '\n'.join([item[1] for item in result]), None

def process_zip(filepath):
    """Xu ly file ZIP chua nhieu anh/PDF"""
    try:
        all_texts = []
        with zipfile.ZipFile(filepath, 'r') as zip_ref:
            with tempfile.TemporaryDirectory() as temp_dir:
                zip_ref.extractall(temp_dir)
                for filename in sorted(os.listdir(temp_dir)):
                    file_path = os.path.join(temp_dir, filename)
                    if is_image(filename):
                        text, _ = process_image(file_path)
                        if text:
                            all_texts.append(f"--- {filename} ---\n{text}")
                    elif is_pdf(filename):
                        text, _ = process_pdf(file_path)
                        if text:
                            all_texts.append(f"--- {filename} ---\n{text}")
        return '\n\n'.join(all_texts), None
    except Exception as e:
        return None, str(e)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'time': datetime.now().isoformat()})

@app.route('/ocr', methods=['POST', 'OPTIONS'])
def ocr():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'message': 'Khong tim thay file'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'status': 'error', 'message': 'Ten file rong'}), 400
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        print(f"Nhan file: {filename}")
        
        if is_pdf(filename):
            text, error = process_pdf(filepath)
        elif is_zip(filename):
            text, error = process_zip(filepath)
        elif is_image(filename):
            text, error = process_image(filepath)
        else:
            text, error = None, 'Dinh dang khong ho tro. Ho tro: JPG, PNG, PDF, ZIP'
        
        if os.path.exists(filepath):
            os.remove(filepath)
        
        if error:
            return jsonify({'status': 'error', 'message': error}), 400
        
        return jsonify({
            'status': 'success',
            'filename': filename,
            'text': text,
            'length': len(text) if text else 0
        })
        
    except Exception as e:
        print(f"Loi: {e}")
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("=" * 50)
    print("OCR Server dang chay tai http://localhost:5001")
    print("Ho tro: Anh (JPG, PNG), PDF (nhieu trang), ZIP (nhieu file)")
    print("Endpoint: POST /ocr")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)