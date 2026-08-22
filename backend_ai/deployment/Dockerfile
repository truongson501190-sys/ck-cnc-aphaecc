# Dockerfile
FROM python:3.10-slim

# Cài đặt dependencies hệ thống
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    tesseract-ocr \
    tesseract-ocr-vie \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Tạo user không root
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Copy requirements và cài đặt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Tạo thư mục cho data và logs
RUN mkdir -p /app/data /app/logs && chown -R appuser:appuser /app

# Chuyển sang user không root
USER appuser

# Expose cổng
EXPOSE 8000

# Entrypoint
ENTRYPOINT ["/app/deployment/entrypoint.sh"]

# Lệnh mặc định
CMD ["uvicorn", "backend_ai.main:app", "--host", "0.0.0.0", "--port", "8000"]