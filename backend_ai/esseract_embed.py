# backend_ocr/tesseract_embed.py
import os
import sys
import subprocess
import tempfile
import urllib.request
import zipfile
from pathlib import Path

class TesseractEmbed:
    """Tesseract tự động tải và chạy không cần cài đặt"""
    
    def __init__(self):
        self.tesseract_path = None
        self.tessdata_path = None
        self._setup_tesseract()
    
    def _setup_tesseract(self):
        """Tự động cài đặt Tesseract nếu chưa có"""
        # Kiểm tra Tesseract đã có chưa
        common_paths = [
            r'C:\Program Files\Tesseract-OCR\tesseract.exe',
            r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
            r'C:\Tesseract-OCR\tesseract.exe',  # Thêm đường dẫn này
        ]
        
        for path in common_paths:
            if os.path.exists(path):
                self.tesseract_path = path
                self.tessdata_path = os.path.join(os.path.dirname(path), 'tessdata')
                print(f"✅ Tesseract found at: {path}")
                return
        
        # Nếu chưa có, tự động tải và cài đặt
        self._download_and_install()
    
    def _download_and_install(self):
        """Tự động tải và cài đặt Tesseract"""
        print("📥 Tesseract not found. Downloading...")
        
        # Tạo thư mục tạm
        temp_dir = tempfile.mkdtemp()
        
        # URL tải Tesseract portable (phiên bản nhẹ hơn)
        tesseract_url = "https://github.com/UB-Mannheim/tesseract/releases/download/v5.3.3.20231005/tesseract-ocr-w64-setup-5.3.3.20231005.exe"
        
        installer_path = os.path.join(temp_dir, 'tesseract_installer.exe')
        
        # Tải file cài đặt
        print("📥 Downloading Tesseract installer...")
        try:
            urllib.request.urlretrieve(tesseract_url, installer_path)
            print("✅ Download complete")
        except Exception as e:
            print(f"❌ Download failed: {e}")
            print("💡 Please install Tesseract manually from: https://github.com/UB-Mannheim/tesseract/wiki")
            return
        
        # Cài đặt silent
        print("📦 Installing Tesseract...")
        try:
            # Sử dụng /S cho silent install
            subprocess.run([
                installer_path, 
                '/S', 
                '/D=C:\\Tesseract-OCR'
            ], check=True, capture_output=True)
            print("✅ Installation complete")
        except Exception as e:
            print(f"❌ Installation failed: {e}")
            print("💡 Please install Tesseract manually from: https://github.com/UB-Mannheim/tesseract/wiki")
            return
        
        # Cập nhật path
        self.tesseract_path = r'C:\Tesseract-OCR\tesseract.exe'
        self.tessdata_path = r'C:\Tesseract-OCR\tessdata'
        
        # Tải file ngôn ngữ tiếng Việt
        self._download_language_files()
        
        print(f"✅ Tesseract installed at: {self.tesseract_path}")
    
    def _download_language_files(self):
        """Tải file ngôn ngữ tiếng Việt"""
        if not self.tessdata_path:
            return
        
        os.makedirs(self.tessdata_path, exist_ok=True)
        
        # Tải tiếng Việt
        lang_url = "https://github.com/tesseract-ocr/tessdata_best/raw/main/vie.traineddata"
        lang_path = os.path.join(self.tessdata_path, 'vie.traineddata')
        
        if not os.path.exists(lang_path):
            print("📥 Downloading Vietnamese language...")
            try:
                urllib.request.urlretrieve(lang_url, lang_path)
                print("✅ Vietnamese language downloaded")
            except Exception as e:
                print(f"❌ Download language failed: {e}")
                print("💡 You can download manually from: https://github.com/tesseract-ocr/tessdata_best/raw/main/vie.traineddata")
    
    def get_tesseract_path(self):
        return self.tesseract_path
    
    def get_tessdata_path(self):
        return self.tessdata_path
    
    def is_available(self):
        return self.tesseract_path is not None and os.path.exists(self.tesseract_path)

# Singleton
tesseract_embed = TesseractEmbed()

# ====================== TEST ======================
if __name__ == "__main__":
    print("=" * 50)
    print("🔍 Tesseract Embed Test")
    print("=" * 50)
    
    if tesseract_embed.is_available():
        print(f"✅ Tesseract available at: {tesseract_embed.get_tesseract_path()}")
        print(f"✅ Tessdata at: {tesseract_embed.get_tessdata_path()}")
        
        # Kiểm tra file ngôn ngữ
        lang_file = os.path.join(tesseract_embed.get_tessdata_path(), 'vie.traineddata')
        if os.path.exists(lang_file):
            print(f"✅ Vietnamese language file: {lang_file}")
        else:
            print("⚠️ Vietnamese language file not found")
    else:
        print("❌ Tesseract not available")