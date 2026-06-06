// ProductionLogPage.tsx - NHẬT KÝ SẢN XUẤT (INPUT/CRUD)
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Filter, X, ArrowLeft, Upload, Download, Edit, Eye, Trash2, FileSpreadsheet, Search, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ProductionForm } from './ProductionForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabase';

// ======================
// TYPES
// ======================

interface ToolEntry {
  tenDao: string;
  slCap: number;
  slSuDung: number;
  hong: number;
  donVi: string;
  donGia: number;
  thanhTien: number;
}

interface ProductionLog {
  id: string;
  ngay: string;
  may: string;
  maDuAn: string;
  tenDuAn: string;
  banVeSo: string;
  tenChiTiet: string;
  noiDung: string;
  kichThuoc: string;
  vatLieu: string;
  ncSo: string;
  sanLuong: number;
  tgBdGa: string;
  tgKtGa: string;
  gioGa: number;
  tgBdChay: string;
  tgKtChay: string;
  gioChay: number;
  ca: string;
  nguoiVanHanh: string;
  nguoiKiemTra: string;
  chiPhiGa: number;
  chiPhiChayMay: number;
  chiPhiDao: number;
  toolEntries: ToolEntry[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  workTimeEntries?: any[];
  setupTimeEntries?: any[];
}

const STORAGE_KEY = 'PRODUCTION_LOGS_DATA';
const hasSupabaseConfig = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

// ======================
// HÀM CHUYỂN ĐỔI DỮ LIỆU
// ======================

const convertLogToDb = (log: ProductionLog) => {
  return {
    id: log.id,
    ngay_thang: log.ngay,
    may_san_xuat: log.may,
    du_an: log.maDuAn,
    khach_hang: log.tenDuAn,
    ban_ve_so: log.banVeSo,
    chi_tiet_so: log.ncSo,
    ten_chi_tiet: log.tenChiTiet,
    noi_dung_gia_cong: log.noiDung,
    so_luong_hoan_thanh: log.sanLuong,
    vat_lieu: log.vatLieu,
    nguyen_cong_so: log.ncSo,
    tool_entries: log.toolEntries,
    ca: log.ca,
    cp_may: log.chiPhiChayMay,
    cp_dao_cu: log.chiPhiDao,
    nguoi_van_hanh: log.nguoiVanHanh,
    nguoi_kiem_tra: log.nguoiKiemTra || '',
    tg_tren_ca: '',
    status: log.status,
    created_at: log.createdAt,
  };
};

const convertDbToLog = (dbItem: any): ProductionLog => {
  return {
    id: dbItem.id,
    ngay: dbItem.ngay_thang,
    may: dbItem.may_san_xuat,
    maDuAn: dbItem.du_an,
    tenDuAn: dbItem.khach_hang,
    banVeSo: dbItem.ban_ve_so,
    tenChiTiet: dbItem.ten_chi_tiet,
    noiDung: dbItem.noi_dung_gia_cong,
    kichThuoc: '',
    vatLieu: dbItem.vat_lieu,
    ncSo: dbItem.nguyen_cong_so,
    sanLuong: dbItem.so_luong_hoan_thanh,
    tgBdGa: '',
    tgKtGa: '',
    gioGa: 0,
    tgBdChay: '',
    tgKtChay: '',
    gioChay: 0,
    ca: dbItem.ca,
    nguoiVanHanh: dbItem.nguoi_van_hanh,
    nguoiKiemTra: dbItem.nguoi_kiem_tra || '',
    chiPhiGa: 0,
    chiPhiChayMay: dbItem.cp_may,
    chiPhiDao: dbItem.cp_dao_cu,
    toolEntries: dbItem.tool_entries || [],
    status: dbItem.status || 'pending',
    createdAt: dbItem.created_at,
  };
};

const formatDate = (value: any) => {
  if (!value) return '';
  if (typeof value === 'number') {
    const excelDate = XLSX.SSF.parse_date_code(value);
    return `${String(excelDate.d).padStart(2, '0')}/${String(excelDate.m).padStart(2, '0')}/${excelDate.y}`;
  }
  const str = String(value);
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return str;
};

const formatCurrency = (value: number) => {
  if (!value) return '0 đ';
  return value.toLocaleString('vi-VN') + ' đ';
};

// ======================
// COMPONENT CHÍNH
// ======================

export function ProductionReportPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ProductionLog | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilterStart, setDateFilterStart] = useState('');
  const [dateFilterEnd, setDateFilterEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [useFallback, setUseFallback] = useState(!hasSupabaseConfig);

  // Load dữ liệu
  const loadLogs = async () => {
    if (useFallback) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setLogs([]);
          return;
        }
        const parsed: any[] = JSON.parse(raw);
        const converted = parsed.map(item => ({
          ...item,
          chiPhiGa: item.chiPhiGa ?? item.tienGa ?? 0,
          chiPhiChayMay: item.chiPhiChayMay ?? item.tienChay ?? 0,
          chiPhiDao: item.chiPhiDao ?? 0,
          nguoiKiemTra: item.nguoiKiemTra || '',
        }));
        setLogs(converted);
      } catch (error) {
        console.error('Error loading logs:', error);
        setLogs([]);
      }
    } else {
      try {
        const { data, error } = await supabase
          .from('production_reports')
          .select('*')
          .order('ngay_thang', { ascending: false });
        
        if (error) throw error;
        
        const converted = (data || []).map(convertDbToLog);
        setLogs(converted);
      } catch (error) {
        console.error('Error loading from Supabase, falling back:', error);
        setUseFallback(true);
        loadLogs();
      }
    }
  };

  useEffect(() => {
    loadLogs();
    const onSynced = () => loadLogs();
    window.addEventListener('app-data-synced', onSynced);
    return () => window.removeEventListener('app-data-synced', onSynced);
  }, [useFallback]);

  const persistLogs = (updatedLogs: ProductionLog[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
    setLogs(updatedLogs);
    window.dispatchEvent(new Event('app-data-synced'));
  };

 // Kiểm tra quyền duyệt
const canApprove = (log: ProductionLog) => {
  const userRole = (user?.role as string) || '';
  const userName = user?.fullName || user?.name || '';
  
  // Admin và Quản lý xưởng có toàn quyền
  if (userRole === 'admin' || userRole === 'quan_ly_xuong') return true;
  
  // Tổ trưởng, Tổ phó, Nhóm trưởng chỉ duyệt được nhật ký do mình kiểm tra
  if ((userRole === 'to_truong' || userRole === 'to_pho' || userRole === 'nhom_truong') && log.nguoiKiemTra === userName) return true;
  
  return false;
};

  // Hàm duyệt nhật ký
  const handleApproveLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const log = logs.find(l => l.id === id);
    if (!log) return;
    
    if (!canApprove(log)) {
      toast.error('Bạn không có quyền duyệt nhật ký này');
      return;
    }
    
    const updatedLogs = logs.map(l => 
      l.id === id ? { ...l, status: 'approved' as const } : l
    );
    persistLogs(updatedLogs);
    toast.success('Đã duyệt nhật ký');
  };

  // CRUD Operations
  const handleAddLog = async (formData: any) => {
    const newLog: ProductionLog = {
      id: crypto.randomUUID(),
      ngay: formData.ngayThang,
      may: formData.maySanXuat,
      maDuAn: formData.duAn,
      tenDuAn: formData.tenDuAn,
      banVeSo: formData.banVeSo,
      tenChiTiet: formData.tenChiTiet,
      noiDung: formData.noiDungGiaCong,
      kichThuoc: '',
      vatLieu: formData.vatLieu,
      ncSo: formData.nguyenCongSo,
      sanLuong: formData.soLuongHoanThanh,
      tgBdGa: '',
      tgKtGa: '',
      gioGa: formData.gioGa || 0,
      tgBdChay: '',
      tgKtChay: '',
      gioChay: formData.gioChay || 0,
      ca: formData.ca,
      nguoiVanHanh: formData.nguoiVanHanh,
      nguoiKiemTra: formData.nguoiKiemTra || '',
      chiPhiGa: formData.chiPhiGa || 0,
      chiPhiChayMay: formData.chiPhiChayMay || 0,
      chiPhiDao: formData.chiPhiDao || 0,
      toolEntries: formData.toolEntries || [],
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    
    if (useFallback) {
      persistLogs([...logs, newLog]);
      setIsAddDialogOpen(false);
      setFormKey((k) => k + 1);
      toast.success('Thêm nhật ký thành công');
    } else {
      try {
        const dbItem = convertLogToDb(newLog);
        const { error } = await supabase
          .from('production_reports')
          .insert(dbItem);
        
        if (error) throw error;
        
        await loadLogs(); // Reload từ DB
        setIsAddDialogOpen(false);
        setFormKey((k) => k + 1);
        toast.success('Thêm nhật ký thành công');
      } catch (error) {
        console.error('Error adding to Supabase:', error);
        setUseFallback(true);
        persistLogs([...logs, newLog]);
        setIsAddDialogOpen(false);
        setFormKey((k) => k + 1);
        toast.success('Thêm nhật ký thành công (chế độ offline)');
      }
    }
  };

  const handleEditLog = async (formData: any) => {
    if (!selectedLog) return;
    
    const updatedLog: ProductionLog = {
      ...selectedLog,
      ngay: formData.ngayThang,
      may: formData.maySanXuat,
      maDuAn: formData.duAn,
      tenDuAn: formData.tenDuAn,
      banVeSo: formData.banVeSo,
      tenChiTiet: formData.tenChiTiet,
      noiDung: formData.noiDungGiaCong,
      sanLuong: formData.soLuongHoanThanh,
      vatLieu: formData.vatLieu,
      ncSo: formData.nguyenCongSo,
      ca: formData.ca,
      nguoiVanHanh: formData.nguoiVanHanh,
      nguoiKiemTra: formData.nguoiKiemTra || selectedLog.nguoiKiemTra,
      chiPhiChayMay: formData.cpMay || 0,
      chiPhiDao: formData.cpDaoCu || 0,
      toolEntries: formData.toolEntries || [],
      gioGa: formData.setupTimeEntries?.reduce((sum: number, entry: any) => sum + Number(entry.soGio), 0) || 0,
      gioChay: formData.workTimeEntries?.reduce((sum: number, entry: any) => sum + Number(entry.soGio), 0) || 0,
    };
    
    if (useFallback) {
      persistLogs(logs.map(l => l.id === selectedLog.id ? updatedLog : l));
      setIsEditDialogOpen(false);
      setSelectedLog(null);
      toast.success('Cập nhật nhật ký thành công');
    } else {
      try {
        const dbItem = convertLogToDb(updatedLog);
        const { error } = await supabase
          .from('production_reports')
          .update(dbItem)
          .eq('id', selectedLog.id);
        
        if (error) throw error;
        
        await loadLogs(); // Reload từ DB
        setIsEditDialogOpen(false);
        setSelectedLog(null);
        toast.success('Cập nhật nhật ký thành công');
      } catch (error) {
        console.error('Error updating to Supabase:', error);
        setUseFallback(true);
        persistLogs(logs.map(l => l.id === selectedLog.id ? updatedLog : l));
        setIsEditDialogOpen(false);
        setSelectedLog(null);
        toast.success('Cập nhật nhật ký thành công (chế độ offline)');
      }
    }
  };

  const handleDeleteLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const log = logs.find(l => l.id === id);
    if (log && log.status === 'approved' && !isAdmin) {
      toast.error('Không có quyền xóa nhật ký đã duyệt');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa nhật ký này?')) {
      if (useFallback) {
        persistLogs(logs.filter(l => l.id !== id));
        toast.success('Xóa nhật ký thành công');
      } else {
        try {
          const { error } = await supabase
            .from('production_reports')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          
          await loadLogs(); // Reload từ DB
          toast.success('Xóa nhật ký thành công');
        } catch (error) {
          console.error('Error deleting from Supabase:', error);
          setUseFallback(true);
          persistLogs(logs.filter(l => l.id !== id));
          toast.success('Xóa nhật ký thành công (chế độ offline)');
        }
      }
    }
  };

  // IMPORT EXCEL
