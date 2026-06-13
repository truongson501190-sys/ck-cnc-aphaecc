// Category Types (Chủng loại)
export interface Category {
  id: string;
  name?: string;
  maLoai?: string;
  /** Legacy / Excel alias for `maLoai` (product code) */
  maChungLoai?: string;
  tenLoai?: string;
  /** Legacy display name; prefer `tenLoai` when both exist */
  tenChungLoai?: string;
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
  name?: string;
  maMay?: string;
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
  name?: string;
  maKho?: string;
  tenKho: string;
  loaiKho?: string;
  ghiChu?: string;
  createdAt: string;
}

// User Types (Người Nhập - Xuất)
export interface User {
  id: string;
  employee_code: string; // Mã số nhân viên
  full_name: string;
  fullName?: string;
  role: 'nhap' | 'xuat' | 'nhan' | 'admin' | 'manager' | 'user';
  note?: string;
  // compatibility / legacy fields used across UI
  hoTen?: string;
  msnv?: string;
  name?: string;
  username?: string;
  chucDanh?: string;
  boPhan?: string;
  matKhau?: string;
  vaiTro?: string;
  trangThai?: 'active' | 'inactive';
  email?: string;
  lastLogin?: string | Date;
  soDienThoai?: string;
  createdAt: string;
}

// Project Types (Dự Án)
export interface Project {
  id: string;
  project_code?: string;
  maDuAn?: string;
  name?: string;
  tenDuAn: string;
  /** Legacy field used by some localStorage exports */
  tenKhachHang?: string;
  ghiChu?: string;
  createdAt: string;
}

// Employee Types (Nhân viên)
export interface Employee {
  id: string;
  msnv: string;
  ten_nhan_vien: string;
  ghiChu?: string;
  createdAt: string;
}