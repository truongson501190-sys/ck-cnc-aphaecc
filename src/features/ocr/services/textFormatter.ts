// src/features/ocr/services/textFormatter.ts
export function formatText(text: string): string {
  const lines = text.split('\n');
  const formatted: string[] = [];
  
  // Xóa dòng trống thừa
  let emptyCount = 0;
  for (const line of lines) {
    if (line.trim() === '') {
      emptyCount++;
      if (emptyCount < 2) {
        formatted.push('');
      }
    } else {
      emptyCount = 0;
      // Xóa khoảng trắng thừa trong dòng
      formatted.push(line.replace(/\s+/g, ' ').trim());
    }
  }
  
  return formatted.join('\n');
}