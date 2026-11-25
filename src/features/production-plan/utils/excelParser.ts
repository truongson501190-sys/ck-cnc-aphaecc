export function parseExcelNumber(raw: string | undefined, fallback = 0): number {
  if (!raw) return fallback;
  const cleaned = raw.trim().replace(/\s+/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : fallback;
}

export function parseExcelDate(raw: string | undefined): string {
  if (!raw) return '';
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const dmy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return '';
}
