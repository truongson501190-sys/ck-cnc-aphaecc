export type QcResult = 'OK' | 'NG';

export interface QcReport {
  id: string;
  ngay: string;
  duAn: string;
  banVeSo: string;
  chiTietSo: string;
  tenChiTiet: string;
  inspectedQuantity: number;
  result: QcResult;
  inspector: string;
  notes: string;
  createdAt: string;
}
