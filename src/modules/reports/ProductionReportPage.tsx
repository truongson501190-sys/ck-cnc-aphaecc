// src/pages/ProductionReportPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Filter, X, ArrowLeft, Upload, Download, Edit, Eye, Trash2, FileSpreadsheet, Search, 
  CheckCircle, Loader2, CheckSquare, XSquare
} from 'lucide-react';
import { toast } from 'sonner';
import ProductionForm from './ProductionForm';
import { supabase } from '@/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { buildProductionReportDbPayload, buildProductionReportStatusUpdatePayload, mapReportFromDb, parseImportedToolEntries } from '@/lib/reportSyncMapping';

// ====================== TYPES ======================
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
  ngayThang: string;
  maySanXuat: string;
  duAn: string;
  khach_hang: string;
  banVeSo: string;
  chiTietSo: string;
  tenChiTiet: string;
  noiDungGiaCong: string;
  soLuongHoanThanh: number;
  vatLieu: string;
  nguyenCongSo: string;
  toolEntries: ToolEntry[];
  ca: string;
  cpMay?: number;
  cpDaoCu?: number;
  nguoiVanHanh: string;
  nguoiKiemTra: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  updated_at?: string;
  setup_time_entries?: Array<{ start?: string; end?: string; hours?: number }>;
  work_time_entries?: Array<{ start?: string; end?: string; hours?: number }>;
  setupTimeEntries?: Array<{ thoiGianBatDau?: string; thoiGianKetThuc?: string; soGio?: number }>;
  workTimeEntries?: Array<{ thoiGianBatDau?: string; thoiGianKetThuc?: string; soGio?: number }>;
  tgGia_BatDau?: string;
  tgGiaBatDau?: string;
  tgGia_KetThuc?: string;
  tgGiaKetThuc?: string;
  soGioGia?: number;
  gioGa?: number;
  gio_ga?: number;
  tgChay_BatDau?: string;
  tgChayBatDau?: string;
  tgChay_KetThuc?: string;
  tgChayKetThuc?: string;
  soGioChay?: number;
  gioChay?: number;
  gio_chay?: number;
  tgGaPhoi?: string;
  tgTrenCa?: string;
  chiPhiGa?: number;
  chi_phi_ga?: number;
  chiPhiChayMay?: number;
  chi_phi_chay_may?: number;
  chiPhiDao?: number;
  chi_phi_dao?: number;
}

// ====================== COMPONENT MODAL CUSTOM ======================
interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

const CustomModal: React.FC<CustomModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'max-w-4xl',
  className = ''
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div className={`bg-white rounded-lg shadow-2xl ${maxWidth} w-full max-h-[90vh] overflow-hidden ${className}`}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            {typeof title === 'string' ? (
              <h2 className="text-xl font-semibold">{title}</h2>
            ) : (
              title
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 ml-4"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// ====================== HÀM TIỆN ÍCH ======================
const formatDate = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'number') {
    const excelDate = XLSX.SSF.parse_date_code(value);
    return `${String(excelDate.d).padStart(2, '0')}/${String(excelDate.m).padStart(2, '0')}/${excelDate.y}`;
  }
  const str = String(value);
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return str;
};

const parseExcelDate = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const str = String(value);
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return str;
};

const formatCurrency = (value?: number): string => {
  if (!value) return '0 đ';
  return value.toLocaleString('vi-VN') + ' đ';
};

const formatTime24h = (timeVal: any): string => {
  if (timeVal === null || timeVal === undefined) return '';
  
  if (typeof timeVal === 'number') {
    const totalMinutes = timeVal * 24 * 60;
    let hours = Math.floor(totalMinutes / 60);
    let minutes = Math.round(totalMinutes % 60);
    if (minutes === 60) {
      minutes = 0;
      hours += 1;
    }
    hours %= 24;
    return formatTimeParts(hours, minutes);
  }
  
  const timeStr = String(timeVal).trim();
  if (!timeStr) return '';
  
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr)) {
    return timeStr;
  }

  const parsedTime = parseClockTime(timeStr);
  if (parsedTime) {
    return formatTimeParts(parsedTime.hours, parsedTime.minutes);
  }

  const numericTime = parseNumericTime(timeStr);
  if (numericTime) {
    return formatTimeParts(numericTime.hours, numericTime.minutes);
  }
  
  return timeStr;
};

const getStatusLabel = (status?: string): string => {
  switch (status) {
    case 'approved':
      return 'Đã duyệt';
    case 'rejected':
      return 'Từ chối';
    case 'pending':
    default:
      return 'Chờ duyệt';
  }
};

const getStatusBadge = (status?: string): React.ReactNode => {
  switch (status) {
    case 'approved': return <Badge className="bg-green-600">Đã duyệt</Badge>;
    case 'pending': return <Badge variant="secondary">Chờ duyệt</Badge>;
    case 'rejected': return <Badge variant="destructive">Từ chối</Badge>;
    default: return <Badge variant="outline">Không xác định</Badge>;
  }
};

const formatTimeParts = (hours: number, minutes: number): string => {
  const safeHours = Math.max(0, Math.min(23, hours));
  const safeMinutes = Math.max(0, Math.min(59, minutes));
  return `${String(safeHours).padStart(2, '0')}:${String(safeMinutes).padStart(2, '0')}`;
};

const parseClockTime = (timeStr: string): { hours: number; minutes: number } | null => {
  const hhmmMatch = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
  if (hhmmMatch) {
    return {
      hours: Number.parseInt(hhmmMatch[1], 10),
      minutes: Number.parseInt(hhmmMatch[2], 10),
    };
  }

  const ampmMatch = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i.exec(timeStr);
  if (ampmMatch) {
    let hours = Number.parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2] ? Number.parseInt(ampmMatch[2], 10) : 0;
    const period = ampmMatch[3]?.toLowerCase();

    if (period === 'pm' && hours !== 12) hours += 12;
    else if (period === 'am' && hours === 12) hours = 0;

    return { hours, minutes };
  }

  return null;
};

