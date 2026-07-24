// src/features/ocr/services/pdfToImage.ts

// ✅ Load pdfjs-dist từ CDN bằng script tag
function loadPDFJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    // Kiểm tra nếu đã load rồi
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js không được tải đúng cách'));
      }
    };
    script.onerror = () => reject(new Error('Không thể tải PDF.js từ CDN'));
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export async function pdfToImage(file: File, pageNumber = 1): Promise<File> {
  try {
    if (typeof window === 'undefined') {
      throw new Error('PDF chỉ hỗ trợ trên browser');
    }
    
    // ✅ Load PDF.js từ CDN
    const pdfjsLib = await loadPDFJS();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Trang PDF không hợp lệ. File có ${pdf.numPages} trang.`);
    }

    const page = await pdf.getPage(pageNumber);
    
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Trình duyệt không hỗ trợ Canvas để chuyển PDF sang ảnh.');
    }
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) {
          resolve(value);
        } else {
          reject(new Error('Không thể tạo ảnh PNG từ trang PDF.'));
        }
      }, 'image/png');
    });

    const baseName = file.name.replace(/\.pdf$/i, '');
    return new File([blob], `${baseName}-page-${pageNumber}.png`, {
      type: 'image/png',
    });
    
  } catch (error) {
    console.error('❌ Lỗi chuyển PDF:', error);
    const reason = error instanceof Error ? error.message : 'Lỗi không xác định';
    throw new Error(`Không thể chuyển PDF sang ảnh: ${reason}`);
  }
}