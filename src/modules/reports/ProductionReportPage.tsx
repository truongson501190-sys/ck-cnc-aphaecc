// ProductionReportPage.tsx - NHẬT KÝ SẢN XUẤT (TÍCH HỢP DUYỆT HÀNG LOẠT, SỬA IMPORT/EXPORT)
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
import { 
  Plus, Filter, X, ArrowLeft, Upload, Download, Edit, Eye, Trash2, FileSpreadsheet, Search, 
  CheckCircle, Loader2, CheckSquare, XSquare, Check, X as XIcon 
} from 'lucide-react';
import { toast } from 'sonner';
import { ProductionForm } from './ProductionForm';
import { supabase } from '@/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
  cpMay: number;
  cpDaoCu: number;
  nguoiVanHanh: string;
  nguoiKiemTra: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  setup_time_entries?: Array<{ start?: string; end?: string; hours?: number }>;
  work_time_entries?: Array<{ start?: string; end?: string; hours?: number }>;
  tgGia_BatDau?: string;
  tgGia_KetThuc?: string;
  soGioGia?: number;
  tgChay_BatDau?: string;
  tgChay_KetThuc?: string;
  soGioChay?: number;
}

// ====================== HÀM KIỂM TRA QUYỀN ======================
const checkPermission = async (action: 'view' | 'add' | 'edit' | 'delete' | 'approve' = 'view'): Promise<boolean> => {
  try {
    const sessionUser = localStorage.getItem('sessionUser');
    let currentMsnv = null;
    if (sessionUser) {
      try {
        const parsed = JSON.parse(sessionUser);
        currentMsnv = parsed.msnv;
      } catch (e) {}
    }
    if (!currentMsnv) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) currentMsnv = user.email;
    }
    if (!currentMsnv) return false;

    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('msnv', currentMsnv)
      .maybeSingle();
    if (userError) console.error('Error fetching user role:', userError);
    if (currentUser?.role === 'admin') return true;

    const { data: perm, error: permError } = await supabase
      .from('user_permissions')
      .select('can_view, can_add, can_edit, can_delete, can_approve, can_export')
      .eq('msnv', currentMsnv)
      .eq('module_key', 'nhat_ky_san_xuat')
      .maybeSingle();
    if (permError) console.error('Error fetching permissions:', permError);
    if (!perm) return false;

    switch (action) {
      case 'view': return perm.can_view === true;
      case 'add': return perm.can_add === true;
      case 'edit': return perm.can_edit === true;
      case 'delete': return perm.can_delete === true;
      case 'approve': return perm.can_approve === true;
      default: return false;
    }
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
};