const parseNumericTime = (timeStr: string): { hours: number; minutes: number } | null => {
  if (!/^\d+(?:\.\d+)?$/.test(timeStr)) return null;

  const num = Number.parseFloat(timeStr);
  const totalMinutes = num * 24 * 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  return { hours, minutes };
};

const getLegacyHoursValue = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value > 0 ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
};

const getEntryHours = (item: any): number => {
  let hours = item?.soGio || item?.hours || 0;

  if (!hours) {
    const start = item?.thoiGianBatDau || item?.start || '';
    const end = item?.thoiGianKetThuc || item?.end || '';

    if (start && end) {
      try {
        const startTime = formatTime24h(start);
        const endTime = formatTime24h(end);
        hours = calculateHoursFromTime(startTime, endTime);
      } catch {
        hours = 0;
      }
    }
  }

  if (typeof hours === 'string') {
    hours = Number.parseFloat(hours) || 0;
  }

  return typeof hours === 'number' ? hours : 0;
};

const getEntryList = (log: ProductionLog, type: 'setup' | 'work'): any[] => {
  const rawList = type === 'setup'
    ? (log.setupTimeEntries || log.setup_time_entries || [])
    : (log.workTimeEntries || log.work_time_entries || []);

  if (Array.isArray(rawList)) {
    return rawList;
  }

  return rawList ? [rawList] : [];
};

const getLegacyHoursForLog = (log: ProductionLog, type: 'setup' | 'work'): number | null => {
  if (type === 'setup') {
    const explicitHours = getLegacyHoursValue(log.gioGa ?? log.soGioGia);
    if (explicitHours !== null) return explicitHours;

    const start = formatTime24h(log.tgGia_BatDau || log.tgGiaBatDau || '');
    const end = formatTime24h(log.tgGia_KetThuc || log.tgGiaKetThuc || '');
    if (start && end) {
      return calculateHoursFromTime(start, end);
    }

    return null;
  }

  const explicitHours = getLegacyHoursValue(log.gioChay ?? log.soGioChay);
  if (explicitHours !== null) return explicitHours;

  const start = formatTime24h(log.tgChay_BatDau || log.tgChayBatDau || '');
  const end = formatTime24h(log.tgChay_KetThuc || log.tgChayKetThuc || '');
  if (start && end) {
    return calculateHoursFromTime(start, end);
  }

  return null;
};

