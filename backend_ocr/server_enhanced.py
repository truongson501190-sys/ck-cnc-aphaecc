# backend_ocr/server_enhanced_v2.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import easyocr
import tempfile
import os
import traceback
import cv2
import numpy as np

app = Flask(__name__)
CORS(app)

print("⏳ Đang tải EasyOCR...")
reader = easyocr.Reader(['vi', 'en'], gpu=False, verbose=False)
print("✅ EasyOCR sẵn sàng!")

def preprocess_image_advanced(image_path):
    """Tiền xử lý ảnh tối ưu cho OCR"""
    try:
        img = cv2.imread(image_path)
        if img is None:
            return None
        
        print(f"📐 Kích thước ảnh: {img.shape}")
        
        # 1. Resize ảnh lên lớn hơn
        h, w = img.shape[:2]
        if h < 1000 or w < 1000:
            scale = max(2000/h, 2000/w)
            new_w = int(w * scale)
            new_h = int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
            print(f"📐 Resize: {w}x{h} -> {new_w}x{new_h}")
        
        # 2. Chuyển grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 3. Khử nhiễu
        denoised = cv2.fastNlMeansDenoising(gray, None, 20, 7, 21)
        
        # 4. Tăng độ tương phản
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)
        
        # 5. Làm sắc nét
        kernel_sharpen = np.array([[-1,-1,-1],
                                   [-1, 9,-1],
                                   [-1,-1,-1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel_sharpen)
        
        # 6. Binary threshold với Otsu
        _, binary = cv2.threshold(sharpened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # 7. Morphology để làm sạch
        kernel = np.ones((2, 2), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
        
        # Lưu ảnh đã xử lý
        processed_path = image_path + "_processed.jpg"
        cv2.imwrite(processed_path, cleaned)
        print("✅ Tiền xử lý hoàn tất")
        return processed_path
        
    except Exception as e:
        print(f"❌ Lỗi tiền xử lý: {e}")
        return None

@app.route('/health', methods=['GET'])
def health():
    return 'OK', 200

@app.route('/ocr', methods=['POST'])
def ocr():
    tmp_path = None
    processed_path = None
    
    try:
        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({'status': 'error', 'message': 'No file'}), 400

        # Lưu file tạm
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        # Tiền xử lý
        processed_path = preprocess_image_advanced(tmp_path)
        ocr_path = processed_path if processed_path else tmp_path

        # OCR
        result = reader.readtext(ocr_path, detail=0, paragraph=True)
        text = '\n'.join(result)

        # Dọn dẹp
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        if processed_path and os.path.exists(processed_path):
            os.unlink(processed_path)

        return jsonify({
            'status': 'success' if text else 'error',
            'text': text or 'Không tìm thấy chữ',
            'length': len(text),
            'filename': file.filename
        })

    except Exception as e:
        print(f"❌ Lỗi: {e}")
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)