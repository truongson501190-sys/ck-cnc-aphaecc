// src/features/ocr/services/imageProcessor.ts
export async function preprocessImage(imageData: string | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof imageData === 'string' ? imageData : URL.createObjectURL(imageData);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Không thể tạo Canvas context'));
        return;
      }
      
      // ✅ Tăng kích thước ảnh lên 2x
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // ✅ Vẽ ảnh với chất lượng cao
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // ✅ Lấy dữ liệu ảnh
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageDataObj.data;
      
      // ✅ Tăng contrast mạnh
      const contrast = 2.0;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
        data[i+1] = Math.min(255, Math.max(0, factor * (data[i+1] - 128) + 128));
        data[i+2] = Math.min(255, Math.max(0, factor * (data[i+2] - 128) + 128));
      }
      
      ctx.putImageData(imageDataObj, 0, 0);
      
      if (typeof imageData !== 'string') {
        URL.revokeObjectURL(url);
      }
      
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => reject(new Error('Không thể xử lý ảnh'));
    img.src = url;
  });
}