const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setIsImporting(true);
  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet);

      const newLogs: ProductionLog[] = [];

      for (let i = 0; i < json.length; i++) {
        const item: any = json[i];
        
        let ngayRaw = item['Ngày'] || '';
        let ngay = '';
        if (ngayRaw) {
          const parts = ngayRaw.toString().split('/');
          if (parts.length === 3) {
            ngay = `${parts[2]}-${parts[1]}-${parts[0]}`;
          } else {
            ngay = ngayRaw;
          }
        }
        
        const may = item['Máy Sản Xuất'] || item['Máy'] || '';
        const maDuAn = item['Dự án'] || item['Mã dự án'] || '';
        const tenDuAn = item['Tên dự án'] || '';
        const banVeSo = item['Bản Vẽ Số'] || '';
        const tenChiTiet = item['Tên Chi Tiết'] || '';
        const noiDung = item['Nội dung Gia Công'] || '';
        const sanLuong = Number(item['SL HT'] || 0);
        const vatLieu = item['Vật Liệu'] || '';
        const ncSo = item['NC Số'] || '';
        
        let gioGa = Number(item['Tổng TG gá (h)'] || 0);
        let gioChay = Number(item['Tổng TG chạy (h)'] || 0);
        
        const ca = item['CA'] || '';
        const nguoiVanHanh = item['Người vận hành (MSNV)'] || '';
        const nguoiKiemTra = item['Người kiểm tra'] || '';
        
        const chiPhiChayMay = Number(String(item['Chi phí chạy máy (VND)'] || 0).replace(/[^0-9]/g, ''));
        let chiPhiDao = Number(String(item['Chi phí dao cụ (VND)'] || 0).replace(/[^0-9]/g, ''));
        
        const tenDao = item['Tên dao'] || '';
        const slCap = Number(item['SL cấp'] || 0);
        const slSuDung = Number(item['sử dụng'] || 0);
        const hong = Number(item['Hỏng'] || 0);
        const donVi = item['ĐV'] || 'cái';
        
        const toolEntries = [];
        if (tenDao) {
          toolEntries.push({
            tenDao: tenDao,
            slCap: slCap,
            slSuDung: slSuDung,
            hong: hong,
            donVi: donVi,
            donGia: chiPhiDao / (slSuDung || 1),
            thanhTien: chiPhiDao,
          });
        }
        
        if (maDuAn && ngay) {
          newLogs.push({
            id: crypto.randomUUID(),
            ngay: ngay,
            may: may,
            maDuAn: maDuAn,
            tenDuAn: tenDuAn,
            banVeSo: banVeSo,
            tenChiTiet: tenChiTiet,
            noiDung: noiDung,
            kichThuoc: '',
            vatLieu: vatLieu,
            ncSo: ncSo,
            sanLuong: sanLuong,
            tgBdGa: '',
            tgKtGa: '',
            gioGa: gioGa,
            tgBdChay: '',
            tgKtChay: '',
            gioChay: gioChay,
            ca: ca,
            nguoiVanHanh: nguoiVanHanh,
            nguoiKiemTra: nguoiKiemTra,
            chiPhiGa: 0,
            chiPhiChayMay: chiPhiChayMay,
            chiPhiDao: chiPhiDao,
            toolEntries: toolEntries,
            status: 'pending',
            createdAt: new Date().toISOString(),
          });
        }
      }
      
      if (newLogs.length > 0) {
        if (useFallback) {
          persistLogs([...logs, ...newLogs]);
        } else {
          const dbItems = newLogs.map(convertLogToDb);
          const { error } = await supabase
            .from('production_reports')
            .insert(dbItems);
          if (!error) {
            await loadLogs();
          }
        }
        toast.success(`Import thành công ${newLogs.length} nhật ký`);
      } else {
        toast.error('Không có dữ liệu hợp lệ');
      }
      
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Lỗi xử lý file Excel');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };  // Đóng reader.onload
  
  reader.readAsBinaryString(file);
};  

  // Export Excel
  const handleExportExcel = () => {
    const exportData = logs.map(log => ({
      'Ngày': formatDate(log.ngay),
      'Máy Sản Xuất': log.may,
      'Dự án': log.maDuAn,
      'Tên dự án': log.tenDuAn,
      'SL HT': log.sanLuong,
      'Giờ gá': log.gioGa,
      'Giờ chạy': log.gioChay,
      'Người vận hành': log.nguoiVanHanh,
      'Người kiểm tra': log.nguoiKiemTra,
      'Tên dao': log.toolEntries.map(t => t.tenDao).join(', '),
      'Chi phí dao': formatCurrency(log.chiPhiDao),
      'Trạng thái': log.status === 'approved' ? 'Đã duyệt' : log.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt',
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NhatKySanXuat');
    XLSX.writeFile(wb, `nhat_ky_san_xuat_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  // Export 1 log chi tiết
  const exportSingleLogToExcel = (log: ProductionLog | null) => {
    if (!log) return;
    
    const exportData: any = {
      'Ngày': formatDate(log.ngay),
      'Máy Sản Xuất': log.may,
      'Mã Dự Án': log.maDuAn,
      'Tên Dự Án': log.tenDuAn,
      'Bản Vẽ Số': log.banVeSo,
      'Chi Tiết Số': log.ncSo,
      'Tên Chi Tiết': log.tenChiTiet,
      'Nội dung Gia Công': log.noiDung,
      'Vật Liệu': log.vatLieu,
      'Số Lượng': log.sanLuong,
      'Giờ Gá': log.gioGa,
      'Giờ Chạy': log.gioChay,
      'Người Vận Hành': log.nguoiVanHanh,
      'Người Kiểm Tra': log.nguoiKiemTra,
      'Trạng Thái': log.status === 'approved' ? 'Đã duyệt' : log.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt',
    };
    
    if (log.toolEntries && log.toolEntries.length > 0) {
      log.toolEntries.forEach((tool, idx) => {
        exportData[`Tên dao ${idx + 1}`] = tool.tenDao;
        exportData[`SL cấp ${idx + 1}`] = tool.slCap;
        exportData[`SL sử dụng ${idx + 1}`] = tool.slSuDung;
        exportData[`SL hỏng ${idx + 1}`] = tool.hong;
        exportData[`Đơn vị ${idx + 1}`] = tool.donVi;
      });
    }
    
    const ws = XLSX.utils.json_to_sheet([exportData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `NhatKy_${log.maDuAn}_${formatDate(log.ngay)}`);
    XLSX.writeFile(wb, `nhat_ky_${log.maDuAn}_${formatDate(log.ngay)}.xlsx`);
    toast.success('Đã tải xuống file Excel');
  };

  // Download template
  const handleDownloadTemplate = () => {
    const template = [{
      'Ngày': '15/11/2024',
      'Máy Sản Xuất': 'Máy CNC 1',
      'Dự án': 'DA001',
      'Tên dự án': 'Dự án A',
      'Bản Vẽ Số': 'BV-001',
      'Tên Chi Tiết': 'Chi tiết 1',
      'Nội dung Gia Công': 'Gia công thô',
      'Kích thước': '100x50mm',
      'SL HT': 100,
      'Vật Liệu': 'Thép SS400',
      'NC Số': 'NC001',
      'Tên dao': 'Dao phay',
      'SL cấp': 2,
      'sử dụng': 2,
      'Hỏng': 0,
      'ĐV': 'cái',
      'TG BĐgá': '08:00',
      'TG KT gá': '09:30',
      'Tổng TG gá (h)': 1.5,
      'TG BĐ. chạy': '09:30',
      'TG KT. chạy': '14:00',
      'Tổng TG chạy (h)': 4.5,
      'CA': 'Ca 1',
      'Người vận hành (MSNV)': 'NV001',
      'Người kiểm tra': 'NV002',
      'Chi phí gá (VND)': 500000,
      'Chi phí chạy máy (VND)': 3000000,
      'Chi phí dao cụ (VND)': 700000,
    }];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_Nhat_Ky');
    XLSX.writeFile(wb, 'mau_nhap_nhat_ky_san_xuat.xlsx');
    toast.success('Đã tải file mẫu');
  };

 // Trong filteredLogs, sửa dòng 663 và 665:
const filteredLogs = useMemo(() => {
  const userRole = (user?.role as string) || '';
  const userName = user?.fullName || user?.name || '';
  
  return logs.filter(log => {
    const searchMatch = !searchTerm || 
      log.maDuAn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.tenDuAn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.may?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.toolEntries.some(tool => tool.tenDao?.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const statusMatch = statusFilter === 'all' || log.status === statusFilter;
    const logDate = new Date(log.ngay);
    const startDate = dateFilterStart ? new Date(dateFilterStart) : null;
    const endDate = dateFilterEnd ? new Date(dateFilterEnd) : null;
    const dateMatch = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
    
    // Phân quyền - dùng as string để ép kiểu
    let permissionMatch = false;
    if (userRole === 'admin' || userRole === 'quan_ly_xuong') {
      permissionMatch = true;
    } else if (userRole === 'to_truong' || userRole === 'to_pho' || userRole === 'nhom_truong') {
      permissionMatch = log.nguoiKiemTra === userName;
    } else {
      permissionMatch = log.nguoiVanHanh === userName;
    }
    
    return searchMatch && statusMatch && dateMatch && permissionMatch;
  });
}, [logs, searchTerm, statusFilter, dateFilterStart, dateFilterEnd, user]);

  const stats = useMemo(() => ({
    total: logs.length,
    approved: logs.filter(l => l.status === 'approved').length,
    pending: logs.filter(l => l.status === 'pending').length,
    rejected: logs.filter(l => l.status === 'rejected').length,
  }), [logs]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600">Đã duyệt</Badge>;
      case 'pending': return <Badge variant="secondary">Chờ duyệt</Badge>;
      case 'rejected': return <Badge variant="destructive">Từ chối</Badge>;
      default: return <Badge variant="outline">Không xác định</Badge>;
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilterStart('');
    setDateFilterEnd('');
    setShowFilters(false);
  };

  // Format máy cho hiển thị
  const formatMay = (may: string) => {
    if (!may) return '---';
    if (may.length > 30) return may.substring(0, 27) + '...';
    return may;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/trang-chu')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nhật ký Sản Xuất</h1>
            <p className="text-gray-600">Nơi nhập, quản lý và chỉnh sửa dữ liệu gốc {useFallback && '(chế độ offline)'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-between">
          <div className="flex flex-wrap gap-3">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm tay
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Thêm nhật ký sản xuất mới</DialogTitle></DialogHeader>
                <ProductionForm 
                  key={formKey} 
                  onSubmit={handleAddLog} 
                  onCancel={() => setIsAddDialogOpen(false)} 
                />
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={() => document.getElementById('excel-import')?.click()} disabled={isImporting}>
              <Upload className="w-4 h-4 mr-2" />
              {isImporting ? 'Đang import...' : 'Import Excel'}
            </Button>
            <input id="excel-import" type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />

            <Button variant="outline" onClick={handleDownloadTemplate}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Tải file mẫu
            </Button>

            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          </div>

          <Badge variant="secondary" className="h-10 px-4 text-sm">
            Tổng: {stats.total} nhật ký
          </Badge>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm font-medium text-gray-600">Tổng nhật ký</p><p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm font-medium text-gray-600">Đã duyệt</p><p className="text-3xl font-bold text-green-600 mt-2">{stats.approved}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm font-medium text-gray-600">Chờ duyệt</p><p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-center"><p className="text-sm font-medium text-gray-600">Từ chối</p><p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected}</p></div></CardContent></Card>
        </div>

        {/* Filter */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Bộ lọc</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" /> {showFilters ? 'Ẩn' : 'Hiện'}
            </Button>
          </CardHeader>
          {showFilters && (
            <CardContent className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div><Label>Tìm kiếm</Label><Input placeholder="Máy, dự án, tên dao..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <div><Label>Trạng thái</Label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="approved">Đã duyệt</SelectItem><SelectItem value="pending">Chờ duyệt</SelectItem><SelectItem value="rejected">Từ chối</SelectItem></SelectContent></Select></div>
                <div><Label>Từ ngày</Label><Input type="date" value={dateFilterStart} onChange={(e) => setDateFilterStart(e.target.value)} /></div>
                <div><Label>Đến ngày</Label><Input type="date" value={dateFilterEnd} onChange={(e) => setDateFilterEnd(e.target.value)} /></div>
              </div>
              {(searchTerm || statusFilter !== 'all' || dateFilterStart || dateFilterEnd) && (
                <Button variant="outline" size="sm" onClick={clearFilters}><X className="w-4 h-4 mr-2" />Xóa bộ lọc</Button>
              )}
            </CardContent>
          )}
        </Card>

        {/* Data Table */}
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-gray-800">Danh sách nhật ký sản xuất</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm nhanh..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-64 h-9 text-sm bg-white"
                  />
                </div>
                <Badge variant="secondary" className="h-9 px-4 bg-white shadow-sm">
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                  {filteredLogs.length} nhật ký
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                    <TableHead className="font-semibold text-gray-700">Ngày</TableHead>
                    <TableHead className="font-semibold text-gray-700">Máy Sản Xuất</TableHead>
                    <TableHead className="font-semibold text-gray-700">Mã Dự Án</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tên dự án</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">SL</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Giờ gá</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">Giờ chạy</TableHead>
                    <TableHead className="font-semibold text-gray-700">Người vận hành</TableHead>
                    <TableHead className="font-semibold text-gray-700">Người kiểm tra</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tên dao</TableHead>
                    <TableHead className="font-semibold text-gray-700">Trạng thái</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <FileSpreadsheet className="w-12 h-12" />
                          <p className="text-lg">Chưa có dữ liệu</p>
                          <p className="text-sm">Hãy thêm nhật ký sản xuất mới</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log, index) => {
                      const canEdit = log.status !== 'approved' || isAdmin;
                      const canDelete = log.status !== 'approved' || isAdmin;
                      const showApprove = log.status === 'pending' && canApprove(log);
                      
                      // Lấy danh sách tên dao
                      const daoList = log.toolEntries.map(t => t.tenDao).join(', ');
                      
                      return (
                        <TableRow 
                          key={log.id}
                          className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          }`}
                          onClick={() => {
                            setSelectedLog(log);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <TableCell className="font-medium">{formatDate(log.ngay)}</TableCell>
                          <TableCell><Badge variant="outline" className="bg-gray-50 max-w-[150px] truncate" title={log.may}>{formatMay(log.may)}</Badge></TableCell>
                          <TableCell><code className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono font-semibold">{log.maDuAn}</code></TableCell>
                          <TableCell><div className="max-w-[150px]"><p className="text-sm font-medium truncate" title={log.tenDuAn}>{log.tenDuAn}</p></div></TableCell>
                          <TableCell className="text-center"><span className="font-mono font-semibold text-gray-700">{log.sanLuong?.toLocaleString() || 0}</span></TableCell>
                          <TableCell className="text-center"><span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-md"><span className="text-amber-600">⏱</span><span className="font-mono text-sm">{log.gioGa}h</span></span></TableCell>
                          <TableCell className="text-center"><span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 rounded-md"><span className="text-green-600">▶</span><span className="font-mono text-sm">{log.gioChay}h</span></span></TableCell>
                          <TableCell><div className="flex items-center gap-1.5"><div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center"><span className="text-xs font-bold text-purple-600">{log.nguoiVanHanh?.charAt(0) || 'NV'}</span></div><span className="text-sm truncate max-w-[100px]" title={log.nguoiVanHanh}>{log.nguoiVanHanh}</span></div></TableCell>
                          <TableCell><span className="text-sm">{log.nguoiKiemTra || '---'}</span></TableCell>
                          <TableCell><span className="text-sm truncate max-w-[120px] block" title={daoList}>{daoList || '---'}</span></TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              {showApprove && (
                                <Button variant="ghost" size="sm" onClick={(e) => handleApproveLog(log.id, e)} className="text-green-600 hover:bg-green-100" title="Duyệt">
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedLog(log); setIsViewDialogOpen(true); }} className="hover:bg-blue-100 hover:text-blue-700" title="Xem chi tiết">
                                <Eye className="w-4 h-4" />
                              </Button>
                              {canEdit && (
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedLog(log); setIsEditDialogOpen(true); }} className="hover:bg-amber-100 hover:text-amber-700" title="Chỉnh sửa">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button variant="ghost" size="sm" onClick={(e) => handleDeleteLog(log.id, e)} className="hover:bg-red-100 hover:text-red-700 text-red-600" title="Xóa">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Hiển thị tổng quan */}
            {filteredLogs.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t text-sm text-gray-600">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Đã duyệt: {filteredLogs.filter(l => l.status === 'approved').length}</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span>Chờ duyệt: {filteredLogs.filter(l => l.status === 'pending').length}</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div><span>Từ chối: {filteredLogs.filter(l => l.status === 'rejected').length}</span></div>
                </div>
                <div className="flex items-center gap-2"><span>Tổng số: </span><span className="font-bold text-gray-800">{filteredLogs.length}</span><span>nhật ký</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Dialog - Chi tiết */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle>CHI TIẾT NHẬT KÝ SẢN XUẤT</DialogTitle>
              <Button variant="outline" size="sm" onClick={() => exportSingleLogToExcel(selectedLog)}>
                <Download className="w-4 h-4 mr-2" />
                Tải xuống
              </Button>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-4">
                {/* Thông tin chính - 2 cột */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex"><span className="w-32 text-gray-600">Ngày tháng:</span><span className="font-medium">{formatDate(selectedLog.ngay)}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Máy Sản Xuất:</span><span className="font-medium">{selectedLog.may || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Mã Dự Án:</span><span className="font-medium text-blue-600">{selectedLog.maDuAn || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Tên Dự Án:</span><span className="font-medium">{selectedLog.tenDuAn || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Bản Vẽ Số:</span><span>{selectedLog.banVeSo || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Chi Tiết Số:</span><span>{selectedLog.ncSo || '---'}</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex"><span className="w-32 text-gray-600">Tên Chi Tiết:</span><span>{selectedLog.tenChiTiet || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Nội dung Gia Công:</span><span>{selectedLog.noiDung || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Vật Liệu:</span><span>{selectedLog.vatLieu || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Nguyên Công Số:</span><span>{selectedLog.ncSo || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Người Vận Hành:</span><span>{selectedLog.nguoiVanHanh || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Người Kiểm Tra:</span><span>{selectedLog.nguoiKiemTra || '---'}</span></div>
                  </div>
                </div>

                {/* Số lượng và thời gian */}
                <div className="grid grid-cols-3 gap-4 border-t pt-4">
                  <div className="text-center"><p className="text-gray-600 text-sm">Số lượng</p><p className="text-xl font-bold">{selectedLog.sanLuong?.toLocaleString() || 0}</p></div>
                  <div className="text-center"><p className="text-gray-600 text-sm">Giờ gá</p><p className="text-xl font-bold">{selectedLog.gioGa}h</p></div>
                  <div className="text-center"><p className="text-gray-600 text-sm">Giờ chạy</p><p className="text-xl font-bold">{selectedLog.gioChay}h</p></div>
                </div>

                {/* Thời gian chi tiết */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <h3 className="font-semibold mb-2">Thời gian gá phôi</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600">Giờ bắt đầu:</span><span>{selectedLog.tgBdGa || '--:--'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Giờ kết thúc:</span><span>{selectedLog.tgKtGa || '--:--'}</span></div>
                      <div className="flex justify-between font-medium"><span>Số giờ:</span><span>{selectedLog.gioGa}h</span></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Thời gian gia công</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600">Giờ bắt đầu:</span><span>{selectedLog.tgBdChay || '--:--'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Giờ kết thúc:</span><span>{selectedLog.tgKtChay || '--:--'}</span></div>
                      <div className="flex justify-between font-medium"><span>Số giờ:</span><span>{selectedLog.gioChay}h</span></div>
                    </div>
                  </div>
                </div>

                {/* Thông tin Dao cụ */}
                {selectedLog.toolEntries && selectedLog.toolEntries.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Thông tin Dao Cụ</h3>
                    <div className="overflow-x-auto">
                      <Table className="text-sm">
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead>Tên Dao</TableHead>
                            <TableHead className="text-center">SL Cấp</TableHead>
                            <TableHead className="text-center">SL Sử Dụng</TableHead>
                            <TableHead className="text-center">SL Hỏng</TableHead>
                            <TableHead>Đơn Vị</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedLog.toolEntries.map((tool, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{tool.tenDao}</TableCell>
                              <TableCell className="text-center">{tool.slCap}</TableCell>
                              <TableCell className="text-center">{tool.slSuDung}</TableCell>
                              <TableCell className="text-center">{tool.hong}</TableCell>
                              <TableCell>{tool.donVi}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {/* Trạng thái */}
                <div className="flex justify-between items-center border-t pt-4 text-sm text-gray-500">
                  <div>Trạng thái: {getStatusBadge(selectedLog.status)}</div>
                  <div>Ngày tạo: {new Date(selectedLog.createdAt).toLocaleString('vi-VN')}</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Chỉnh sửa nhật ký sản xuất</DialogTitle></DialogHeader>
            {selectedLog && (
              <ProductionForm 
                key={`edit-${selectedLog.id}`} 
                initialData={selectedLog} 
                onSubmit={handleEditLog} 
                onCancel={() => setIsEditDialogOpen(false)} 
              />
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

export default ProductionReportPage;