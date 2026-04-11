// Category Types (Chủng loại)
export interface Category {
  id: string;
  maLoai: string;
  tenLoai: string;
  donVi: string;
  gia?: number;
  minimumStock?: number;
  moTa?: string;
  ghiChu?: string;
  createdAt: string;
}

// Machine Types (Máy móc)
export interface Machine {
  id: string;
  maMay: string;
  tenMay: string;
  loaiMay?: string;
  giaGioSang?: number;
  giaGioChieu?: number;
  giaGioToi?: number;
  moTa?: string;
  ghiChu?: string;
  qrData?: string;
  createdAt: string;
}

// Warehouse Types (Kho)
export interface Warehouse {
  id: string;
  maKho: string;
  tenKho: string;
  loaiKho?: string;
  ghiChu?: string;
  createdAt: string;
}

// User Types
export interface User {
  id: string;
  hoTen: string;
  msnv: string;
  chucVu: string;
  phongBan: string;
  // compatibility / legacy fields used across UI
  chucDanh?: string;
  boPhan?: string;
  matKhau?: string;
  vaiTro?: 'admin' | 'manager' | 'user';
  trangThai?: 'active' | 'inactive';
  name?: string;
  username?: string;
  lastLogin?: string | Date;
  email?: string;
  soDienThoai?: string;
  createdAt: string;
}

// Project Types (Dự Án)
export interface Project {
  id: string;
  maDuAn: string;
  tenDuAn: string;
  ghiChu?: string;
  createdAt: string;
}

// Operator Types (Người vận hành)
export interface Operator {
  id: string;
  maNguoi: string;
  tenNguoi: string;
  ghiChu?: string;
  createdAt: string;
}