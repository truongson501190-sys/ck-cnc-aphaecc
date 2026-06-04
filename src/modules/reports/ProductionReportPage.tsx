
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
import { Plus, Filter, X, ArrowLeft, Upload, Download, Edit, Eye, Trash2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { ProductionForm } from './ProductionForm';
import { useAuth } from '@/hooks/useAuth';
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
  chiPhiGa: number;
  chiPhiChayMay: number;
  chiPhiDao: number;
  toolEntries: ToolEntry[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
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
    nguoi_kiem_tra: '',
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
    chiPhiGa: 0,
    chiPhiChayMay: dbItem.cp_may,
    chiPhiDao: dbItem.cp_dao_cu,
    toolEntries: dbItem.tool_entries || [],
    status: dbItem.status || 'pending',
    createdAt: dbItem.created_at,
  };
};

const convertTimeToHours = (timeStr: string): number => {
  if (!timeStr) return 0;
  if (typeof timeStr === 'number') return timeStr;
  
  const str = String(timeStr);
  if (str.includes(':')) {
    const parts = str.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
    return hours + minutes / 60 + seconds / 3600;
  }
  return parseFloat(str) || 0;
};

const formatCurrency = (value: number) => {
  if (!value) return '0 đ';
  return value.toLocaleString('vi-VN') + ' đ';
};

