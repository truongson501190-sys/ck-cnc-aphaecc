// src/modules/warehouse/pages/XuatKho.tsx
import React, { useState, useEffect } from 'react';
import { WarehouseExport } from '@/modules/warehouse/components/WarehouseExport';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Eye, Download, Truck, UserCheck, Upload, X, Trash2, CheckSquare, Square, CheckCircle, Clock, AlertCircle, UserCheck as UserCheckIcon, XCircle, Edit, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ExportRecord {
  soPhieu: string;
  ngayXuat: string;
  duAn: string;
  khoXuat: string;
  nguoiXuat: string;
  nguoiNhan: string;
  nguoiDuyet?: string;
  nguoiXacNhanXuat?: string;
  nguoiNhanXacNhan?: string;
  ghiChu?: string;
  lyDoTuChoi?: string;
  tongTien: number;
  status: 'pending' | 'approved' | 'transferred' | 'received' | 'rejected';
  items: Array<{
    tenChungLoai: string;
    soLuong: number;
    donVi: string;
    donGia: number;
    thanhTien: number;
    jobNo?: string;
  }>;
  createdAt: string;
  approvedAt?: string;
  transferredAt?: string;
  receivedAt?: string;
  rejectedAt?: string;
}

export const XuatKho: React.FC = () => {
  const { user } = useAuth();
  const { canEdit } = usePermission();
  const canAddOrEdit = canEdit('xuat_kho');
  const canDelete = canEdit('xuat_kho');
  const canEditData = canEdit('xuat_kho');
  const isAdmin = user?.role === 'admin';
  
  const [open, setOpen] = useState(false);
  const [exportsList, setExportsList] = useState<ExportRecord[]>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedExport, setSelectedExport] = useState<ExportRecord | null>(null);
  
  const [importExcelOpen, setImportExcelOpen] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // ===== EDIT STATE =====
  const [editOpen, setEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // State cho duyệt hàng loạt
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  
  // State cho xác nhận nhận hàng loạt
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  
  // State cho xác nhận xuất hàng loạt
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  
  // State cho từ chối
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // ===== LOAD DATA =====
  const loadExports = () => {
    try {
      const data = localStorage.getItem('warehouseExports');
      if (data) {
        const parsed = JSON.parse(data);
        const withStatus = parsed.map((exp: any) => ({
          ...exp,
          status: exp.status || 'pending'
        }));
        setExportsList(withStatus);
        setSelectedIds(new Set());
        setIsAllSelected(false);
        localStorage.setItem('warehouseExports', JSON.stringify(withStatus));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadExports();
  }, []);

  const handleSuccess = () => {
    setOpen(false);
    loadExports();
    toast.success('Phiếu xuất đã được thêm');
  };

  // ===== VALIDATION =====
  const validTransitions: Record<string, string[]> = {
    'pending': ['approved', 'rejected'],
    'approved': ['transferred', 'rejected'],
    'transferred': ['received'],
    'received': [],
    'rejected': [],
  };

  // ===== UPDATE STATUS =====
  const updateExportStatus = (soPhieu: string, newStatus: 'approved' | 'transferred' | 'received' | 'rejected', lyDo?: string) => {
    // Kiểm tra phiếu có tồn tại không
    const exp = exportsList.find(e => e.soPhieu === soPhieu);
    if (!exp) {
      toast.error('Không tìm thấy phiếu');
      return;
    }
    
    // Kiểm tra trạng thái chuyển đổi hợp lệ
    if (!validTransitions[exp.status]?.includes(newStatus)) {
      toast.error(`Không thể chuyển từ "${exp.status}" sang "${newStatus}"`);
      return;
    }

    const updatedList = exportsList.map(exp => {
      if (exp.soPhieu === soPhieu) {
        const updated: ExportRecord = { ...exp, status: newStatus };
        const now = new Date().toISOString();
        const currentUser = user?.fullName || user?.name || 'System';
        
        if (newStatus === 'approved') {
          updated.approvedAt = now;
          updated.nguoiDuyet = currentUser;
        } else if (newStatus === 'transferred') {
          updated.transferredAt = now;
          updated.nguoiXacNhanXuat = currentUser;
        } else if (newStatus === 'received') {
          updated.receivedAt = now;
          updated.nguoiNhanXacNhan = currentUser;
        } else if (newStatus === 'rejected') {
          updated.rejectedAt = now;
          updated.lyDoTuChoi = lyDo || 'Không có lý do';
        }
        
        return updated;
      }
      return exp;
    });
    
    setExportsList(updatedList);
    localStorage.setItem('warehouseExports', JSON.stringify(updatedList));
    
    const statusMessages = {
      approved: 'đã được duyệt',
      transferred: 'đã được xác nhận xuất',
      received: 'đã được xác nhận nhận',
      rejected: 'đã bị từ chối'
    };
    
    toast.success(`Phiếu ${soPhieu} ${statusMessages[newStatus]}`);
  };

  // ===== DUYỆT PHIẾU (CHO 1 PHIẾU) =====
  const handleApprove = (soPhieu: string) => {
    const exp = exportsList.find(e => e.soPhieu === soPhieu);
    if (!exp) {
      toast.error('Không tìm thấy phiếu');
      return;
    }
    
    if (exp.status !== 'pending') {
      toast.warning('Phiếu này không ở trạng thái chờ duyệt');
      return;
    }
    
    if (!isAdmin) {
      toast.error('Chỉ Admin mới có quyền duyệt phiếu xuất');
      return;
    }
    
    updateExportStatus(soPhieu, 'approved');
  };

  // ===== DUYỆT PHIẾU HÀNG LOẠT =====
  const handleApproveSelected = () => {
    if (selectedIds.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một phiếu để duyệt');
      return;
    }
    
    const canApproveList = exportsList.filter(exp => 
      selectedIds.has(exp.soPhieu) && exp.status === 'pending'
    );
    
    if (canApproveList.length === 0) {
      toast.warning('Không có phiếu nào ở trạng thái chờ duyệt');
      return;
    }
    
    if (!isAdmin) {
      toast.error('Chỉ Admin mới có quyền duyệt phiếu xuất');
      return;
    }
    
    setApproveDialogOpen(true);
  };

  const confirmApprove = async () => {
    setIsApproving(true);
    try {
      let approveCount = 0;
      const now = new Date().toISOString();
      const currentUser = user?.fullName || user?.name || 'System';
      
      const updatedList = exportsList.map(exp => {
        if (selectedIds.has(exp.soPhieu) && exp.status === 'pending') {
          approveCount++;
          return {
            ...exp,
            status: 'approved' as const,
            approvedAt: now,
            nguoiDuyet: currentUser
          };
        }
        return exp;
      });
      
      localStorage.setItem('warehouseExports', JSON.stringify(updatedList));
      setExportsList(updatedList);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      
      toast.success(`Đã duyệt thành công ${approveCount} phiếu xuất`);
      setApproveDialogOpen(false);
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Lỗi khi duyệt phiếu xuất');
    } finally {
      setIsApproving(false);
    }
  };

  // ===== XÁC NHẬN XUẤT (CHO 1 PHIẾU) =====
  const handleConfirmTransfer = (soPhieu: string) => {
    const exp = exportsList.find(e => e.soPhieu === soPhieu);
    if (!exp) {
      toast.error('Không tìm thấy phiếu');
      return;
    }
    
    if (exp.status !== 'approved') {
      toast.warning('Phiếu này chưa được duyệt, không thể xác nhận xuất');
      return;
    }
    
    if (!isAdmin) {
      toast.error('Chỉ Admin mới có quyền xác nhận xuất');
      return;
    }
    
    updateExportStatus(soPhieu, 'transferred');
  };

  // ===== XÁC NHẬN XUẤT HÀNG LOẠT =====
  const handleTransferSelected = () => {
    if (selectedIds.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một phiếu để xác nhận xuất');
      return;
    }
    
    const canTransferList = exportsList.filter(exp => 
      selectedIds.has(exp.soPhieu) && exp.status === 'approved'
    );
    
    if (canTransferList.length === 0) {
      toast.warning('Không có phiếu nào ở trạng thái đã duyệt');
      return;
    }
    
    if (!isAdmin) {
      toast.error('Chỉ Admin mới có quyền xác nhận xuất');
      return;
    }
    
    setTransferDialogOpen(true);
  };

  const confirmTransfer = async () => {
    setIsTransferring(true);
    try {
      let transferCount = 0;
      const now = new Date().toISOString();
      const currentUser = user?.fullName || user?.name || 'System';
      
      const updatedList = exportsList.map(exp => {
        if (selectedIds.has(exp.soPhieu) && exp.status === 'approved') {
          transferCount++;
          return {
            ...exp,
            status: 'transferred' as const,
            transferredAt: now,
            nguoiXacNhanXuat: currentUser
          };
        }
        return exp;
      });
      
      localStorage.setItem('warehouseExports', JSON.stringify(updatedList));
      setExportsList(updatedList);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      
      toast.success(`Đã xác nhận xuất thành công ${transferCount} phiếu`);
      setTransferDialogOpen(false);
    } catch (error) {
      console.error('Error transferring:', error);
      toast.error('Lỗi khi xác nhận xuất phiếu');
    } finally {
      setIsTransferring(false);
    }
  };

  // ===== XÁC NHẬN NHẬN HÀNG LOẠT =====
  const handleReceiveSelected = () => {
    if (selectedIds.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một phiếu để xác nhận đã nhận');
      return;
    }
    
    const canReceiveList = exportsList.filter(exp => 
      selectedIds.has(exp.soPhieu) && exp.status === 'transferred'
    );
    
    if (canReceiveList.length === 0) {
      toast.warning('Không có phiếu nào ở trạng thái đã xuất');
      return;
    }
    
    setReceiveDialogOpen(true);
  };

  const confirmReceive = async () => {
    setIsReceiving(true);
    try {
      let receiveCount = 0;
      const now = new Date().toISOString();
      const currentUser = user?.fullName || user?.name || 'System';
      
      const updatedList = exportsList.map(exp => {
        if (selectedIds.has(exp.soPhieu) && exp.status === 'transferred') {
          receiveCount++;
          return {
            ...exp,
            status: 'received' as const,
            receivedAt: now,
            nguoiNhanXacNhan: currentUser
          };
        }
        return exp;
      });
      
      localStorage.setItem('warehouseExports', JSON.stringify(updatedList));
      setExportsList(updatedList);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      
      toast.success(`Đã xác nhận nhận thành công ${receiveCount} phiếu`);
      setReceiveDialogOpen(false);
    } catch (error) {
      console.error('Error receiving:', error);
      toast.error('Lỗi khi xác nhận nhận phiếu');
    } finally {
      setIsReceiving(false);
    }
  };

  // ===== TỪ CHỐI HÀNG LOẠT =====
  const handleRejectSelected = () => {
    if (selectedIds.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một phiếu để từ chối');
      return;
    }
    
    const canRejectList = exportsList.filter(exp => 
      selectedIds.has(exp.soPhieu) && (exp.status === 'pending' || exp.status === 'approved')
    );
    
    if (canRejectList.length === 0) {
      toast.warning('Không có phiếu nào ở trạng thái có thể từ chối');
      return;
    }
    
    if (!isAdmin) {
      toast.error('Chỉ Admin mới có quyền từ chối');
      return;
    }
    
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      toast.warning('Vui lòng nhập lý do từ chối');
      return;
    }
    
    setIsRejecting(true);
    try {
      let rejectedCount = 0;
      const now = new Date().toISOString();
      
      const updatedList = exportsList.map(exp => {
        if (selectedIds.has(exp.soPhieu) && (exp.status === 'pending' || exp.status === 'approved')) {
          rejectedCount++;
          return {
            ...exp,
            status: 'rejected' as const,
            rejectedAt: now,
            lyDoTuChoi: rejectReason
          };
        }
        return exp;
      });
      
      localStorage.setItem('warehouseExports', JSON.stringify(updatedList));
      setExportsList(updatedList);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      
      toast.success(`Đã từ chối thành công ${rejectedCount} phiếu xuất`);
      setRejectDialogOpen(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Lỗi khi từ chối phiếu xuất');
    } finally {
      setIsRejecting(false);
    }
  };

  // ===== EDIT HANDLERS =====
  const handleEdit = (exp: ExportRecord) => {
    if (exp.status === 'approved' || exp.status === 'received') {
      toast.warning('Không thể chỉnh sửa phiếu đã duyệt hoặc đã nhận');
      return;
    }
    setEditFormData({
      soPhieu: exp.soPhieu,
      ngayXuat: exp.ngayXuat,
      duAn: exp.duAn,
      khoXuat: exp.khoXuat,
      nguoiXuat: exp.nguoiXuat,
      nguoiNhan: exp.nguoiNhan,
      ghiChu: exp.ghiChu || '',
      items: exp.items.map(item => ({ ...item })),
      tongTien: exp.tongTien
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;
    
    setIsSaving(true);
    try {
      const newTongTien = editFormData.items.reduce((sum: number, item: any) => sum + (item.soLuong * item.donGia), 0);
      
      const updatedExports = exportsList.map(exp => {
        if (exp.soPhieu === editFormData.soPhieu) {
          return {
            ...exp,
            ngayXuat: editFormData.ngayXuat,
            duAn: editFormData.duAn,
            khoXuat: editFormData.khoXuat,
            nguoiXuat: editFormData.nguoiXuat,
            nguoiNhan: editFormData.nguoiNhan,
            ghiChu: editFormData.ghiChu,
            items: editFormData.items.map((item: any) => ({
              ...item,
              thanhTien: item.soLuong * item.donGia
            })),
            tongTien: newTongTien
          };
        }
        return exp;
      });
      
      localStorage.setItem('warehouseExports', JSON.stringify(updatedExports));
      setExportsList(updatedExports);
      
      setEditOpen(false);
      setEditFormData(null);
      toast.success('Đã cập nhật phiếu xuất thành công!');
      loadExports();
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Lỗi cập nhật phiếu xuất');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditItemChange = (index: number, field: string, value: any) => {
    const newItems = [...editFormData.items];
    newItems[index][field] = value;
    if (field === 'soLuong' || field === 'donGia') {
      newItems[index].thanhTien = newItems[index].soLuong * newItems[index].donGia;
    }
    setEditFormData({ ...editFormData, items: newItems });
  };

  const handleAddItem = () => {
    setEditFormData({
      ...editFormData,
      items: [...editFormData.items, {
        tenChungLoai: '',
        soLuong: 0,
        donVi: '',
        donGia: 0,
        thanhTien: 0,
        jobNo: ''
      }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = editFormData.items.filter((_: any, i: number) => i !== index);
    setEditFormData({ ...editFormData, items: newItems });
  };

  // ===== KIỂM TRA QUYỀN =====
  const canApprove = (exp: ExportRecord) => {
    return isAdmin && exp.status === 'pending';
  };

  const canConfirmTransfer = (exp: ExportRecord) => {
    return isAdmin && exp.status === 'approved';
  };

  const canConfirmReceive = (exp: ExportRecord) => {
    const currentUserName = user?.fullName || user?.name;
    return (isAdmin || (currentUserName && currentUserName === exp.nguoiNhan)) && exp.status === 'transferred';
  };

  const canReject = (exp: ExportRecord) => {
    return isAdmin && (exp.status === 'pending' || exp.status === 'approved');
  };

  // ===== GET STATUS BADGE =====
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Chờ duyệt
        </Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Đã duyệt
        </Badge>;
      case 'transferred':
        return <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300 flex items-center gap-1">
          <Truck className="w-3 h-3" /> Đã xuất
        </Badge>;
      case 'received':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1">
          <UserCheckIcon className="w-3 h-3" /> Đã nhận
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Từ chối
        </Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Không xác định</Badge>;
    }
  };

  // ========== XỬ LÝ IMPORT EXCEL ==========
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        console.log('Dữ liệu đọc được từ Excel:', jsonData);

        if (jsonData.length === 0) {
          toast.error('File Excel không có dữ liệu');
          return;
        }

        const columns = Object.keys(jsonData[0] || {});
        console.log('Các cột trong file:', columns);

        const columnMap: { [key: string]: string } = {
          'Ngay': 'ngayXuat',
          'Chung Loai': 'tenChungLoai',
          'So Luong': 'soLuong',
          'Don vi': 'donVi',
          'Job No': 'jobNo',
          'Don gia': 'donGia',
          'Thanh Tien': 'thanhTien',
          'Xuat Kho': 'xuatKho',
          'Nguoi Nhan': 'nguoiNhan',
          'Nguoi Xuat': 'nguoiXuat',
          'Ghi chú': 'ghiChu'
        };

        const requiredFields = ['Ngay', 'Chung Loai', 'Don vi', 'Don gia'];
        const missingFields = requiredFields.filter(field => !columns.includes(field));
        
        if (missingFields.length > 0) {
          toast.error(`Thiếu các cột bắt buộc: ${missingFields.join(', ')}`);
          toast.info(`Các cột hiện có: ${columns.join(', ')}`);
          return;
        }

        const mappedData = jsonData.map((row: any) => {
          const mappedRow: any = {};
          
          Object.keys(row).forEach(key => {
            const mappedKey = columnMap[key] || key;
            mappedRow[mappedKey] = row[key];
          });

          if (mappedRow.soLuong === undefined || mappedRow.soLuong === null) {
            const values = Object.values(row);
            if (values.length > 2) {
              const potentialQuantity = values[2];
              if (typeof potentialQuantity === 'number' || !isNaN(Number(potentialQuantity))) {
                mappedRow.soLuong = Number(potentialQuantity);
              } else {
                mappedRow.soLuong = 1;
              }
            } else {
              mappedRow.soLuong = 1;
            }
          } else {
            mappedRow.soLuong = Number(mappedRow.soLuong) || 1;
          }

          mappedRow.donGia = Number(String(mappedRow.donGia).replace(/,/g, '')) || 0;
          mappedRow.thanhTien = Number(String(mappedRow.thanhTien).replace(/,/g, '')) || 0;
          
          if (!mappedRow.thanhTien || mappedRow.thanhTien === 0) {
            mappedRow.thanhTien = mappedRow.soLuong * mappedRow.donGia;
          }

          mappedRow.nguoiXuat = mappedRow.nguoiXuat || 'Admin';
          mappedRow.nguoiNhan = mappedRow.nguoiNhan || '';
          mappedRow.jobNo = mappedRow.jobNo || '';
          mappedRow.duAn = mappedRow.jobNo || mappedRow.xuatKho || 'Dự án chính';
          mappedRow.khoXuat = mappedRow.xuatKho || 'Kho chính';

          mappedRow.soPhieu = `PX${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          mappedRow.status = 'pending';
          mappedRow.createdAt = new Date().toISOString();

          return mappedRow;
        });

        setExcelData(mappedData);
        toast.success(`Đã đọc thành công ${mappedData.length} dòng dữ liệu`);
      } catch (error) {
        console.error('Error reading Excel file:', error);
        toast.error('Lỗi đọc file Excel: ' + (error as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const handleImportExcel = async () => {
    if (excelData.length === 0) {
      toast.error('Không có dữ liệu để import');
      return;
    }

    setIsProcessing(true);
    try {
      const groupedData = excelData.reduce((acc: any, row: any) => {
        const key = `${row.jobNo || 'unknown'}_${row.ngayXuat}`;
        
        if (!acc[key]) {
          acc[key] = {
            soPhieu: `PX${Date.now()}_${Object.keys(acc).length + 1}`,
            ngayXuat: row.ngayXuat || new Date().toISOString().split('T')[0],
            duAn: row.jobNo || row.duAn || 'Dự án chính',
            khoXuat: row.khoXuat || 'Kho chính',
            nguoiXuat: row.nguoiXuat || 'Admin',
            nguoiNhan: row.nguoiNhan || '',
            ghiChu: row.ghiChu || '',
            status: 'pending',
            items: [],
            tongTien: 0,
            createdAt: new Date().toISOString()
          };
        }
        
        acc[key].items.push({
          tenChungLoai: row.tenChungLoai,
          soLuong: row.soLuong,
          donVi: row.donVi,
          donGia: row.donGia,
          thanhTien: row.thanhTien,
          jobNo: row.jobNo || ''
        });
        acc[key].tongTien += row.thanhTien;
        
        return acc;
      }, {});

      const importRecords = Object.values(groupedData) as ExportRecord[];
      
      const existingExports = JSON.parse(localStorage.getItem('warehouseExports') || '[]');
      const updatedExports = [...existingExports, ...importRecords];
      localStorage.setItem('warehouseExports', JSON.stringify(updatedExports));
      
      setExportsList(updatedExports);
      
      toast.success(`Import thành công ${importRecords.length} phiếu xuất`);
      setExcelData([]);
      setImportExcelOpen(false);
    } catch (error) {
      console.error('Error importing Excel:', error);
      toast.error('Lỗi import dữ liệu: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ========== CHỌN VÀ XÓA ==========
  const toggleSelect = (soPhieu: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(soPhieu)) {
      newSelected.delete(soPhieu);
    } else {
      newSelected.add(soPhieu);
    }
    setSelectedIds(newSelected);
    setIsAllSelected(newSelected.size === exportsList.length);
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(exportsList.map(exp => exp.soPhieu));
      setSelectedIds(allIds);
    }
    setIsAllSelected(!isAllSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một phiếu để xóa');
      return;
    }
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const remainingExports = exportsList.filter(exp => !selectedIds.has(exp.soPhieu));
      localStorage.setItem('warehouseExports', JSON.stringify(remainingExports));
      setExportsList(remainingExports);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      
      toast.success(`Đã xóa thành công ${selectedIds.size} phiếu xuất`);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Lỗi khi xóa phiếu xuất');
    } finally {
      setIsDeleting(false);
    }
  };

  // ========== IN PDF ==========
  const handlePrint = () => {
    const printContent = document.getElementById('phieu-xuat-content');
    if (!printContent || !selectedExport) return;
    const originalTitle = document.title;
    document.title = `PhieuXuat_${selectedExport.soPhieu}`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>${document.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .text-right { text-align: right; }
          </style>
          </head>
          <body>${printContent.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
    document.title = originalTitle;
  };

  // ========== COMPONENT NỘI DUNG PHIẾU ==========
  const PhieuXuatContent = ({ data }: { data: ExportRecord }) => (
    <div id="phieu-xuat-content">
      <h2 style={{ textAlign: 'center', marginBottom: 20 }}>PHIẾU XUẤT KHO</h2>
      <div style={{ marginBottom: 20 }}>
        <p><strong>Số phiếu:</strong> {data.soPhieu}</p>
        <p><strong>Ngày xuất:</strong> {data.ngayXuat}</p>
        <p><strong>Dự án:</strong> {data.duAn}</p>
        <p><strong>Kho xuất:</strong> {data.khoXuat}</p>
        <p><strong>Người xuất:</strong> {data.nguoiXuat}</p>
        <p><strong>Người nhận:</strong> {data.nguoiNhan}</p>
        {data.nguoiDuyet && <p><strong>Người duyệt:</strong> {data.nguoiDuyet}</p>}
        {data.nguoiXacNhanXuat && <p><strong>Người xác nhận xuất:</strong> {data.nguoiXacNhanXuat}</p>}
        {data.nguoiNhanXacNhan && <p><strong>Người xác nhận nhận:</strong> {data.nguoiNhanXacNhan}</p>}
        {data.lyDoTuChoi && <p><strong>Lý do từ chối:</strong> {data.lyDoTuChoi}</p>}
        <p><strong>Trạng thái:</strong> {
          data.status === 'pending' ? 'Chờ duyệt' : 
          data.status === 'approved' ? 'Đã duyệt' : 
          data.status === 'transferred' ? 'Đã xuất' : 
          data.status === 'received' ? 'Đã nhận' : 
          'Từ chối'
        }</p>
        <p><strong>Ghi chú:</strong> {data.ghiChu || '---'}</p>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>STT</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>Tên vật tư</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Số lượng</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>Đơn vị</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>Job No</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Đơn giá (₫)</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Thành tiền (₫)</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{idx+1}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{item.tenChungLoai}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{item.soLuong}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{item.donVi}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{item.jobNo || '---'}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{item.donGia.toLocaleString('vi-VN')}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{item.thanhTien.toLocaleString('vi-VN')}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 'bold', backgroundColor: '#f9fafb' }}>
            <td colSpan={6} style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Tổng cộng:</td>
            <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{data.tongTien.toLocaleString('vi-VN')} ₫</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // Kiểm tra xem có phiếu nào ở trạng thái "chờ duyệt" để hiển thị nút "Duyệt" không
  const hasPendingItems = exportsList.some(exp => 
    selectedIds.has(exp.soPhieu) && exp.status === 'pending'
  );

  // Kiểm tra xem có phiếu nào ở trạng thái "đã xuất" để hiển thị nút "Đã nhận" không
  const hasTransferableItems = exportsList.some(exp => 
    selectedIds.has(exp.soPhieu) && exp.status === 'transferred'
  );

  // Kiểm tra xem có phiếu nào ở trạng thái "đã duyệt" để hiển thị nút "Xác nhận xuất" không
  const hasApprovedItems = exportsList.some(exp => 
    selectedIds.has(exp.soPhieu) && exp.status === 'approved'
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Xuất Kho</h1>
        <div className="flex gap-2 flex-wrap">
          {/* Nút Import Excel */}
          <Dialog open={importExcelOpen} onOpenChange={setImportExcelOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" disabled={!canAddOrEdit}>
                <Upload className="w-4 h-4 mr-2" /> Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">Import phiếu xuất từ Excel</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Click để chọn file Excel hoặc kéo thả vào đây
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Hỗ trợ định dạng .xlsx, .xls
                    </p>
                  </label>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Cấu trúc file Excel:</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><span className="font-semibold">Cột bắt buộc:</span> Ngay, Chung Loai, Don vi, Don gia</p>
                    <p><span className="font-semibold">Cột số lượng:</span> Số lượng (nếu có) hoặc cột thứ 3 trong file</p>
                    <p><span className="font-semibold">Cột tùy chọn:</span> Job No, Thanh Tien, Xuat Kho, Nguoi Nhan, Nguoi Xuat, Ghi chú</p>
                  </div>
                  <Button 
                    variant="link" 
                    className="text-blue-700 p-0 h-auto mt-2"
                    onClick={() => {
                      const sampleData = [
                        {
                          'Ngay': '02/01/2025',
                          'Chung Loai': 'Mũi khoan 13.5 (HSS Nachi TD)',
                          'So Luong': 1,
                          'Don vi': 'Cây',
                          'Job No': 'AL-5399',
                          'Don gia': 395000,
                          'Thanh Tien': 395000,
                          'Xuat Kho': 'CNC',
                          'Nguoi Nhan': 'Lê Chí Công',
                          'Nguoi Xuat': 'Nguyễn Viết Nam'
                        }
                      ];
                      
                      const ws = XLSX.utils.json_to_sheet(sampleData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
                      XLSX.writeFile(wb, 'mau_phieu_xuat.xlsx');
                    }}
                  >
                    Tải file mẫu
                  </Button>
                </div>

                {excelData.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Dữ liệu đã đọc ({excelData.length} dòng)</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setExcelData([])}
                        className="text-red-500"
                      >
                        <X className="w-4 h-4" /> Xóa
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên vật tư</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">SL</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Job No</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Đơn giá</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {excelData.slice(0, 10).map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 text-sm text-gray-900">{idx + 1}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.ngayXuat}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.tenChungLoai}</td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">{row.soLuong}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.donVi}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.jobNo}</td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">{row.donGia.toLocaleString('vi-VN')}</td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">{row.thanhTien.toLocaleString('vi-VN')}</td>
                            </tr>
                          ))}
                          {excelData.length > 10 && (
                            <tr>
                              <td colSpan={8} className="px-4 py-2 text-sm text-gray-500 text-center">
                                ... và {excelData.length - 10} dòng khác
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      Tổng cộng: {excelData.length} mặt hàng
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="outline" onClick={() => {
                    setImportExcelOpen(false);
                    setExcelData([]);
                  }}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={handleImportExcel}
                    disabled={excelData.length === 0 || isProcessing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? 'Đang xử lý...' : 'Import dữ liệu'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Nút Thêm phiếu xuất */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700" disabled={!canAddOrEdit}>
                <Plus className="w-4 h-4 mr-2" /> Thêm phiếu xuất
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">Tạo phiếu xuất kho mới</DialogTitle>
              </DialogHeader>
              <WarehouseExport onSuccess={handleSuccess} />
            </DialogContent>
          </Dialog>

          {/* Nút Duyệt hàng loạt - Chỉ Admin và có phiếu chờ duyệt */}
          {isAdmin && hasPendingItems && (
            <Button 
              variant="outline"
              onClick={handleApproveSelected}
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Duyệt ({selectedIds.size})
            </Button>
          )}

          {/* Nút Xác nhận xuất hàng loạt - Chỉ Admin và có phiếu đã duyệt */}
          {isAdmin && hasApprovedItems && (
            <Button 
              variant="outline"
              onClick={handleTransferSelected}
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <Truck className="w-4 h-4 mr-2" />
              Xác nhận xuất ({selectedIds.size})
            </Button>
          )}

          {/* Nút Đã nhận hàng loạt - Admin hoặc người nhận và có phiếu đã xuất */}
          {hasTransferableItems && (
            <Button 
              variant="outline"
              onClick={handleReceiveSelected}
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              <UserCheckIcon className="w-4 h-4 mr-2" />
              Đã nhận ({selectedIds.size})
            </Button>
          )}

          {/* Nút Từ chối hàng loạt - Chỉ Admin */}
          {isAdmin && (
            <Button 
              variant="outline"
              onClick={handleRejectSelected}
              disabled={selectedIds.size === 0}
              className="border-red-500 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Từ chối ({selectedIds.size})
            </Button>
          )}

          {/* Nút Xóa */}
          {canDelete && (
            <Button 
              variant="destructive" 
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Bảng danh sách phiếu xuất */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="p-0 h-8 w-8"
                    disabled={exportsList.length === 0}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số phiếu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày xuất</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dự án</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kho</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người xuất</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người nhận</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exportsList.map((exp) => (
                <tr key={exp.soPhieu} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSelect(exp.soPhieu)}
                      className="p-0 h-8 w-8"
                    >
                      {selectedIds.has(exp.soPhieu) ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exp.soPhieu}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.ngayXuat}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.duAn}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.khoXuat}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.nguoiXuat}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.nguoiNhan}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">{getStatusBadge(exp.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {/* Nút Chỉnh sửa */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(exp)}
                        className="text-blue-600 hover:text-blue-800"
                        disabled={!canEditData || exp.status === 'approved' || exp.status === 'received'}
                        title="Chỉnh sửa phiếu xuất"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      {/* Nút Duyệt - Chỉ Admin và phiếu chờ duyệt */}
                      {canApprove(exp) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50"
                          onClick={() => handleApprove(exp.soPhieu)}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Duyệt
                        </Button>
                      )}
                      
                      {/* Nút Xác nhận xuất - Chỉ Admin và phiếu đã duyệt */}
                      {canConfirmTransfer(exp) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          onClick={() => handleConfirmTransfer(exp.soPhieu)}
                        >
                          <Truck className="w-3 h-3 mr-1" /> Xác nhận xuất
                        </Button>
                      )}
                      
                      {/* Nút Từ chối - Chỉ Admin và phiếu chờ duyệt hoặc đã duyệt */}
                      {canReject(exp) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => {
                            const reason = window.prompt('Nhập lý do từ chối:');
                            if (reason !== null) {
                              if (reason.trim()) {
                                updateExportStatus(exp.soPhieu, 'rejected', reason);
                              } else {
                                toast.warning('Vui lòng nhập lý do từ chối');
                              }
                            }
                          }}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Từ chối
                        </Button>
                      )}
                      
                      {/* Nút Đã nhận - Admin hoặc người nhận và phiếu đã xuất */}
                      {canConfirmReceive(exp) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50"
                          onClick={() => updateExportStatus(exp.soPhieu, 'received')}
                        >
                          <UserCheckIcon className="w-3 h-3 mr-1" /> Đã nhận
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedExport(exp); setViewOpen(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {exportsList.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-gray-400">
                    Chưa có phiếu xuất nào. Nhấn "Thêm phiếu xuất" để tạo mới hoặc "Import Excel" để nhập từ file.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">✏️ Chỉnh sửa phiếu xuất</DialogTitle>
            <p className="text-sm text-gray-500">Sửa thông tin phiếu {editFormData?.soPhieu}</p>
          </DialogHeader>
          
          {editFormData && (
            <div className="space-y-4">
              {/* Thông tin phiếu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Số phiếu</Label>
                  <Input value={editFormData.soPhieu} disabled className="bg-gray-100" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Ngày xuất</Label>
                  <Input
                    type="date"
                    value={editFormData.ngayXuat}
                    onChange={(e) => setEditFormData({...editFormData, ngayXuat: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Dự án</Label>
                  <Input
                    value={editFormData.duAn}
                    onChange={(e) => setEditFormData({...editFormData, duAn: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Kho xuất</Label>
                  <Input
                    value={editFormData.khoXuat}
                    onChange={(e) => setEditFormData({...editFormData, khoXuat: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Người xuất</Label>
                  <Input
                    value={editFormData.nguoiXuat}
                    onChange={(e) => setEditFormData({...editFormData, nguoiXuat: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Người nhận</Label>
                  <Input
                    value={editFormData.nguoiNhan}
                    onChange={(e) => setEditFormData({...editFormData, nguoiNhan: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">Ghi chú</Label>
                  <Textarea
                    value={editFormData.ghiChu}
                    onChange={(e) => setEditFormData({...editFormData, ghiChu: e.target.value})}
                    rows={2}
                  />
                </div>
              </div>
              
              {/* Danh sách items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Danh sách vật tư</h4>
                  <Button variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="w-4 h-4 mr-1" /> Thêm dòng
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium">Tên vật tư</th>
                          <th className="px-3 py-2 text-right text-xs font-medium">SL</th>
                          <th className="px-3 py-2 text-left text-xs font-medium">Đơn vị</th>
                          <th className="px-3 py-2 text-left text-xs font-medium">Job No</th>
                          <th className="px-3 py-2 text-right text-xs font-medium">Đơn giá</th>
                          <th className="px-3 py-2 text-right text-xs font-medium">Thành tiền</th>
                          <th className="px-3 py-2 text-center text-xs font-medium">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editFormData.items.map((item: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2">
                              <Input
                                value={item.tenChungLoai}
                                onChange={(e) => handleEditItemChange(idx, 'tenChungLoai', e.target.value)}
                                placeholder="Tên vật tư"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                value={item.soLuong}
                                onChange={(e) => handleEditItemChange(idx, 'soLuong', Number(e.target.value))}
                                className="text-right"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={item.donVi}
                                onChange={(e) => handleEditItemChange(idx, 'donVi', e.target.value)}
                                placeholder="Đơn vị"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={item.jobNo}
                                onChange={(e) => handleEditItemChange(idx, 'jobNo', e.target.value)}
                                placeholder="Job No"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                value={item.donGia}
                                onChange={(e) => handleEditItemChange(idx, 'donGia', Number(e.target.value))}
                                className="text-right"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {(item.soLuong * item.donGia).toLocaleString('vi-VN')} ₫
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-red-500 hover:text-red-700"
                                disabled={editFormData.items.length <= 1}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={5} className="px-3 py-2 text-right font-bold">
                            Tổng cộng:
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-green-600">
                            {editFormData.items.reduce((sum: number, item: any) => sum + (item.soLuong * item.donGia), 0).toLocaleString('vi-VN')} ₫
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Nút lưu */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setEditOpen(false);
                  setEditFormData(null);
                }}>
                  Hủy
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSaving ? (
                    '⏳ Đang lưu...'
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Lưu thay đổi
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal xem chi tiết phiếu */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Chi tiết phiếu xuất</DialogTitle></DialogHeader>
          {selectedExport && <PhieuXuatContent data={selectedExport} />}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setViewOpen(false)}>Đóng</Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" /> In / Lưu PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận duyệt hàng loạt */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận duyệt</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Bạn có chắc chắn muốn duyệt <strong>{selectedIds.size}</strong> phiếu xuất đã chọn?
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Các phiếu ở trạng thái <span className="font-semibold">"Chờ duyệt"</span> sẽ được chuyển sang <span className="font-semibold text-blue-600">"Đã duyệt"</span>
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={isApproving}>
              Hủy
            </Button>
            <Button 
              onClick={confirmApprove}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApproving ? 'Đang xử lý...' : 'Xác nhận duyệt'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận nhận hàng loạt */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận đã nhận</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Bạn có chắc chắn muốn xác nhận <strong>đã nhận</strong> {selectedIds.size} phiếu xuất đã chọn?
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Các phiếu ở trạng thái <span className="font-semibold">"Đã xuất"</span> sẽ được chuyển sang <span className="font-semibold text-green-600">"Đã nhận"</span>
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)} disabled={isReceiving}>
              Hủy
            </Button>
            <Button 
              onClick={confirmReceive}
              disabled={isReceiving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isReceiving ? 'Đang xử lý...' : 'Xác nhận đã nhận'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận xuất hàng loạt */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xuất</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Bạn có chắc chắn muốn xác nhận xuất <strong>{selectedIds.size}</strong> phiếu xuất đã chọn?
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Các phiếu ở trạng thái <span className="font-semibold">"Đã duyệt"</span> sẽ được chuyển sang <span className="font-semibold text-indigo-600">"Đã xuất"</span>
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)} disabled={isTransferring}>
              Hủy
            </Button>
            <Button 
              onClick={confirmTransfer}
              disabled={isTransferring}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isTransferring ? 'Đang xử lý...' : 'Xác nhận xuất'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog từ chối hàng loạt */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận từ chối</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p>
              Bạn có chắc chắn muốn từ chối <strong>{selectedIds.size}</strong> phiếu xuất đã chọn?
            </p>
            <div>
              <label className="text-sm font-medium">Lý do từ chối:</label>
              <textarea
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                rows={3}
                placeholder="Nhập lý do từ chối..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => {
              setRejectDialogOpen(false);
              setRejectReason('');
            }} disabled={isRejecting}>
              Hủy
            </Button>
            <Button 
              onClick={confirmReject}
              disabled={isRejecting || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRejecting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default XuatKho;