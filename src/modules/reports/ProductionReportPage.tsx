// ProductionReportPage.tsx - NHẬT KÝ SẢN XUẤT (ĐÃ SỬA HOÀN CHỈNH)
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
import { Plus, Filter, X, ArrowLeft, Upload, Download, Edit, Eye, Trash2, FileSpreadsheet, Search, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ProductionForm } from './ProductionForm';
import { supabase } from '@/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ======================
// TYPES - KHỚP VỚI DB CAMELCASE
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
  tgTrenCa: string;
  work_time_entries?: any[];
  setup_time_entries?: any[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}

// ======================
// HÀM KIỂM TRA QUYỀN - ĐÃ SỬA HOÀN CHỈNH
// ======================

const checkPermission = async (action: 'view' | 'add' | 'edit' | 'delete' | 'approve' = 'view'): Promise<boolean> => {
  try {
    // Lấy session user từ localStorage trước
    const sessionUser = localStorage.getItem('sessionUser');
    let currentMsnv = null;
    
    if (sessionUser) {
      try {
        const parsed = JSON.parse(sessionUser);
        currentMsnv = parsed.msnv;
        console.log('📱 User from sessionStorage:', currentMsnv);
      } catch (e) {}
    }
    
    // Nếu không có trong session, thử lấy từ supabase auth
    if (!currentMsnv) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        currentMsnv = user.email;
      }
    }
    
    console.log('🔍 Checking permission for MSNV:', currentMsnv, 'Action:', action);
    
    if (!currentMsnv) {
      console.log('❌ No MSNV found');
      return false;
    }
    
    // Lấy role từ bảng users
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('msnv', currentMsnv)
      .maybeSingle();
    
    if (userError) {
      console.error('Error fetching user role:', userError);
    }
    
    console.log('👤 User role:', currentUser?.role);
    
    // Admin luôn có toàn quyền
    if (currentUser?.role === 'admin') {
      console.log('✅ Admin user - granted permission');
      return true;
    }
    
    // Lấy permissions từ bảng user_permissions
    const { data: perm, error: permError } = await supabase
      .from('user_permissions')
      .select('can_view, can_add, can_edit, can_delete, can_approve, can_export')
      .eq('msnv', currentMsnv)
      .eq('module_key', 'nhat_ky_san_xuat')
      .maybeSingle();
    
    if (permError) {
      console.error('Error fetching permissions:', permError);
    }
    
    console.log('📋 User permissions:', perm);
    
    if (!perm) {
      console.log('❌ No permissions found for user');
      return false;
    }
    
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


