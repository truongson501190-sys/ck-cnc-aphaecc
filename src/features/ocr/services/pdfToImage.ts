import type { PDFDocumentProxy } from 'pdfjs-dist';

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | undefined;

async function loadPDFJS(): Promise<typeof import('pdfjs-dist')> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.js',
        import.meta.url,
      ).toString();
      return pdfjsLib;
    });
  }

  return pdfjsPromise;
}

export async function loadPDFDocument(file: File): Promise<PDFDocumentProxy> {
  const pdfjsLib = await loadPDFJS();
  return pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
}

export async function pdfToImage(file: File, pageNumber = 1): Promise<File> {
  try {
    if (typeof window === 'undefined') {
      throw new Error('PDF chỉ hỗ trợ trên browser');
    }
    
    const pdf = await loadPDFDocument(file);
    
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