// Hiển thị DD/MM/YYYY
const formatDate = (value: any) => {
  if (!value) return '';

  // Excel serial date
  if (typeof value === 'number') {
    const excelDate = XLSX.SSF.parse_date_code(value);

    return `${String(excelDate.d).padStart(2, '0')}/${String(excelDate.m).padStart(2, '0')}/${excelDate.y}`;
  }

  const str = String(value);

  // YYYY-MM-DD -> DD/MM/YYYY
  if (str.includes('-')) {
    const parts = str.split('-');

    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  return str;
};

// Lưu DB dạng YYYY-MM-DD
const convertToISODate = (value: any) => {
  if (!value) return '';

  // Excel serial number
  if (typeof value === 'number') {
    const excelDate = XLSX.SSF.parse_date_code(value);

    return `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
  }

  const str = String(value);

  if (str.includes('/')) {
    const parts = str.split('/');

    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  return str;
};

// ======================
// COMPONENT CHÍNH
// ======================

export function ProductionReportPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
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
          }));
          setLogs(converted);
        } catch (fallbackError) {
          console.error('Error loading fallback logs:', fallbackError);
          setLogs([]);
        }
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

  // CRUD Operations
  const handleAddLog = async (logData: any) => {
    const newLog: ProductionLog = {
      ...logData,
      id: crypto.randomUUID(),
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
        
        persistLogs([...logs, newLog]);
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

  const handleEditLog = async () => {
    if (!selectedLog) return;
    
    if (useFallback) {
      persistLogs(logs.map(l => l.id === selectedLog.id ? selectedLog : l));
      setIsEditDialogOpen(false);
      setSelectedLog(null);
      loadLogs();
      toast.success('Cập nhật nhật ký thành công');
    } else {
      try {
        const dbItem = convertLogToDb(selectedLog);
        const { error } = await supabase
          .from('production_reports')
          .update(dbItem)
          .eq('id', selectedLog.id);
        
        if (error) throw error;
        
        persistLogs(logs.map(l => l.id === selectedLog.id ? selectedLog : l));
        setIsEditDialogOpen(false);
        setSelectedLog(null);
        loadLogs();
        toast.success('Cập nhật nhật ký thành công');
      } catch (error) {
        console.error('Error updating to Supabase:', error);
        setUseFallback(true);
        persistLogs(logs.map(l => l.id === selectedLog.id ? selectedLog : l));
        setIsEditDialogOpen(false);
        setSelectedLog(null);
        loadLogs();
        toast.success('Cập nhật nhật ký thành công (chế độ offline)');
      }
    }
  };

  const handleDeleteLog = async (id: string) => {
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
          
          persistLogs(logs.filter(l => l.id !== id));
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

  // ======================
  // IMPORT EXCEL (26 CỘT)
  // ======================

const handleImportExcel = (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const file = event.target.files?.[0];

  if (!file) return;

  setIsImporting(true);

  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const data = e.target?.result;

      const workbook = XLSX.read(data, {
        type: 'binary',
      });

      const sheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const rows: any[] =
        XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          defval: '',
        });

      if (!rows.length) {
        toast.error('File Excel không có dữ liệu');
        return;
      }

      const excelDateToISO = (
        value: any
      ): string => {
        if (!value) return '';

        if (typeof value === 'number') {
          const date = new Date(
            (value - 25569) *
              86400 *
              1000
          );

          return date
            .toISOString()
            .split('T')[0];
        }

        const str = String(value).trim();

        if (str.includes('/')) {
          const [dd, mm, yyyy] =
            str.split('/');

          return `${yyyy}-${mm}-${dd}`;
        }

        return str;
      };

      const parseNumber = (
        value: any
      ): number => {
        if (
          value === undefined ||
          value === null
        )
          return 0;

        const cleaned = String(value)
          .replace(/,/g, '')
          .replace(/[^\d.-]/g, '');

        return Number(cleaned) || 0;
      };

      const importedLogs: ProductionLog[] =
        [];

      rows.forEach((row) => {
        const ngay =
          excelDateToISO(row['Ngày']);

        if (!ngay) return;

        const gioGa =
          parseNumber(
            row['Tổng TG gá (h)']
          ) || 0;

        const gioChay =
          parseNumber(
            row['Tổng TG chạy (h)']
          ) || 0;

        const chiPhiMay =
          parseNumber(
            row[
              'Chi phí máy công cụ(VND)'
            ]
          );

        const chiPhiDao =
          parseNumber(
            row[
              'Chi phí dao cụ (VND)'
            ]
          );

        const log: ProductionLog = {
          id: crypto.randomUUID(),

          ngay,

          may:
            row['Máy Sản Xuất'] || '',

          maDuAn:
            row['Dự án'] || '',

          tenDuAn:
            row['Tên dự án'] || '',

          banVeSo:
            row['Bản Vẽ Số'] || '',

          tenChiTiet:
            row['Tên Chi Tiết'] || '',

          noiDung:
            row[
              'Nội dung Gia Công'
            ] || '',

          kichThuoc:
            row['Kích thước'] || '',

          vatLieu:
            row['Vật Liệu'] || '',

          ncSo:
            String(
              row['NC Số'] || ''
            ),

          sanLuong:
            parseNumber(
              row['SL HT']
            ),

          tgBdGa:
            row[
              'Thời gian bắt đầu gá'
            ] || '',

          tgKtGa:
            row[
              'Thời gian kết thúc gá'
            ] || '',

          gioGa,

          tgBdChay:
            row[
              'Thời gian bắt đầu chạy'
            ] || '',

          tgKtChay:
            row[
              'Thời gian kết thúc chạy'
            ] || '',

          gioChay,

          ca: row['CA'] || '',

          nguoiVanHanh:
            row[
              'Người vận hành (MSNV)'
            ] || '',

          chiPhiGa: 0,

          chiPhiChayMay:
            chiPhiMay,

          chiPhiDao,

          toolEntries: [
            {
              tenDao:
                row['Tên dao'] ||
                '',

              slCap:
                parseNumber(
                  row['SL cấp']
                ),

              slSuDung:
                parseNumber(
                  row['sử dụng']
                ),

              hong:
                parseNumber(
                  row['Hỏng']
                ),

              donVi:
                row['ĐV'] ||
                'Cái',

              donGia: 0,

              thanhTien:
                chiPhiDao,
            },
          ],

          status: 'pending',

          createdAt:
            new Date().toISOString(),
        };

        importedLogs.push(log);
      });

      const oldKeys = new Set(
        logs.map(
          (x) =>
            `${x.ngay}_${x.may}_${x.maDuAn}_${x.ncSo}`
        )
      );

      const newLogs =
        importedLogs.filter(
          (x) =>
            !oldKeys.has(
              `${x.ngay}_${x.may}_${x.maDuAn}_${x.ncSo}`
            )
        );

      if (!newLogs.length) {
        toast.warning(
          'Dữ liệu đã tồn tại'
        );

        return;
      }

      if (useFallback) {
        persistLogs([...logs, ...newLogs]);
      } else {
        const dbItems = newLogs.map(convertLogToDb);
        const { error } = await supabase
          .from('production_reports')
          .insert(dbItems);
        
        if (error) {
          console.error('Error importing to Supabase:', error);
          setUseFallback(true);
        }
        
        persistLogs([...logs, ...newLogs]);
      }

      toast.success(
        `Import thành công ${newLogs.length} dòng`
      );
    } catch (error) {
      console.error(error);

      toast.error(
        'Lỗi import Excel'
      );
    } finally {
      setIsImporting(false);

      event.target.value = '';
    }
  };

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
      'Chi phí gá': formatCurrency(log.chiPhiGa),
      'Chi phí chạy máy': formatCurrency(log.chiPhiChayMay),
      'Chi phí dao': formatCurrency(log.chiPhiDao),
      'Trạng thái': log.status === 'approved' ? 'Đã duyệt' : log.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt',
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NhatKySanXuat');
    XLSX.writeFile(wb, `nhat_ky_san_xuat_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Xuất Excel thành công');
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

  // Filter
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const searchMatch = !searchTerm || 
        log.maDuAn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.tenDuAn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.may?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusMatch = statusFilter === 'all' || log.status === statusFilter;
      const logDate = new Date(log.ngay);
      const startDate = dateFilterStart ? new Date(dateFilterStart) : null;
      const endDate = dateFilterEnd ? new Date(dateFilterEnd) : null;
      const dateMatch = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
      
      return searchMatch && statusMatch && dateMatch;
    });
  }, [logs, searchTerm, statusFilter, dateFilterStart, dateFilterEnd]);

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
                <div><Label>Tìm kiếm</Label><Input placeholder="Máy, dự án..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
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
        <Card>
          <CardHeader><CardTitle className="flex items-center justify-between"><span>Danh sách nhật ký</span><Badge variant="secondary">{filteredLogs.length} nhật ký</Badge></CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Máy</TableHead>
                    <TableHead>Mã dự án</TableHead>
                    <TableHead>Tên dự án</TableHead>
                    <TableHead>SL</TableHead>
                    <TableHead>Giờ gá</TableHead>
                    <TableHead>Giờ chạy</TableHead>
                    <TableHead>Người vận hành</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8">Chưa có dữ liệu</TableCell></TableRow>
                  ) : (
                    filteredLogs.map((log) => {
                      const canEdit = log.status !== 'approved' || isAdmin;
                      const canDelete = log.status !== 'approved' || isAdmin;
                      return (
                        <TableRow key={log.id}>
                          <TableCell>{formatDate(log.ngay)}</TableCell>
                          <TableCell>{log.may}</TableCell>
                          <TableCell>{log.maDuAn}</TableCell>
                          <TableCell>{log.tenDuAn}</TableCell>
                          <TableCell className="text-center">{log.sanLuong}</TableCell>
                          <TableCell className="text-center">{log.gioGa}h</TableCell>
                          <TableCell className="text-center">{log.gioChay}h</TableCell>
                          <TableCell>{log.nguoiVanHanh}</TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedLog(log); setIsViewDialogOpen(true); }}><Eye className="w-4 h-4" /></Button>
                            {canEdit && <Button variant="ghost" size="sm" onClick={() => { setSelectedLog(log); setIsEditDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>}
                            {canDelete && <Button variant="ghost" size="sm" onClick={() => handleDeleteLog(log.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Chi tiết nhật ký sản xuất</DialogTitle></DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Ngày</Label><p className="font-medium">{formatDate(selectedLog.ngay)}</p></div>
                  <div><Label>Máy</Label><p className="font-medium">{selectedLog.may}</p></div>
                  <div><Label>Mã dự án</Label><p className="font-medium">{selectedLog.maDuAn}</p></div>
                  <div><Label>Tên dự án</Label><p className="font-medium">{selectedLog.tenDuAn}</p></div>
                  <div><Label>Bản vẽ số</Label><p className="font-medium">{selectedLog.banVeSo || '---'}</p></div>
                  <div><Label>Tên chi tiết</Label><p className="font-medium">{selectedLog.tenChiTiet || '---'}</p></div>
                  <div><Label>Vật liệu</Label><p className="font-medium">{selectedLog.vatLieu || '---'}</p></div>
                  <div><Label>Số lượng</Label><p className="font-medium">{selectedLog.sanLuong}</p></div>
                  <div><Label>Giờ gá</Label><p className="font-medium">{selectedLog.gioGa} h</p></div>
                  <div><Label>Giờ chạy</Label><p className="font-medium">{selectedLog.gioChay} h</p></div>
                  <div><Label>Người vận hành</Label><p className="font-medium">{selectedLog.nguoiVanHanh}</p></div>
                  <div><Label>Chi phí gá</Label><p className="font-medium text-amber-600">{formatCurrency(selectedLog.chiPhiGa)}</p></div>
                  <div><Label>Chi phí chạy máy</Label><p className="font-medium text-blue-600">{formatCurrency(selectedLog.chiPhiChayMay)}</p></div>
                  <div><Label>Chi phí dao cụ</Label><p className="font-medium text-emerald-600">{formatCurrency(selectedLog.chiPhiDao)}</p></div>
                  <div><Label>Trạng thái</Label><div>{getStatusBadge(selectedLog.status)}</div></div>
                </div>
                {selectedLog.toolEntries.length > 0 && (
                  <div>
                    <Label className="font-bold">Dao cụ sử dụng</Label>
                    <Table className="mt-2">
                      <TableHeader><TableRow><TableHead>Tên dao</TableHead><TableHead>SL cấp</TableHead><TableHead>SL dùng</TableHead><TableHead>Hỏng</TableHead><TableHead>ĐVT</TableHead><TableHead>Thành tiền</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {selectedLog.toolEntries.map((tool, idx) => (
                          <TableRow key={idx}><TableCell>{tool.tenDao}</TableCell><TableCell>{tool.slCap}</TableCell><TableCell>{tool.slSuDung}</TableCell><TableCell className="text-red-600">{tool.hong}</TableCell><TableCell>{tool.donVi}</TableCell><TableCell>{formatCurrency(tool.thanhTien)}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
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