// ======================
// HÀM CHUYỂN ĐỔI DỮ LIỆU
// ======================

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
  const [permissions, setPermissions] = useState({
    canView: true,
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
  });
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);

  // Kiểm tra quyền khi component mount
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
        
        console.log('✅ Final permissions:', { view, add, edit, del, approve });
        
        setPermissions({
          canView: view,
          canAdd: add,
          canEdit: edit,
          canDelete: del,
          canApprove: approve,
        });
      } catch (error) {
        console.error('Error checking permissions:', error);
      } finally {
        setIsCheckingPermission(false);
      }
    };
    checkAccess();
  }, []);

  // Tải dữ liệu - DÙNG TÊN CỘT CAMELCASE
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

  // Kiểm tra quyền duyệt
  const canApprove = (log: ProductionLog) => {
    const userRole = user?.role || '';
    const userName = user?.fullName || user?.name || '';
    
    if (userRole === 'admin' || userRole === 'quan_ly_xuong') return true;
    if ((userRole === 'to_truong' || userRole === 'to_pho' || userRole === 'nhom_truong') && log.nguoiKiemTra === userName) return true;
    return false;
  };

  // Hàm duyệt nhật ký
  const handleApproveLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!permissions.canApprove && !canApprove(logs.find(l => l.id === id)!)) {
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

  // IMPORT EXCEL
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
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(sheet);

        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userId = authUser?.email || 'unknown';
        let addedCount = 0;

        for (let i = 0; i < json.length; i++) {
          const row = json[i];
          try {
            let ngayThang = row['Ngày'] || '';
            if (ngayThang) {
              const parts = ngayThang.toString().split('/');
              if (parts.length === 3) {
                ngayThang = `${parts[2]}-${parts[1]}-${parts[0]}`;
              }
            }
            
            const maySanXuat = row['Máy Sản Xuất'] || row['Máy'] || '';
            const duAn = row['Dự án'] || row['Mã dự án'] || '';
            const khach_hang = row['Tên dự án'] || '';
            const banVeSo = row['Bản Vẽ Số'] || '';
            const tenChiTiet = row['Tên Chi Tiết'] || '';
            const noiDungGiaCong = row['Nội dung Gia Công'] || '';
            const soLuongHoanThanh = Number(row['SL HT'] || 0);
            const vatLieu = row['Vật Liệu'] || '';
            const nguyenCongSo = row['NC Số'] || '';
            const ca = row['CA'] || '';
            const nguoiVanHanh = row['Người vận hành (MSNV)'] || '';
            const nguoiKiemTra = row['Người kiểm tra'] || '';
            
            const cpMay = Number(String(row['Chi phí chạy máy (VND)'] || 0).replace(/[^0-9]/g, ''));
            const cpDaoCu = Number(String(row['Chi phí dao cụ (VND)'] || 0).replace(/[^0-9]/g, ''));
            
            const toolEntries = [];
            if (row['Tên dao']) {
              toolEntries.push({
                tenDao: row['Tên dao'],
                slCap: Number(row['SL cấp'] || 0),
                slSuDung: Number(row['sử dụng'] || 0),
                hong: Number(row['Hỏng'] || 0),
                donVi: row['ĐV'] || 'cái',
                donGia: cpDaoCu / (Number(row['sử dụng'] || 1)),
                thanhTien: cpDaoCu,
              });
            }
            
            if (duAn && ngayThang) {
              const { error } = await supabase.from('production_reports').insert({
                id: crypto.randomUUID(),
                ngayThang,
                maySanXuat,
                duAn,
                khach_hang,
                banVeSo,
                chiTietSo: nguyenCongSo,
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
    
    reader.readAsBinaryString(file);
  };

  // Export Excel
  const handleExportExcel = () => {
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
      'SL HT': 100,
      'Vật Liệu': 'Thép SS400',
      'NC Số': 'NC001',
      'Tên dao': 'Dao phay',
      'SL cấp': 2,
      'sử dụng': 2,
      'Hỏng': 0,
      'ĐV': 'cái',
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

  // Hiển thị loading khi đang kiểm tra quyền
  if (isCheckingPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Hiển thị thông báo nếu không có quyền
  if (!permissions.canView) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <FileSpreadsheet className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-500">Bạn không có quyền xem nhật ký sản xuất</p>
          <p className="text-gray-400 text-sm mt-2">Vui lòng liên hệ quản trị viên để được cấp quyền</p>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b-2 border-gray-200">
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
                      <TableCell colSpan={10} className="text-center py-12">
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
                      )
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

        {/* View Dialog - Chi tiết */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle>CHI TIẾT NHẬT KÝ SẢN XUẤT</DialogTitle>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex"><span className="w-32 text-gray-600">Ngày tháng:</span><span className="font-medium">{formatDate(selectedLog.ngayThang)}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Máy Sản Xuất:</span><span className="font-medium">{selectedLog.maySanXuat || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Mã Dự Án:</span><span className="font-medium text-blue-600">{selectedLog.duAn || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Tên Dự Án:</span><span className="font-medium">{selectedLog.khach_hang || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Bản Vẽ Số:</span><span>{selectedLog.banVeSo || '---'}</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex"><span className="w-32 text-gray-600">Tên Chi Tiết:</span><span>{selectedLog.tenChiTiet || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Nội dung Gia Công:</span><span>{selectedLog.noiDungGiaCong || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Vật Liệu:</span><span>{selectedLog.vatLieu || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Người Vận Hành:</span><span>{selectedLog.nguoiVanHanh || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Người Kiểm Tra:</span><span>{selectedLog.nguoiKiemTra || '---'}</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t pt-4">
                  <div className="text-center"><p className="text-gray-600 text-sm">Số lượng</p><p className="text-xl font-bold">{selectedLog.soLuongHoanThanh?.toLocaleString() || 0}</p></div>
                  <div className="text-center"><p className="text-gray-600 text-sm">Chi phí máy</p><p className="text-xl font-bold">{formatCurrency(selectedLog.cpMay)}</p></div>
                  <div className="text-center"><p className="text-gray-600 text-sm">Chi phí dao</p><p className="text-xl font-bold">{formatCurrency(selectedLog.cpDaoCu)}</p></div>
                </div>

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