// ====================== HÀM TIỆN ÍCH ======================
const formatDate = (value: any) => {
  if (!value) return '';
  // Nếu là số serial của Excel
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

// Chuyển đổi từ Excel serial sang YYYY-MM-DD
const parseExcelDate = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'number') {
    // Excel serial date (days since 1900-01-01)
    const date = new Date((value - 25569) * 86400 * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  // Nếu là chuỗi, chuyển đổi từ dd/mm/yyyy sang yyyy-mm-dd
  const str = String(value);
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return str;
};

const formatCurrency = (value: number) => {
  if (!value) return '0 đ';
  return value.toLocaleString('vi-VN') + ' đ';
};

// ====================== COMPONENT CHÍNH ======================
export function ProductionReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // State cho duyệt hàng loạt
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const [permissions, setPermissions] = useState({
    canView: true,
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
  });
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);

  // Kiểm tra quyền khi mount
  useEffect(() => {
    const checkAccess = async () => {
      setIsCheckingPermission(true);
      try {
        const [view, add, edit, del, approve] = await Promise.all([
          checkPermission('view'),
          checkPermission('add'),
          checkPermission('edit'),
          checkPermission('delete'),
          checkPermission('approve'),
        ]);
        setPermissions({ canView: view, canAdd: add, canEdit: edit, canDelete: del, canApprove: approve });
      } catch (error) {
        console.error('Error checking permissions:', error);
      } finally {
        setIsCheckingPermission(false);
      }
    };
    checkAccess();
  }, []);

  // Tải dữ liệu
  const loadLogs = async () => {
    if (!permissions.canView) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('production_reports')
        .select('*')
        .order('ngayThang', { ascending: false });
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('Không thể tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isCheckingPermission && permissions.canView) {
      loadLogs();
    }
  }, [isCheckingPermission, permissions.canView]);

  // Hàm duyệt hàng loạt
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
        .update({ status: newStatus, updatedAt: new Date().toISOString() })
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

  // Hàm duyệt từng dòng
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
        .update({ status: 'approved', updatedAt: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Đã duyệt nhật ký');
      await loadLogs();
    } catch (error) {
      console.error(error);
      toast.error('Lỗi duyệt');
    }
  };

  const canApprove = (log: ProductionLog) => {
    const userRole = user?.role || '';
    const userName = user?.fullName || user?.name || '';
    if (userRole === 'admin' || userRole === 'quan_ly_xuong') return true;
    if ((userRole === 'to_truong' || userRole === 'to_pho' || userRole === 'nhom_truong') && log.nguoiKiemTra === userName) return true;
    return false;
  };

  // CRUD Operations
  const handleAddLog = async (formData: any) => {
    if (!permissions.canAdd) {
      toast.error('Bạn không có quyền thêm nhật ký');
      return;
    }
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.email || 'unknown';
    const newLog: Partial<ProductionLog> = {
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
      ca: formData.ca,
      cpMay: formData.chiPhiChayMay || 0,
      cpDaoCu: formData.chiPhiDao || 0,
      nguoiVanHanh: formData.nguoiVanHanh,
      nguoiKiemTra: formData.nguoiKiemTra || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      const { error } = await supabase.from('production_reports').insert(newLog);
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
    if (!selectedLog) return;
    const updatedLog: Partial<ProductionLog> = {
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
      ca: formData.ca,
      cpMay: formData.cpMay || 0,
      cpDaoCu: formData.cpDaoCu || 0,
      nguoiVanHanh: formData.nguoiVanHanh,
      nguoiKiemTra: formData.nguoiKiemTra || selectedLog.nguoiKiemTra,
      updatedAt: new Date().toISOString()
    };
    try {
      const { error } = await supabase
        .from('production_reports')
        .update(updatedLog)
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
    if (!permissions.canDelete) {
      toast.error('Bạn không có quyền xóa nhật ký');
      return;
    }
    const log = logs.find(l => l.id === id);
    if (log?.status === 'approved') {
      toast.error('Không thể xóa nhật ký đã duyệt');
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa nhật ký này?')) return;
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

  // ====================== IMPORT EXCEL (ĐÃ SỬA) ======================
  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!permissions.canAdd) {
      toast.error('Bạn không có quyền thêm nhật ký');
      return;
    }
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(sheet);

        const { data: { user: authUser } } = await supabase.auth.getUser();
        let addedCount = 0;

        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          try {
            // --- Đọc các cột theo tên mới ---
            let ngayThangRaw = row['Ngày'] || '';
            // Chuyển đổi ngày tháng từ Excel
            const ngayThang = parseExcelDate(ngayThangRaw);

            const maySanXuat = row['Máy Sản Xuất'] || '';
            const duAn = row['Dự án'] || '';
            const khach_hang = row['Tên dự án'] || '';
            const banVeSo = row['Bản Vẽ Số'] || '';
            const chiTietSo = row['Chi Tiết Số'] || '';
            const tenChiTiet = chiTietSo; // hoặc có thể lấy từ cột khác
            const noiDungGiaCong = row['Nội dung Gia Công'] || '';
            const soLuongHoanThanh = Number(row['SL HT'] || 0);
            const vatLieu = row['Vật Liệu'] || '';
            const nguyenCongSo = row['NC Số'] || '';
            const ca = row['CA'] || '';
            const nguoiVanHanh = row['Người vận hành (MSNV)'] || '';
            const nguoiKiemTra = row['Người kiểm tra'] || '';

            // Đọc chi phí (nếu có) từ các cột khác, nếu không có thì để 0
            const cpMay = Number(String(row['Chi phí chạy máy (VND)'] || 0).replace(/[^0-9]/g, ''));
            const cpDaoCu = Number(String(row['Chi phí dao cụ (VND)'] || 0).replace(/[^0-9]/g, ''));

            // Xử lý toolEntries
            const toolEntries = [];
            if (row['Tên dao']) {
              toolEntries.push({
                tenDao: row['Tên dao'],
                slCap: Number(row['SL cấp'] || 0),
                slSuDung: Number(row['sử dụng'] || 0),
                hong: Number(row['Hỏng'] || 0),
                donVi: row['ĐV'] || 'cái',
                donGia: cpDaoCu / (Number(row['sử dụng'] || 1) || 1),
                thanhTien: cpDaoCu,
              });
            }

            // Bỏ qua các cột không có trong bảng: Kích thước, TG BĐ gá, TG KT gá, Tổng TG gá (h), TG BĐ chạy, TG KT chạy, Tổng TG chạy (h)

            if (duAn && ngayThang) {
              const { error } = await supabase.from('production_reports').insert({
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
                toolEntries,
                ca,
                cpMay,
                cpDaoCu,
                nguoiVanHanh,
                nguoiKiemTra,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              addedCount++;
            }
          } catch (err) {
            console.error(`Dòng ${i + 2}: Lỗi xử lý:`, err);
          }
        }

        if (addedCount > 0) {
          toast.success(`Import thành công ${addedCount} nhật ký`);
          await loadLogs();
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
    };
    reader.readAsArrayBuffer(file);
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
      'Trạng thái': log.status === 'approved' ? 'Đã duyệt' : log.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt',
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
      'Nội dung Gia Công': 'Gia công thô',
      'Kích thước': '100x200x50',
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

  // Checkbox handlers
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
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm tay
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>Thêm nhật ký sản xuất mới</DialogTitle></DialogHeader>
                  <ProductionForm key={formKey} onSubmit={handleAddLog} onCancel={() => setIsAddDialogOpen(false)} />
                </DialogContent>
              </Dialog>
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
            {permissions.canApprove && logs.some(l => l.status === 'pending') && (
              <div className="flex items-center gap-4 px-6 py-3 bg-amber-50 border-b border-amber-200 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Chọn tất cả {filteredLogs.filter(l => l.status === 'pending').length} đang chờ
                  </span>
                  {selectedIds.size > 0 && (
                    <span className="text-xs text-blue-600 ml-2">Đã chọn {selectedIds.size}</span>
                  )}
                </div>
                <div className="flex gap-2 ml-auto">
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
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                    {permissions.canApprove && (
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
                    filteredLogs.map((log, index) => {
                      const canEdit = (log.status !== 'approved' || user?.role === 'admin') && permissions.canEdit;
                      const canDelete = (log.status !== 'approved' || user?.role === 'admin') && permissions.canDelete;
                      const showApprove = log.status === 'pending' && (permissions.canApprove || canApprove(log));
                      const isSelected = selectedIds.has(log.id);
                      const daoList = log.toolEntries?.map(t => t.tenDao).join(', ') || '';
                      
                      return (
                        <TableRow 
                          key={log.id}
                          className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                          onClick={() => {
                            setSelectedLog(log);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          {permissions.canApprove && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectItem(log.id)}
                                className="h-4 w-4 transform scale-50 rounded-sm border-slate-900 data-[state=checked]:bg-blue-600"
                                disabled={log.status !== 'pending'}
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

       {/* View Dialog */}
<Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
  <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="text-xl font-bold text-gray-800">CHI TIẾT NHẬT KÝ SẢN XUẤT</DialogTitle>
    </DialogHeader>
    {selectedLog && (
      <div className="space-y-6">
        {/* Thông tin chung */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
          <div className="space-y-2">
            <div className="flex"><span className="w-32 text-gray-600 font-medium">Ngày tháng:</span><span className="font-medium">{formatDate(selectedLog.ngayThang)}</span></div>
            <div className="flex"><span className="w-32 text-gray-600 font-medium">Máy Sản Xuất:</span><span className="font-medium">{selectedLog.maySanXuat || '---'}</span></div>
            <div className="flex"><span className="w-32 text-gray-600 font-medium">Mã Dự Án:</span><span className="font-medium text-blue-600">{selectedLog.duAn || '---'}</span></div>
            <div className="flex"><span className="w-32 text-gray-600 font-medium">Tên Dự Án:</span><span className="font-medium">{selectedLog.khach_hang || '---'}</span></div>
            <div className="flex"><span className="w-32 text-gray-600 font-medium">Bản Vẽ Số:</span><span>{selectedLog.banVeSo || '---'}</span></div>
            <div className="flex"><span className="w-32 text-gray-600 font-medium">Ca:</span><span>{selectedLog.ca || '---'}</span></div>
          </div>
          <div className="space-y-2">
            <div className="flex"><span className="w-32 text-gray-600 font-medium">Tên Chi Tiết:</span><span>{selectedLog.tenChiTiet || '---'}</span></div>
            <div className="flex"><span className="w-32 text-gray-600 font-medium">Nội dung Gia Công:</span><span>{selectedLog.noiDungGiaCong || '---'}</span></div>
            <div className="flex"><span className="w-32 text-gray-600 font-medium">Vật Liệu:</span><span>{selectedLog.vatLieu || '---'}</span></div>
            <div className="flex"><span className="w-32 text-gray-600 font-medium">Số NC:</span><span>{selectedLog.nguyenCongSo || '---'}</span></div>
            <div className="flex"><span className="w-32 text-gray-600 font-medium">Người Vận Hành:</span><span>{selectedLog.nguoiVanHanh || '---'}</span></div>
            <div className="flex"><span className="w-32 text-gray-600 font-medium">Người Kiểm Tra:</span><span>{selectedLog.nguoiKiemTra || '---'}</span></div>
            <div className="flex"><span className="w-32 text-gray-600 font-medium">Số lượng HT:</span><span className="font-bold text-blue-700">{selectedLog.soLuongHoanThanh?.toLocaleString() || 0}</span></div>
          </div>
        </div>

        {/* Thời gian gá phôi và gia công */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span className="text-lg">🔧</span> Thời gian gá phôi
    </h4>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between items-center border-b border-blue-100 pb-1">
        <span className="text-gray-600">Giờ bắt đầu:</span>
        <span className="font-medium">
          {selectedLog.setup_time_entries?.[0]?.start || 
           selectedLog.tgGia_BatDau || '---'}
        </span>
      </div>
      <div className="flex justify-between items-center border-b border-blue-100 pb-1">
        <span className="text-gray-600">Giờ kết thúc:</span>
        <span className="font-medium">
          {selectedLog.setup_time_entries?.[0]?.end || 
           selectedLog.tgGia_KetThuc || '---'}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Số giờ:</span>
        <span className="font-medium text-blue-700">
          {selectedLog.setup_time_entries?.[0]?.hours || 
           selectedLog.soGioGia || '---'}
        </span>
      </div>
    </div>
  </div>

  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
      <span className="text-lg">⚙️</span> Thời gian gia công
    </h4>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between items-center border-b border-green-100 pb-1">
        <span className="text-gray-600">Giờ bắt đầu:</span>
        <span className="font-medium">
          {selectedLog.work_time_entries?.[0]?.start || 
           selectedLog.tgChay_BatDau || '---'}
        </span>
      </div>
      <div className="flex justify-between items-center border-b border-green-100 pb-1">
        <span className="text-gray-600">Giờ kết thúc:</span>
        <span className="font-medium">
          {selectedLog.work_time_entries?.[0]?.end || 
           selectedLog.tgChay_KetThuc || '---'}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Số giờ:</span>
        <span className="font-medium text-green-700">
          {selectedLog.work_time_entries?.[0]?.hours || 
           selectedLog.soGioChay || '---'}
        </span>
      </div>
    </div>
  </div>
</div>

        {/* Bảng dao cụ chi tiết (đã bỏ cột đơn giá, thành tiền) */}
        {selectedLog.toolEntries && selectedLog.toolEntries.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span>🔩 Thông tin Dao Cụ</span>
              <Badge variant="outline" className="ml-2">
                {selectedLog.toolEntries.length} loại
              </Badge>
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
                  {selectedLog.toolEntries.map((tool, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{tool.tenDao}</TableCell>
                      <TableCell className="text-center">{tool.slCap}</TableCell>
                      <TableCell className="text-center">{tool.slSuDung}</TableCell>
                      <TableCell className="text-center">{tool.hong}</TableCell>
                      <TableCell className="text-center">{tool.donVi}</TableCell>
                    </TableRow>
                  ))}
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
  </DialogContent>
</Dialog>
        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Chỉnh sửa nhật ký sản xuất</DialogTitle></DialogHeader>
            {selectedLog && permissions.canEdit && (
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