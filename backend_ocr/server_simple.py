# backend_ocr/server_simple.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
import os
import re
from datetime import datetime
import cv2
import numpy as np
from PIL import Image
import io

# CORS Configuration - Chỉ cho phép các domain cụ thể thay vì "*"
ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:3003',
]

app = Flask(__name__)

# CORS với origins cụ thể (fix lỗi S5122)
CORS(app, resources={
    r"/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin in ALLOWED_ORIGINS:
        response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Thêm import cho Tesseract
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    print("✅ Tesseract available")
except ImportError:
    TESSERACT_AVAILABLE = False
    print("⚠️ Tesseract not available")

# Thêm import cho PyMuPDF
try:
    import fitz
    PYMUPDF_AVAILABLE = True
    print("✅ PyMuPDF available")
except ImportError:
    PYMUPDF_AVAILABLE = False
    print("⚠️ PyMuPDF not available")

print("🔄 Đang khởi tạo EasyOCR...")
reader = easyocr.Reader(['vi', 'en'], gpu=False, verbose=False)
print("✅ EasyOCR sẵn sàng!")

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ====================== TIỀN XỬ LÝ ẢNH NÂNG CAO ======================

class ImagePreprocessor:
    """Tiền xử lý ảnh nâng cao cho OCR"""

    @staticmethod
    def preprocess_image(image_path):
        """Tiền xử lý ảnh với nhiều kỹ thuật"""
        img = cv2.imread(image_path)
        if img is None:
            return None
        
        # 1. Chuyển sang grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 2. Tăng kích thước ảnh nếu quá nhỏ
        h, w = gray.shape
        if h < 500 or w < 500:
            scale = max(800/h, 800/w)
            new_w = int(w * scale)
            new_h = int(h * scale)
            gray = cv2.resize(gray, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        
        # 3. Khử nhiễu mạnh
        denoised = cv2.fastNlMeansDenoising(gray, None, 15, 7, 21)
        
        # 4. Tăng contrast (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)
        
        # 5. Làm sắc nét
        kernel = np.array([[-1,-1,-1],
                          [-1, 9,-1],
                          [-1,-1,-1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)
        
        # 6. Adaptive threshold
        binary = cv2.adaptiveThreshold(
            sharpened, 255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 15, 3
        )
        
        # 7. Xóa nhiễu nhỏ
        kernel = np.ones((2, 2), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
        
        return cleaned

    @staticmethod
    def deskew_image(image_path):
        """Xoay ảnh nếu bị nghiêng"""
        img = cv2.imread(image_path)
        if img is None:
            return None
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Fix lỗi S6729: dùng np.nonzero thay np.where
        coords = np.column_stack(np.nonzero(gray > 0))
        if len(coords) < 10:
            return img
        
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        
        # Chỉ xoay nếu góc nghiêng > 0.5 độ
        if abs(angle) > 0.5:
            (h, w) = img.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(img, M, (w, h), 
                                    flags=cv2.INTER_CUBIC,
                                    borderMode=cv2.BORDER_REPLICATE)
            return rotated
        
        return img

# ====================== POST-PROCESSING ======================

def post_process_vietnamese_text(text):
    """Hậu xử lý text tiếng Việt"""
    if not text:
        return text
    
    # Sửa lỗi chính tả thường gặp - Loại bỏ duplicate keys
    corrections = {
        'thuòng': 'thường',
        'duòng': 'đường',
        'còng': 'công',
        'khòng': 'không',
        'chièu': 'chiều',
        'dài': 'dài',
        'ròng': 'rộng',
        'cao': 'cao',
        'thâp': 'thấp',
        'rông': 'rộng',
        'dãn': 'dân',
        'trong': 'trọng',
        'máy': 'máy',
        'ngày': 'ngày',
        'tháng': 'tháng',
        'năm': 'năm',
        'ca': 'ca',
        'dao': 'dao',
        'cụ': 'cụ',
        'phôi': 'phôi',
        'gia': 'gia',
        'nguyên': 'nguyên',  # Removed duplicate 'công'
    }
    
    lines = text.split('\n')
    corrected_lines = []
    
    for line in lines:
        for wrong, correct in corrections.items():
            line = line.replace(wrong, correct)
        
        # Xóa khoảng trắng thừa
        line = re.sub(r'\s+', ' ', line).strip()
        corrected_lines.append(line)
    
    return '\n'.join(corrected_lines)

# ====================== XỬ LÝ PDF ======================

def pdf_to_images(pdf_path):
    """Chuyển PDF thành danh sách ảnh với chất lượng cao"""
    images = []
    
    if PYMUPDF_AVAILABLE:
        try:
            pdf_document = fitz.open(pdf_path)
            for page_num in range(pdf_document.page_count):
                page = pdf_document[page_num]
                # Tăng DPI để rõ hơn
                pix = page.get_pixmap(dpi=350)
                img_data = pix.tobytes("png")
                img = cv2.imdecode(np.frombuffer(img_data, np.uint8), cv2.IMREAD_COLOR)
                images.append(img)
            pdf_document.close()
            print(f"✅ Đã chuyển PDF thành {len(images)} trang ảnh")
        except Exception as e:
            print(f"❌ Lỗi chuyển PDF: {e}")
    else:
        print("⚠️ PyMuPDF không có sẵn, không thể xử lý PDF")
    
    return images

# ====================== OCR FUNCTIONS ======================

def ocr_with_easyocr(image_path):
    """OCR với EasyOCR"""
    try:
        result = reader.readtext(image_path, paragraph=False, detail=0)
        return '\n'.join(result) if result else ''
    except Exception as e:
        print(f"❌ EasyOCR error: {e}")
        return ''

def ocr_with_easyocr_enhanced(image_path):
    """OCR với EasyOCR + tiền xử lý nâng cao"""
    try:
        # Tiền xử lý
        preprocessed = ImagePreprocessor.preprocess_image(image_path)
        if preprocessed is None:
            return ocr_with_easyocr(image_path)
        
        # Lưu ảnh đã xử lý
        temp_path = os.path.join(UPLOAD_FOLDER, "temp_preprocessed.png")
        cv2.imwrite(temp_path, preprocessed)
        
        # OCR
        result = reader.readtext(temp_path, paragraph=False, detail=0)
        
        # Xóa file tạm
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        text = '\n'.join(result) if result else ''
        return post_process_vietnamese_text(text)
    except Exception as e:
        print(f"❌ EasyOCR enhanced error: {e}")
        return ocr_with_easyocr(image_path)

def ocr_with_tesseract_enhanced(image_path):
    """OCR với Tesseract + tiền xử lý nâng cao"""
    if not TESSERACT_AVAILABLE:
        return ''
    
    try:
        # Tiền xử lý
        preprocessed = ImagePreprocessor.preprocess_image(image_path)
        if preprocessed is None:
            return ''
        
        # Cấu hình Tesseract cho tiếng Việt
        custom_config = r'--oem 3 --psm 6 -l vie+eng'
        text = pytesseract.image_to_string(preprocessed, config=custom_config)
        return post_process_vietnamese_text(text.strip())
    except Exception as e:
        print(f"❌ Tesseract error: {e}")
        return ''

def ocr_hybrid_enhanced(image_path):
    """Kết hợp EasyOCR và Tesseract với tiền xử lý nâng cao"""
    # Chạy cả hai engine
    easyocr_text = ocr_with_easyocr_enhanced(image_path)
    tesseract_text = ocr_with_tesseract_enhanced(image_path)
    
    # Hợp nhất kết quả
    combined = easyocr_text
    
    # Nếu Tesseract có thêm text không có trong EasyOCR
    if tesseract_text:
        easyocr_lines = set(easyocr_text.split('\n'))
        tesseract_lines = set(tesseract_text.split('\n'))
        new_lines = tesseract_lines - easyocr_lines
        
        if new_lines:
            combined += '\n' + '\n'.join(new_lines)
    
    return combined

# ====================== PROCESS OCR ======================

def process_ocr_with_engine(engine, filepath):
    """Xử lý OCR với engine được chọn"""
    if engine == 'easyocr':
        return ocr_with_easyocr(filepath)
    elif engine == 'easyocr_enhanced':
        return ocr_with_easyocr_enhanced(filepath)
    elif engine == 'tesseract_enhanced':
        return ocr_with_tesseract_enhanced(filepath)
    else:
        return ocr_hybrid_enhanced(filepath)

def process_pdf_file(filepath, engine):
    """Xử lý file PDF"""
    images = pdf_to_images(filepath)
    all_texts = []
    
    for i, img in enumerate(images):
        temp_img_path = os.path.join(UPLOAD_FOLDER, f"temp_page_{i}.png")
        cv2.imwrite(temp_img_path, img)
        
        text = process_ocr_with_engine(engine, temp_img_path)
        
        if text:
            all_texts.append(f"--- Trang {i+1} ---\n{text}")
        
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)
    
    return '\n\n'.join(all_texts)

def process_image_file(filepath, engine):
    """Xử lý file ảnh"""
    return process_ocr_with_engine(engine, filepath)

# ====================== MAIN ENDPOINTS ======================

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'time': datetime.now().isoformat(),
        'version': '2.0.0',
        'engines': {
            'easyocr': True,
            'tesseract': TESSERACT_AVAILABLE,
            'pymupdf': PYMUPDF_AVAILABLE
        }
    })

@app.route('/ocr', methods=['POST', 'OPTIONS'])
def ocr():
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'message': 'Không tìm thấy file'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'status': 'error', 'message': 'Tên file rỗng'}), 400
        
        # Lấy engine từ request
        engine = request.form.get('engine', 'easyocr_enhanced')
        
        # Lưu file tạm
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        print(f"📥 Nhận file: {filename}")
        
        # Xử lý file
        if filename.lower().endswith('.pdf') and PYMUPDF_AVAILABLE:
            full_text = process_pdf_file(filepath, engine)
            file_type = 'pdf'
        else:
            full_text = process_image_file(filepath, engine)
            file_type = 'image'
        
        # Xóa file tạm
        if os.path.exists(filepath):
            os.remove(filepath)
        
        # Xử lý text
        full_text = re.sub(r'\s+', ' ', full_text).strip()
        
        return jsonify({
            'status': 'success' if full_text else 'error',
            'filename': filename,
            'text': full_text or '⚠️ Không tìm thấy chữ',
            'length': len(full_text),
            'engine': engine,
            'file_type': file_type,
            'lines': len(full_text.split('\n')) if full_text else 0
        })
        
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 OCR Server với Multi-Engine + Enhanced")
    print("=" * 60)
    print("📌 Endpoint: POST http://localhost:5001/ocr")
    print("📌 Health: GET http://localhost:5001/health")
    print("📌 Engines:")
    print("   - easyocr: EasyOCR cơ bản")
    print("   - easyocr_enhanced: EasyOCR + tiền xử lý")
    print("   - tesseract_enhanced: Tesseract + tiền xử lý")
    print("   - hybrid: Kết hợp cả hai")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)