const calculateHoursFromTime = (start: string, end: string): number => {
  if (!start || !end) return 0;
  try {
    const startDate = new Date(`2000-01-01T${start}`);
    let endDate = new Date(`2000-01-01T${end}`);
    if (endDate < startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  } catch {
    return 0;
  }
};

const buildTimeEntries = (row: Record<string, any>, startKeys: string[], endKeys: string[]) => {
  const startKey = startKeys.find((key) => Boolean(row[key]));
  const endKey = endKeys.find((key) => Boolean(row[key]));

  if (!startKey || !endKey) {
    return { entries: [] as Array<{ start: string; end: string; hours: number }>, totalHours: 0 };
  }

  const start = formatTime24h(row[startKey]);
  const end = formatTime24h(row[endKey]);
  if (!start || !end) {
    return { entries: [] as Array<{ start: string; end: string; hours: number }>, totalHours: 0 };
  }

  const hours = calculateHoursFromTime(start, end);
  return {
    entries: [{ start, end, hours }],
    totalHours: hours,
  };
};

const buildImportedLogPayload = (row: Record<string, any>, currentUserName: string) => {
  const ngayThangRaw = row['Ngày'] || '';
  const ngayThang = parseExcelDate(ngayThangRaw);
  if (!ngayThang) return null;

  const maySanXuat = row['Máy Sản Xuất'] || 'Chưa nhập';
  const duAn = row['Dự án'] || row['Mã dự án'] || 'Chưa nhập';
  const khach_hang = row['Tên dự án'] || '';
  const banVeSo = row['Bản Vẽ Số'] || '';
  const chiTietSo = row['Chi Tiết Số'] || '';
  const tenChiTiet = row['Tên chi tiết'] || row['Kích thước'] || chiTietSo;
  const noiDungGiaCong = row['Nội dung Gia Công'] || '';
  const soLuongHoanThanh = Number(row['SL HT'] || 0);
  const vatLieu = row['Vật Liệu'] || '';
  const nguyenCongSo = row['NC Số'] || '';
  const ca = row['CA'] || '';
  const nguoiVanHanh = row['Người vận hành'] || row['Người vận hành (MSNV)'] || currentUserName;
  const nguoiKiemTra = row['Người kiểm tra'] || '';
  const cpMay = Number(String(row['Chi phí chạy máy (VND)'] || 0).replace(/\D/g, ''));
  const cpDaoCu = Number(String(row['Chi phí dao cụ (VND)'] || 0).replace(/\D/g, ''));
  const toolEntries = parseImportedToolEntries(row);

  const setupTime = buildTimeEntries(row, ['TG BD gá', 'TG BĐ gá', 'Giờ bắt đầu gá'], ['TG KT gá', 'Giờ kết thúc gá']);
  const workTime = buildTimeEntries(row, ['TG BD chạy', 'TG BĐ chạy', 'Giờ bắt đầu chạy'], ['TG KT chạy', 'Giờ kết thúc chạy']);

  return {
    id: crypto.randomUUID(),
    ngayThang,
    maySanXuat,
    duAn,
    khach_hang,
    banVeSo,
    chiTietSo,
    tenChiTiet,
    noiDungGiaCong,
    soLuongHoanThanh,
    vatLieu,
    nguyenCongSo,
    ca,
    cpMay,
    cpDaoCu,
    toolEntries,
    workTimeEntries: workTime.entries,
    work_time_entries: workTime.entries,
    setupTimeEntries: setupTime.entries,
    setup_time_entries: setupTime.entries,
    nguoiVanHanh,
    nguoiKiemTra,
    gioGa: setupTime.totalHours,
    gioChay: workTime.totalHours,
    chiPhiGa: 0,
    chiPhiChayMay: cpMay,
    chiPhiDao: cpDaoCu,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// ====================== COMPONENT CHÍNH ======================
export default function ProductionReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canView: permCanView, canEdit: permCanEdit } = usePermission();
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
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const MODULE_KEY = 'nhat_ky_gia_cong';
  const permissions = {
    canView: permCanView(MODULE_KEY),
    canAdd: permCanEdit(MODULE_KEY),
    canEdit: permCanEdit(MODULE_KEY),
    canDelete: permCanEdit(MODULE_KEY),
    canApprove: permCanEdit(MODULE_KEY),
  };
  const isCheckingPermission = false;

  const checkRole = (userCheck: typeof user, roles: string[], vietnameseNames: string[]): boolean => {
    if (!userCheck) return false;
    const roleLower = (userCheck.role || '').toLowerCase().trim();
    const chucVuLower = (userCheck.chuc_vu || '').toLowerCase().trim();
    const roleMatch = roles.includes(roleLower);
    const chucVuMatch = vietnameseNames.some(name => chucVuLower.includes(name));
    return roleMatch || chucVuMatch;
  };
  
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isQuanLyXuong = checkRole(user, ['quan_ly_xuong'], ['quản lý xưởng']);
  const isNguoiVanHanh = checkRole(user, ['nguoi_van_hanh', 'user'], ['người vận hành', 'vận hành']);
  const isNguoiKiemTra = checkRole(user, ['to_truong', 'to_pho', 'nhom_truong'], ['tổ trưởng', 'tổ phó', 'nhóm trưởng']);
  const userName = (user?.fullName || user?.name || user?.ho_ten || '').trim();

  const loadLogs = async () => {
    if (!permissions.canView) return;
    
    setIsLoading(true);
    try {
      const { data: allLogs, error: allError } = await supabase
        .from('production_reports')
        .select('*')
        .order('ngayThang', { ascending: false });
      
      if (allError) throw allError;
      
      const mappedDbLogs = (allLogs || []).map((item) => {
        const mapped = mapReportFromDb('production_reports', item);
        return mapped as any as ProductionLog;
      });
      
      let filteredLogs = mappedDbLogs;
      
      if (!isAdmin && !isQuanLyXuong) {
        filteredLogs = filteredLogs.filter(log => {
          const logNguoiVanHanh = (String(log.nguoiVanHanh || '')).trim().toLowerCase();
          const logNguoiKiemTra = (String(log.nguoiKiemTra || '')).trim().toLowerCase();
          const currentUserName = userName.toLowerCase();
          
          if (isNguoiKiemTra) {
            return logNguoiKiemTra.includes(currentUserName);
          }
          if (isNguoiVanHanh) {
            return logNguoiVanHanh.includes(currentUserName);
          }
          return logNguoiVanHanh.includes(currentUserName) || logNguoiKiemTra.includes(currentUserName);
        });
      }
      
      setLogs(filteredLogs);
    } catch (error) {
      console.error('❌ Error in loadLogs:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (permissions.canView) {
      loadLogs();
    }
  }, [permissions.canView, user]);

  const handleBatchApprove = async (newStatus: 'approved' | 'rejected') => {
    const targetIds = selectAll ? new Set(logs.map(l => l.id)) : selectedIds;
    if (targetIds.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một nhật ký');
      return;
    }
    const pendingTargets = logs.filter(l => targetIds.has(l.id) && l.status === 'pending').map(l => l.id);
    if (pendingTargets.length === 0) {
      toast.warning('Không có nhật ký nào đang chờ duyệt trong số đã chọn');
      return;
    }
    const confirmMsg = newStatus === 'approved'
      ? `Bạn có chắc muốn duyệt ${pendingTargets.length} nhật ký?`
      : `Bạn có chắc muốn từ chối ${pendingTargets.length} nhật ký?`;
    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('production_reports')
        .update(buildProductionReportStatusUpdatePayload(newStatus))
        .in('id', pendingTargets);
      if (error) throw error;
      toast.success(`Đã ${newStatus === 'approved' ? 'duyệt' : 'từ chối'} ${pendingTargets.length} nhật ký`);
      setSelectedIds(new Set());
      setSelectAll(false);
      await loadLogs();
    } catch (error) {
      console.error('Batch update error:', error);
      toast.error('Có lỗi xảy ra khi xử lý hàng loạt');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const log = logs.find(l => l.id === id);
    if (!log) return;
    if (!permissions.canApprove && !canApprove(log)) {
      toast.error('Bạn không có quyền duyệt nhật ký này');
      return;
    }
    try {
      const { error } = await supabase
        .from('production_reports')
        .update(buildProductionReportStatusUpdatePayload('approved'))
        .eq('id', id);
      if (error) throw error;
      toast.success('Đã duyệt nhật ký');
      await loadLogs();
    } catch (error) {
      console.error(error);
      toast.error('Lỗi duyệt');
    }
  };

  const canApprove = (log: ProductionLog): boolean => {
    const currentUserName = (user?.fullName || user?.name || user?.ho_ten || '').trim().toLowerCase();
    const logNguoiKiemTra = (log.nguoiKiemTra || '').trim().toLowerCase();
    if (isAdmin || isQuanLyXuong) return true;
    if (isNguoiKiemTra && logNguoiKiemTra.includes(currentUserName)) return true;
    return false;
  };

  // CRUD Operations
  const handleAddLog = async (formData: any) => {
    if (!permissions.canAdd) {
      toast.error('Bạn không có quyền thêm nhật ký');
      return;
    }
    
    const totalSetupHours = formData.setupTimeEntries?.reduce((sum: number, item: any) => sum + Number(item.soGio || item.hours || 0), 0) || formData.gioGa || 0;
    const totalRunHours = formData.workTimeEntries?.reduce((sum: number, item: any) => sum + Number(item.soGio || item.hours || 0), 0) || formData.gioChay || 0;

    const newLog: any = {
      id: crypto.randomUUID(),
      ngayThang: formData.ngayThang,
      maySanXuat: formData.maySanXuat,
      duAn: formData.duAn,
      khach_hang: formData.tenDuAn,
      banVeSo: formData.banVeSo,
      chiTietSo: formData.nguyenCongSo,
      tenChiTiet: formData.tenChiTiet,
      noiDungGiaCong: formData.noiDungGiaCong,
      soLuongHoanThanh: formData.soLuongHoanThanh,
      vatLieu: formData.vatLieu,
      nguyenCongSo: formData.nguyenCongSo,
      toolEntries: formData.toolEntries || [],
      workTimeEntries: formData.workTimeEntries,
      work_time_entries: formData.workTimeEntries,
      setupTimeEntries: formData.setupTimeEntries,
      setup_time_entries: formData.setupTimeEntries,
      ca: formData.ca,
      cpMay: formData.chiPhiChayMay || 0,
      chiPhiChayMay: formData.chiPhiChayMay || 0,
      cpDaoCu: formData.chiPhiDao || 0,
      chiPhiDao: formData.chiPhiDao || 0,
      chiPhiGa: formData.chiPhiGa || 0,
      gioGa: totalSetupHours,
      gioChay: totalRunHours,
      nguoiVanHanh: (formData.nguoiVanHanh || user?.fullName || user?.name || '').trim(),
      nguoiKiemTra: (formData.nguoiKiemTra || '').trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      const { error } = await supabase.from('production_reports').insert(buildProductionReportDbPayload(newLog));
      if (error) throw error;
      toast.success('Thêm nhật ký thành công');
      setIsAddDialogOpen(false);
      setFormKey((k) => k + 1);
      await loadLogs();
    } catch (error) {
      console.error('Error adding:', error);
      toast.error('Lỗi thêm dữ liệu');
    }
  };

  const handleEditLog = async (formData: any) => {
    if (!permissions.canEdit) {
      toast.error('Bạn không có quyền sửa nhật ký');
      return;
    }
    if (!selectedLog) {
      toast.error('Không tìm thấy nhật ký để sửa');
      return;
    }
    if (selectedLog.status === 'approved' && !isAdmin) {
      toast.error('Không thể sửa nhật ký đã duyệt');
      return;
    }
    
    const duAnValue = formData.duAn || selectedLog.duAn || '';
    
    const totalSetupHours = formData.setupTimeEntries?.reduce((sum: number, item: any) => sum + Number(item.soGio || item.hours || 0), 0) || formData.gioGa || 0;
    const totalRunHours = formData.workTimeEntries?.reduce((sum: number, item: any) => sum + Number(item.soGio || item.hours || 0), 0) || formData.gioChay || 0;

    const updatedLog: any = {
      ngayThang: formData.ngayThang || selectedLog.ngayThang,
      maySanXuat: formData.maySanXuat || selectedLog.maySanXuat,
      duAn: duAnValue,
      khach_hang: formData.tenDuAn || selectedLog.khach_hang || '',
      banVeSo: formData.banVeSo || selectedLog.banVeSo || '',
      chiTietSo: formData.nguyenCongSo || selectedLog.chiTietSo || '',
      tenChiTiet: formData.tenChiTiet || selectedLog.tenChiTiet || '',
      noiDungGiaCong: formData.noiDungGiaCong || selectedLog.noiDungGiaCong || '',
      soLuongHoanThanh: formData.soLuongHoanThanh || selectedLog.soLuongHoanThanh || 0,
      vatLieu: formData.vatLieu || selectedLog.vatLieu || '',
      nguyenCongSo: formData.nguyenCongSo || selectedLog.nguyenCongSo || '',
      toolEntries: formData.toolEntries || selectedLog.toolEntries || [],
      workTimeEntries: formData.workTimeEntries || selectedLog.workTimeEntries || [],
      work_time_entries: formData.workTimeEntries || selectedLog.workTimeEntries || [],
      setupTimeEntries: formData.setupTimeEntries || selectedLog.setupTimeEntries || [],
      setup_time_entries: formData.setupTimeEntries || selectedLog.setupTimeEntries || [],
      ca: formData.ca || selectedLog.ca || '',
      cpMay: formData.chiPhiChayMay || formData.cpMay || selectedLog.cpMay || 0,
      chiPhiChayMay: formData.chiPhiChayMay || formData.cpMay || selectedLog.chiPhiChayMay || 0,
      cpDaoCu: formData.chiPhiDao || formData.cpDaoCu || selectedLog.cpDaoCu || 0,
      chiPhiDao: formData.chiPhiDao || formData.cpDaoCu || selectedLog.chiPhiDao || 0,
      chiPhiGa: formData.chiPhiGa || selectedLog.chiPhiGa || 0,
      gioGa: totalSetupHours || selectedLog.gioGa || 0,
      gioChay: totalRunHours || selectedLog.gioChay || 0,
      nguoiVanHanh: (formData.nguoiVanHanh || selectedLog.nguoiVanHanh || '').trim(),
      nguoiKiemTra: (formData.nguoiKiemTra || selectedLog.nguoiKiemTra || '').trim(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      const { error } = await supabase
        .from('production_reports')
        .update(buildProductionReportDbPayload({ ...updatedLog, id: selectedLog.id }))
        .eq('id', selectedLog.id);
      if (error) throw error;
      toast.success('Cập nhật nhật ký thành công');
      setIsEditDialogOpen(false);
      setSelectedLog(null);
      await loadLogs();
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Lỗi cập nhật');
    }
  };

  const handleDeleteLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) {
      toast.error('Chỉ Admin mới có quyền xóa nhật ký');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhật ký này?')) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('production_reports').delete().eq('id', id);
      if (error) throw error;
      toast.success('Xóa nhật ký thành công');
      await loadLogs();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Lỗi xóa dữ liệu');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBatchDelete = async () => {
    if (!isAdmin) {
      toast.error('Chỉ Admin mới có quyền xóa nhật ký');
      return;
    }
    const targetIds = Array.from(selectedIds);
    if (targetIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một nhật ký');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${targetIds.length} nhật ký đã chọn?`)) return;
    setIsDeleting(true);
    try {
      let deletedCount = 0;
      for (const id of targetIds) {
        const { error } = await supabase.from('production_reports').delete().eq('id', id);
        if (!error) deletedCount++;
      }
      toast.success(`Xóa thành công ${deletedCount} nhật ký`);
      setSelectedIds(new Set());
      setSelectAll(false);
      await loadLogs();
    } catch (error) {
      console.error('Batch delete error:', error);
      toast.error('Có lỗi xảy ra khi xóa hàng loạt');
    } finally {
      setIsDeleting(false);
    }
  };

  // ====================== IMPORT EXCEL ======================
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!permissions.canAdd) {
      toast.error('Bạn không có quyền thêm nhật ký');
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<any>(sheet);

      let addedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < json.length; i++) {
        const row = json[i];
        try {
          const insertData = buildImportedLogPayload(row, user?.fullName || user?.name || '');
          if (!insertData) continue;

          const { error } = await supabase.from('production_reports').insert(buildProductionReportDbPayload(insertData));

          if (error) {
            console.error('Lỗi dòng', i + 2, ':', error);
            errorCount++;
          } else {
            addedCount++;
          }
        } catch (err) {
          console.error(`Dòng ${i + 2}: Lỗi xử lý:`, err);
          errorCount++;
        }
      }

      if (addedCount > 0) {
        let message = `Import thành công ${addedCount} nhật ký`;
        if (errorCount > 0) {
          message += ` (${errorCount} dòng bị lỗi)`;
        }
        toast.success(message);
        await loadLogs();
      } else {
        toast.error('Không có dữ liệu hợp lệ được import');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Lỗi xử lý file Excel');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  // ====================== EXPORT EXCEL ======================
  const handleExportExcel = () => {
    if (logs.length === 0) {
      toast.warning('Không có dữ liệu để xuất');
      return;
    }
    const exportData = logs.map(log => ({
      'Ngày': formatDate(log.ngayThang),
      'Máy Sản Xuất': log.maySanXuat,
      'Dự án': log.duAn,
      'Tên dự án': log.khach_hang,
      'SL HT': log.soLuongHoanThanh,
      'Người vận hành': log.nguoiVanHanh,
      'Người kiểm tra': log.nguoiKiemTra,
      'Tên dao': log.toolEntries?.map(t => t.tenDao).join(', ') || '',
      'Chi phí dao': formatCurrency(log.cpDaoCu),
      'Trạng thái': getStatusLabel(log.status),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NhatKySanXuat');
    XLSX.writeFile(wb, `nhat_ky_san_xuat_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  // ====================== DOWNLOAD TEMPLATE ======================
  const handleDownloadTemplate = () => {
    const template = [{
      'Ngày': '15/11/2024',
      'Máy Sản Xuất': 'Máy CNC 1',
      'Dự án': 'DA001',
      'Tên dự án': 'Dự án A',
      'Bản Vẽ Số': 'BV-001',
      'Chi Tiết Số': 'CT-001',
      'Tên chi tiết': 'Chi tiết mặt bích',
      'Nội dung Gia Công': 'Gia công thô',
      'SL HT': 100,
      'Vật Liệu': 'Thép SS400',
      'NC Số': 'NC001',
      'Tên dao': 'Dao phay',
      'SL cấp': 2,
      'sử dụng': 2,
      'Hỏng': 0,
      'ĐV': 'cái',
      'TG BĐ gá': '08:00',
      'TG KT gá': '08:30',
      'Tổng TG gá (h)': 0.5,
      'TG BĐ chạy': '08:30',
      'TG KT chạy': '10:30',
      'Tổng TG chạy (h)': 2,
      'CA': 'Ca 1',
      'Người vận hành (MSNV)': 'NV001',
      'Người kiểm tra': 'NV002',
      'Chi phí chạy máy (VND)': 3000000,
      'Chi phí dao cụ (VND)': 700000,
    }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_Nhat_Ky');
    XLSX.writeFile(wb, 'mau_nhap_nhat_ky_san_xuat.xlsx');
    toast.success('Đã tải file mẫu');
  };

  // ====================== FILTER & STATS ======================
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const searchMatch = !searchTerm || 
        log.duAn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.khach_hang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.maySanXuat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.toolEntries?.some(tool => tool.tenDao?.toLowerCase().includes(searchTerm.toLowerCase())));
      const statusMatch = statusFilter === 'all' || log.status === statusFilter;
      const logDate = new Date(log.ngayThang);
      const startDate = dateFilterStart ? new Date(dateFilterStart) : null;
      const endDate = dateFilterEnd ? new Date(dateFilterEnd) : null;
      const dateMatch = (!startDate || logDate >= startDate) && (!endDate || logDate <= endDate);
      return searchMatch && statusMatch && dateMatch;
    });
  }, [logs, searchTerm, statusFilter, dateFilterStart, dateFilterEnd]);

  const calculateTotalHoursForLog = (log: ProductionLog, type: 'setup' | 'work'): number => {
    const legacyHours = getLegacyHoursForLog(log, type);
    if (legacyHours !== null) {
      return legacyHours;
    }

    return getEntryList(log, type).reduce((total, item) => total + getEntryHours(item), 0);
  };
  
  const stats = useMemo(() => ({
    total: logs.length,
    approved: logs.filter(l => l.status === 'approved').length,
    pending: logs.filter(l => l.status === 'pending').length,
    rejected: logs.filter(l => l.status === 'rejected').length,
  }), [logs]);
  
  const productionSummary = useMemo(() => {
    let totalSetupHours = 0;
    let totalWorkHours = 0;
    
    filteredLogs.forEach((log) => {
      totalSetupHours += calculateTotalHoursForLog(log, 'setup');
      totalWorkHours += calculateTotalHoursForLog(log, 'work');
    });
    
    return { totalSetupHours, totalWorkHours };
  }, [filteredLogs]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilterStart('');
    setDateFilterEnd('');
    setShowFilters(false);
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
    setSelectAll(false);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else if (isAdmin) {
      setSelectedIds(new Set(filteredLogs.map(l => l.id)));
    } else {
      setSelectedIds(new Set(filteredLogs.filter(l => l.status === 'pending').map(l => l.id)));
    }
    setSelectAll(!selectAll);
  };

  // ====================== RENDER ======================
  if (isCheckingPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (!permissions.canView) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <FileSpreadsheet className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-500">Bạn không có quyền xem nhật ký sản xuất</p>
          <Button className="mt-4" onClick={() => navigate('/trang-chu')}>Về trang chủ</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

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
            <p className="text-gray-600">Quản lý nhật ký gia công, chi phí máy và dao cụ</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-between">
          <div className="flex flex-wrap gap-3">
            {permissions.canAdd && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Thêm tay
              </Button>
            )}

            {permissions.canAdd && (
              <>
                <Button variant="outline" onClick={() => document.getElementById('excel-import')?.click()} disabled={isImporting}>
                  <Upload className="w-4 h-4 mr-2" />
                  {isImporting ? 'Đang import...' : 'Import Excel'}
                </Button>
                <input id="excel-import" type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
              </>
            )}

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
        
        {/* Production Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-blue-200 border-2">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-lg">🔧</span>
                  <p className="text-sm font-medium text-gray-600">Tổng giờ gá</p>
                </div>
                <p className="text-3xl font-bold text-blue-700 mt-2">
                  {productionSummary.totalSetupHours > 0 ? productionSummary.totalSetupHours.toFixed(2) : '0.00'}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 border-2">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-lg">⚙️</span>
                  <p className="text-sm font-medium text-gray-600">Tổng giờ chạy</p>
                </div>
                <p className="text-3xl font-bold text-green-700 mt-2">
                  {productionSummary.totalWorkHours > 0 ? productionSummary.totalWorkHours.toFixed(2) : '0.00'}
                </p>
              </div>
            </CardContent>
          </Card>
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
                <div><Label>Trạng thái</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="approved">Đã duyệt</SelectItem>
                      <SelectItem value="pending">Chờ duyệt</SelectItem>
                      <SelectItem value="rejected">Từ chối</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
            {/* Batch action bar */}
            {(permissions.canApprove && logs.some(l => l.status === 'pending') || isAdmin) && (
              <div className="flex items-center gap-4 px-6 py-3 bg-amber-50 border-b border-amber-200 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    {isAdmin 
                      ? `Chọn để xóa (tổng ${filteredLogs.length})` 
                      : `Chọn tất cả ${filteredLogs.filter(l => l.status === 'pending').length} đang chờ`}
                  </span>
                  {selectedIds.size > 0 && (
                    <span className="text-xs text-blue-600 ml-2">Đã chọn {selectedIds.size}</span>
                  )}
                </div>
                <div className="flex gap-2 ml-auto">
                  {permissions.canApprove && logs.some(l => l.status === 'pending') && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleBatchApprove('approved')}
                        disabled={isProcessing || selectedIds.size === 0}
                      >
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Duyệt tất cả
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleBatchApprove('rejected')}
                        disabled={isProcessing || selectedIds.size === 0}
                      >
                        <XSquare className="h-4 w-4 mr-2" />
                        Từ chối tất cả
                      </Button>
                    </>
                  )}
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBatchDelete}
                      disabled={isDeleting || selectedIds.size === 0}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Đang xóa...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa tất cả đã chọn
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                    {(permissions.canApprove || isAdmin) && (
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 transform scale-50 rounded-sm border-slate-900 data-[state=checked]:bg-blue-700"
                        />
                      </TableHead>
                    )}
                    <TableHead className="font-semibold text-gray-700">Ngày</TableHead>
                    <TableHead className="font-semibold text-gray-700">Máy Sản Xuất</TableHead>
                    <TableHead className="font-semibold text-gray-700">Mã Dự Án</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tên dự án</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">SL</TableHead>
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
                      <TableCell colSpan={11} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <FileSpreadsheet className="w-12 h-12" />
                          <p className="text-lg">Chưa có dữ liệu</p>
                          <p className="text-sm">Hãy thêm nhật ký sản xuất mới</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => {
                      const canEdit = (log.status !== 'approved' || isAdmin) && permissions.canEdit;
                      const canDelete = isAdmin;
                      const showApprove = log.status === 'pending' && (permissions.canApprove || canApprove(log));
                      const isSelected = selectedIds.has(log.id);
                      const daoList = log.toolEntries?.map(t => t.tenDao).join(', ') || '';
                      
                      return (
                        <TableRow 
                          key={log.id}
                          className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedLog(log);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          {(permissions.canApprove || isAdmin) && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectItem(log.id)}
                                className="h-4 w-4 transform scale-50 rounded-sm border-slate-900 data-[state=checked]:bg-blue-600"
                                disabled={!isAdmin && log.status !== 'pending'}
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{formatDate(log.ngayThang)}</TableCell>
                          <TableCell><Badge variant="outline" className="bg-gray-50 max-w-[150px] truncate">{log.maySanXuat}</Badge></TableCell>
                          <TableCell><code className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono font-semibold">{log.duAn}</code></TableCell>
                          <TableCell><div className="max-w-[150px]"><p className="text-sm font-medium truncate" title={log.khach_hang}>{log.khach_hang}</p></div></TableCell>
                          <TableCell className="text-center"><span className="font-mono font-semibold text-gray-700">{log.soLuongHoanThanh?.toLocaleString() || 0}</span></TableCell>
                          <TableCell><span className="text-sm truncate max-w-[100px]" title={log.nguoiVanHanh}>{log.nguoiVanHanh}</span></TableCell>
                          <TableCell><span className="text-sm">{log.nguoiKiemTra || '---'}</span></TableCell>
                          <TableCell><span className="text-sm truncate max-w-[120px] block" title={daoList}>{daoList || '---'}</span></TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
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
                                <Button variant="ghost" size="sm" onClick={(e) => handleDeleteLog(log.id, e)} className="hover:bg-red-100 hover:text-red-700 text-red-600" title="Xóa" disabled={isDeleting}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            
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

        {/* ====================== CUSTOM MODALS ====================== */}

        {/* 1. Modal Thêm mới */}
        <CustomModal
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          title="Thêm nhật ký sản xuất mới"
          maxWidth="max-w-4xl"
        >
          <ProductionForm 
            key={formKey} 
            onSubmit={handleAddLog} 
            onCancel={() => setIsAddDialogOpen(false)} 
          />
        </CustomModal>

        {/* 2. Modal Xem chi tiết */}
        <CustomModal
          isOpen={isViewDialogOpen}
          onClose={() => setIsViewDialogOpen(false)}
          title={
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">📋 CHI TIẾT NHẬT KÝ SẢN XUẤT</span>
              {selectedLog && getStatusBadge(selectedLog.status)}
            </div>
          }
          maxWidth="max-w-4xl"
        >
          {selectedLog && (
            <div className="space-y-6">
              {/* Thông tin cơ bản */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Ngày tháng</p>
                  <p className="font-semibold">{formatDate(selectedLog.ngayThang)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Máy sản xuất</p>
                  <p className="font-semibold">{selectedLog.maySanXuat}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ca sản xuất</p>
                  <p className="font-semibold">{selectedLog.ca || '---'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mã dự án</p>
                  <p className="font-semibold text-blue-600">{selectedLog.duAn}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tên dự án</p>
                  <p className="font-semibold">{selectedLog.khach_hang}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Số lượng hoàn thành</p>
                  <p className="font-semibold">{selectedLog.soLuongHoanThanh?.toLocaleString() || 0}</p>
                </div>
              </div>

              {/* Chi tiết gia công */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Bản vẽ số</p>
                  <p className="font-semibold">{selectedLog.banVeSo || '---'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Chi tiết số</p>
                  <p className="font-semibold">{selectedLog.chiTietSo || '---'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tên chi tiết</p>
                  <p className="font-semibold">{selectedLog.tenChiTiet || '---'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nguyên công số</p>
                  <p className="font-semibold">{selectedLog.nguyenCongSo || '---'}</p>
                </div>
              </div>

              {/* Nội dung gia công */}
              <div>
                <p className="text-sm text-gray-500">Nội dung gia công</p>
                <p className="font-semibold p-2 bg-gray-50 rounded-lg">{selectedLog.noiDungGiaCong || '---'}</p>
              </div>

              {/* Vật liệu */}
              <div>
                <p className="text-sm text-gray-500">Vật liệu</p>
                <p className="font-semibold">{selectedLog.vatLieu || '---'}</p>
              </div>

              {/* Thời gian gá phôi và gia công */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                {/* Thời gian gá phôi */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="text-lg">🔧</span> Thời gian gá phôi
                  </h4>
                  {(() => {
                    const setupList = selectedLog?.setupTimeEntries || selectedLog?.setup_time_entries || [];
                    const validSetupList = Array.isArray(setupList) ? setupList : [setupList];
                    
                    if (validSetupList.length === 0) {
                      return <div className="text-center text-gray-400 text-sm py-4">Không có dữ liệu</div>;
                    }

                    const totalSetupHours = validSetupList.reduce((sum: number, item: any) => {
                      let hours = item?.soGio || item?.hours || 0;
                      if (typeof hours === 'string') hours = Number.parseFloat(hours) || 0;
                      return sum + (typeof hours === 'number' ? hours : 0);
                    }, 0);

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-blue-100/50">
                              <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">Giờ bắt đầu</th>
                              <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">Giờ kết thúc</th>
                              <th className="text-right py-2 px-2 font-semibold text-gray-600 text-xs">Số giờ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {validSetupList.map((item: any, index: number) => {
                              const start = item?.thoiGianBatDau || item?.start || '';
                              const end = item?.thoiGianKetThuc || item?.end || '';
                              let hours = item?.soGio || item?.hours || 0;
                              if (typeof hours === 'string') hours = Number.parseFloat(hours) || 0;
                              return (
                                <tr key={`setup-${index}`} className="border-b border-blue-100 last:border-b-0 hover:bg-blue-50/50">
                                  <td className="py-1.5 px-2 text-gray-700">{formatTime24h(start)}</td>
                                  <td className="py-1.5 px-2 text-gray-700">{formatTime24h(end)}</td>
                                  <td className="py-1.5 px-2 text-right font-medium text-blue-700">{hours ? hours.toFixed(2) : '---'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-blue-300 bg-blue-50/50">
                              <td colSpan={2} className="py-2 px-2 font-semibold text-gray-700 text-right">Tổng:</td>
                              <td className="py-2 px-2 text-right font-bold text-blue-700">{totalSetupHours ? totalSetupHours.toFixed(2) : '---'}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()}
                </div>

                {/* Thời gian gia công */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="text-lg">⚙️</span> Thời gian gia công
                  </h4>
                  {(() => {
                    const workList = selectedLog?.workTimeEntries || selectedLog?.work_time_entries || [];
                    const validWorkList = Array.isArray(workList) ? workList : [workList];
                    
                    if (validWorkList.length === 0) {
                      return <div className="text-center text-gray-400 text-sm py-4">Không có dữ liệu</div>;
                    }

                    const totalWorkHours = validWorkList.reduce((sum: number, item: any) => {
                      let hours = item?.soGio || item?.hours || 0;
                      if (typeof hours === 'string') hours = Number.parseFloat(hours) || 0;
                      return sum + (typeof hours === 'number' ? hours : 0);
                    }, 0);

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-green-100/50">
                              <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">Giờ bắt đầu</th>
                              <th className="text-left py-2 px-2 font-semibold text-gray-600 text-xs">Giờ kết thúc</th>
                              <th className="text-right py-2 px-2 font-semibold text-gray-600 text-xs">Số giờ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {validWorkList.map((item: any, index: number) => {
                              const start = item?.thoiGianBatDau || item?.start || '';
                              const end = item?.thoiGianKetThuc || item?.end || '';
                              let hours = item?.soGio || item?.hours || 0;
                              if (typeof hours === 'string') hours = Number.parseFloat(hours) || 0;
                              return (
                                <tr key={`work-${index}`} className="border-b border-green-100 last:border-b-0 hover:bg-green-50/50">
                                  <td className="py-1.5 px-2 text-gray-700">{formatTime24h(start)}</td>
                                  <td className="py-1.5 px-2 text-gray-700">{formatTime24h(end)}</td>
                                  <td className="py-1.5 px-2 text-right font-medium text-green-700">{hours ? hours.toFixed(2) : '---'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-green-300 bg-green-50/50">
                              <td colSpan={2} className="py-2 px-2 font-semibold text-gray-700 text-right">Tổng:</td>
                              <td className="py-2 px-2 text-right font-bold text-green-700">{totalWorkHours ? totalWorkHours.toFixed(2) : '---'}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Nhân sự */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <p className="text-sm text-gray-500">Người vận hành</p>
                  <p className="font-semibold">{selectedLog.nguoiVanHanh}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Người kiểm tra</p>
                  <p className="font-semibold">{selectedLog.nguoiKiemTra || '---'}</p>
                </div>
              </div>

              {/* Bảng dao cụ */}
              {selectedLog.toolEntries && selectedLog.toolEntries.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span>🔩 Thông tin Dao Cụ</span>
                    <Badge variant="outline" className="ml-2">{selectedLog.toolEntries.length} loại</Badge>
                  </h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="font-semibold">Tên Dao</TableHead>
                          <TableHead className="text-center font-semibold">SL Cấp</TableHead>
                          <TableHead className="text-center font-semibold">SL Sử Dụng</TableHead>
                          <TableHead className="text-center font-semibold">SL Hỏng</TableHead>
                          <TableHead className="text-center font-semibold">Đơn Vị</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLog.toolEntries.map((tool) => {
                          const toolKey = `${tool.tenDao || 'tool'}-${tool.slCap}-${tool.slSuDung}-${tool.hong}-${tool.donVi}`;
                          return (
                            <TableRow key={toolKey} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{tool.tenDao}</TableCell>
                              <TableCell className="text-center">{tool.slCap}</TableCell>
                              <TableCell className="text-center">{tool.slSuDung}</TableCell>
                              <TableCell className="text-center">{tool.hong}</TableCell>
                              <TableCell className="text-center">{tool.donVi}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-between items-center border-t pt-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span>Trạng thái:</span>
                  {getStatusBadge(selectedLog.status)}
                </div>
                <div>Ngày tạo: {new Date(selectedLog.createdAt).toLocaleString('vi-VN')}</div>
              </div>
            </div>
          )}
        </CustomModal>

        {/* 3. Modal Sửa */}
        <CustomModal
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedLog(null);
          }}
          title="Chỉnh sửa nhật ký sản xuất"
          maxWidth="max-w-4xl"
        >
          {selectedLog && permissions.canEdit && (
            <ProductionForm 
              key={`edit-${selectedLog.id}`} 
              initialData={{
                ...selectedLog,
                duAn: selectedLog.duAn || '',
                maDuAn: selectedLog.duAn || '',
              }} 
              onSubmit={handleEditLog} 
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedLog(null);
              }} 
            />
          )}
        </CustomModal>

      </div>
    </div>
  );
}