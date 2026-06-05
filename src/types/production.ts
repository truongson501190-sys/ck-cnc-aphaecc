export interface ToolEntry {
  tenDao: string;
  slCap: number;
  slSuDung: number;
  hong: number;
  donVi: string;
  donGia: number;
  thanhTien: number;
}

export interface WorkTimeEntry {
  thoiGianBatDau: string;
  thoiGianKetThuc: string;
  soGio: number;
}

export interface ProductionReport {
  id: string;
  ngayThang: string;
  maySanXuat: string;
  duAn: string;
  tenDuAn: string;
  khachHang?: string;
  banVeSo: string;
  chiTietSo: string;
  tenChiTiet: string;
  noiDungGiaCong: string;
  soLuongHoanThanh: number;
  vatLieu: string;
  nguyenCongSo: string;
  toolEntries: ToolEntry[];
  workTimeEntries?: WorkTimeEntry[];
  setupTimeEntries?: WorkTimeEntry[];
  ca: 'ngay' | 'dem' | '';
  cpMay: number;
  cpDaoCu: number;
  nguoiVanHanh: string;
  nguoiKiemTra: string;
  tgTrenCa: string;
  tgGaPhoi?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
  
  // Chi phí và thời gian (tính toán)
  chiPhiGa?: number;
  chiPhiChayMay?: number;
  chiPhiDao?: number;
  gioGa?: number;
  gioChay?: number;
}