// src/modules/warehouse/pages/ChuyenKho.tsx
import React, { useState, useEffect } from 'react';
import { WarehouseTransfer } from '@/modules/warehouse/components/WarehouseTransfer';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Eye, Download, Truck, UserCheck, Upload, X, Trash2, CheckSquare, Square, CheckCircle, Clock, AlertCircle, UserCheck as UserCheckIcon, Edit, Save, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TransferRecord {
  soPhieu: string;
  ngayChuyen: string;
  duAn: string;
  khoXuat: string;
  khoNhap: string;
  nguoiThucHien: string;
  nguoiDuyet?: string;
  nguoiXacNhanChuyen?: string;
  nguoiNhan?: string;
  ghiChu?: string;
  lyDoTuChoi?: string;
  status: 'pending' | 'approved' | 'transferred' | 'received' | 'rejected';
  items: Array<{
    tenChungLoai: string;
    soLuong: number;
    donVi: string;
  }>;
  createdAt: string;
  approvedAt?: string;
  transferredAt?: string;
  receivedAt?: string;
  rejectedAt?: string;
}

export const ChuyenKho: React.FC = () => {
  const { user } = useAuth();
  const { canEdit } = usePermission();
  const canAddOrEdit = canEdit('chuyen_kho');
  const canDelete = canEdit('chuyen_kho');
  const canEditData = canEdit('chuyen_kho');
  const isAdmin = user?.role === 'admin';
  
  const [open, setOpen] = useState(false);
  const [transfersList, setTransfersList] = useState<TransferRecord[]>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRecord | null>(null);
  
  // State cho Import Excel
  const [importExcelOpen, setImportExcelOpen] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State cho chọn và xóa
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
  
  // State cho chuyển hàng loạt
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  
  // State cho nhận hàng loạt
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  
  // State cho từ chối
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const loadTransfers = () => {
    try {
      const data = localStorage.getItem('warehouseTransfers');
      if (data) {
        const parsed = JSON.parse(data);
        const withStatus = parsed.map((t: any) => ({
          ...t,
          status: t.status || 'pending'
        }));
        setTransfersList(withStatus);
        setSelectedIds(new Set());
        setIsAllSelected(false);
        localStorage.setItem('warehouseTransfers', JSON.stringify(withStatus));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, []);

  const handleSuccess = () => {
    setOpen(false);
    loadTransfers();
    toast.success('Phiếu chuyển kho đã được thêm');
  };

  // Cập nhật trạng thái
  const updateTransferStatus = (soPhieu: string, newStatus: 'approved' | 'transferred' | 'received' | 'rejected', lyDo?: string) => {
    const updatedList = transfersList.map(t => {
      if (t.soPhieu === soPhieu) {
        const updated: TransferRecord = { ...t, status: newStatus };
        
        const now = new Date().toISOString();
       const currentUser = user?.fullName || user?.ho_ten || 'System';
        
        if (newStatus === 'approved') {
          updated.approvedAt = now;
          updated.nguoiDuyet = currentUser;
        } else if (newStatus === 'transferred') {
          updated.transferredAt = now;
          updated.nguoiXacNhanChuyen = currentUser;
        } else if (newStatus === 'received') {
          updated.receivedAt = now;
          updated.nguoiNhan = currentUser;
        } else if (newStatus === 'rejected') {
          updated.rejectedAt = now;
          updated.lyDoTuChoi = lyDo || 'Không có lý do';
        }
        
        return updated;
      }
      return t;
    });
    
    setTransfersList(updatedList);
    localStorage.setItem('warehouseTransfers', JSON.stringify(updatedList));
    
    const statusMessages = {
      approved: 'đã được duyệt',
      transferred: 'đã được xác nhận chuyển',
      received: 'đã được xác nhận nhận',
      rejected: 'đã bị từ chối'
    };
    
    toast.success(`Phiếu ${soPhieu} ${statusMessages[newStatus]}`);
  };

  // ===== EDIT HANDLERS =====
  const handleEdit = (t: TransferRecord) => {
    setEditFormData({
      soPhieu: t.soPhieu,
      ngayChuyen: t.ngayChuyen,
      duAn: t.duAn,
      khoXuat: t.khoXuat,
      khoNhap: t.khoNhap,
      nguoiThucHien: t.nguoiThucHien,
      ghiChu: t.ghiChu || '',
      items: t.items.map(item => ({ ...item })),
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;
    
    setIsSaving(true);
    try {
      const updatedTransfers = transfersList.map(t => {
        if (t.soPhieu === editFormData.soPhieu) {
          return {
            ...t,
            ngayChuyen: editFormData.ngayChuyen,
            duAn: editFormData.duAn,
            khoXuat: editFormData.khoXuat,
            khoNhap: editFormData.khoNhap,
            nguoiThucHien: editFormData.nguoiThucHien,
            ghiChu: editFormData.ghiChu,
            items: editFormData.items.map((item: any) => ({
              ...item,
            })),
          };
        }
        return t;
      });
      
      localStorage.setItem('warehouseTransfers', JSON.stringify(updatedTransfers));
      setTransfersList(updatedTransfers);
      
      setEditOpen(false);
      setEditFormData(null);
      toast.success('Đã cập nhật phiếu chuyển kho thành công!');
      loadTransfers();
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Lỗi cập nhật phiếu chuyển kho');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditItemChange = (index: number, field: string, value: any) => {
    const newItems = [...editFormData.items];
    newItems[index][field] = value;
    setEditFormData({ ...editFormData, items: newItems });
  };

  const handleAddItem = () => {
    setEditFormData({
      ...editFormData,
      items: [...editFormData.items, {
        tenChungLoai: '',
        soLuong: 0,
        donVi: ''
      }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = editFormData.items.filter((_: any, i: number) => i !== index);
    setEditFormData({ ...editFormData, items: newItems });
  };

  // Kiểm tra quyền
  const canApproveTransfer = (t: TransferRecord) => {
    return isAdmin && t.status === 'pending';
  };

  const canConfirmTransfer = (t: TransferRecord) => {
  const currentUserName = user?.fullName || user?.ho_ten || '';
  return (isAdmin || (currentUserName && currentUserName === t.nguoiThucHien)) && t.status === 'approved';
};

  const canConfirmReceive = (t: TransferRecord) => {
    return isAdmin && t.status === 'transferred';
  };

  const canReject = (t: TransferRecord) => {
    return isAdmin && t.status === 'pending';
  };

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
          <Truck className="w-3 h-3" /> Đã chuyển
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

  // ========== DUYỆT HÀNG LOẠT ==========
  const handleApproveSelected = () => {
    if (selectedIds.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một phiếu để duyệt');
      return;
    }
    
    const canApproveList = transfersList.filter(t => 
      selectedIds.has(t.soPhieu) && t.status === 'pending'
    );
    
    if (canApproveList.length === 0) {
      toast.warning('Không có phiếu nào ở trạng thái chờ duyệt');
      return;
    }
    
    setApproveDialogOpen(true);
  };

  const confirmApprove = async () => {
    setIsApproving(true);
    try {
      let approvedCount = 0;
      const now = new Date().toISOString();
      const currentUser = user?.fullName || user?.ho_ten || 'System';
      
      const updatedList = transfersList.map(t => {
        if (selectedIds.has(t.soPhieu) && t.status === 'pending') {
          approvedCount++;
          return {
            ...t,
            status: 'approved' as const,
            approvedAt: now,
            nguoiDuyet: currentUser
          };
        }
        return t;
      });
      
      localStorage.setItem('warehouseTransfers', JSON.stringify(updatedList));
      setTransfersList(updatedList);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      
      toast.success(`Đã duyệt thành công ${approvedCount} phiếu chuyển kho`);
      setApproveDialogOpen(false);
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Lỗi khi duyệt phiếu chuyển kho');
    } finally {
      setIsApproving(false);
    }
  };

  // ========== TỪ CHỐI HÀNG LOẠT ==========
  const handleRejectSelected = () => {
    if (selectedIds.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một phiếu để từ chối');
      return;
    }
    
    const canRejectList = transfersList.filter(t => 
      selectedIds.has(t.soPhieu) && t.status === 'pending'
    );
    
    if (canRejectList.length === 0) {
      toast.warning('Không có phiếu nào ở trạng thái chờ duyệt');
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
      
      const updatedList = transfersList.map(t => {
        if (selectedIds.has(t.soPhieu) && t.status === 'pending') {
          rejectedCount++;
          return {
            ...t,
            status: 'rejected' as const,
            rejectedAt: now,
            lyDoTuChoi: rejectReason
          };
        }
        return t;
      });
      
      localStorage.setItem('warehouseTransfers', JSON.stringify(updatedList));
      setTransfersList(updatedList);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      
      toast.success(`Đã từ chối thành công ${rejectedCount} phiếu chuyển kho`);
      setRejectDialogOpen(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Lỗi khi từ chối phiếu chuyển kho');
    } finally {
      setIsRejecting(false);
    }
  };

  // ========== CHUYỂN HÀNG LOẠT ==========
  const handleTransferSelected = () => {
    if (selectedIds.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một phiếu để xác nhận chuyển');
      return;
    }
    
    const canTransferList = transfersList.filter(t => 
      selectedIds.has(t.soPhieu) && t.status === 'approved'
    );
    
    if (canTransferList.length === 0) {
      toast.warning('Không có phiếu nào ở trạng thái đã duyệt');
      return;
    }
    
    setTransferDialogOpen(true);
  };

  const confirmTransfer = async () => {
    setIsTransferring(true);
    try {
      let transferCount = 0;
      const now = new Date().toISOString();
      const currentUser = user?.fullName || user?.ho_ten || 'System';
      
      const updatedList = transfersList.map(t => {
        if (selectedIds.has(t.soPhieu) && t.status === 'approved') {
          transferCount++;
          return {
            ...t,
            status: 'transferred' as const,
            transferredAt: now,
            nguoiXacNhanChuyen: currentUser
          };
        }
        return t;
      });
      
      localStorage.setItem('warehouseTransfers', JSON.stringify(updatedList));
      setTransfersList(updatedList);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      
      toast.success(`Đã xác nhận chuyển thành công ${transferCount} phiếu`);
      setTransferDialogOpen(false);
    } catch (error) {
      console.error('Error transferring:', error);
      toast.error('Lỗi khi xác nhận chuyển phiếu');
    } finally {
      setIsTransferring(false);
    }
  };

  // ========== NHẬN HÀNG LOẠT ==========
  const handleReceiveSelected = () => {
    if (selectedIds.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một phiếu để xác nhận đã nhận');
      return;
    }
    
    const canReceiveList = transfersList.filter(t => 
      selectedIds.has(t.soPhieu) && t.status === 'transferred'
    );
    
    if (canReceiveList.length === 0) {
      toast.warning('Không có phiếu nào ở trạng thái đã chuyển');
      return;
    }
    
    setReceiveDialogOpen(true);
  };

  const confirmReceive = async () => {
    setIsReceiving(true);
    try {
      let receiveCount = 0;
      const now = new Date().toISOString();
      const currentUser = user?.fullName || user?.ho_ten || 'System';
      
      const updatedList = transfersList.map(t => {
        if (selectedIds.has(t.soPhieu) && t.status === 'transferred') {
          receiveCount++;
          return {
            ...t,
            status: 'received' as const,
            receivedAt: now,
            nguoiNhan: currentUser
          };
        }
        return t;
      });
      
      localStorage.setItem('warehouseTransfers', JSON.stringify(updatedList));
      setTransfersList(updatedList);
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
          'Ngày chuyển': 'ngayChuyen',
          'Dự án': 'duAn',
          'Kho xuất': 'khoXuat',
          'Kho nhập': 'khoNhap',
          'Người thực hiện': 'nguoiThucHien',
          'Tên vật tư': 'tenChungLoai',
          'Số lượng': 'soLuong',
          'Đơn vị': 'donVi',
          'Ghi chú': 'ghiChu'
        };

        const requiredFields = ['Ngày chuyển', 'Dự án', 'Kho xuất', 'Kho nhập', 'Người thực hiện', 'Tên vật tư', 'Số lượng', 'Đơn vị'];
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

          mappedRow.soLuong = Number(mappedRow.soLuong) || 1;
          mappedRow.nguoiThucHien = mappedRow.nguoiThucHien || 'Admin';

          mappedRow.soPhieu = `PC${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
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
        const key = `${row.duAn || 'unknown'}_${row.ngayChuyen}`;
        
        if (!acc[key]) {
          acc[key] = {
            soPhieu: `PC${Date.now()}_${Object.keys(acc).length + 1}`,
            ngayChuyen: row.ngayChuyen || new Date().toISOString().split('T')[0],
            duAn: row.duAn || 'Dự án chính',
            khoXuat: row.khoXuat || 'Kho chính',
            khoNhap: row.khoNhap || 'Kho nhập',
            nguoiThucHien: row.nguoiThucHien || 'Admin',
            ghiChu: row.ghiChu || '',
            status: 'pending',
            items: [],
            createdAt: new Date().toISOString()
          };
        }
        
        acc[key].items.push({
          tenChungLoai: row.tenChungLoai,
          soLuong: row.soLuong,
          donVi: row.donVi
        });
        
        return acc;
      }, {});

      const importRecords = Object.values(groupedData) as TransferRecord[];
      
      const existingTransfers = JSON.parse(localStorage.getItem('warehouseTransfers') || '[]');
      const updatedTransfers = [...existingTransfers, ...importRecords];
      localStorage.setItem('warehouseTransfers', JSON.stringify(updatedTransfers));
      
      setTransfersList(updatedTransfers);
      
      toast.success(`Import thành công ${importRecords.length} phiếu chuyển kho`);
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
    setIsAllSelected(newSelected.size === transfersList.length);
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(transfersList.map(t => t.soPhieu));
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
      const remainingTransfers = transfersList.filter(t => !selectedIds.has(t.soPhieu));
      localStorage.setItem('warehouseTransfers', JSON.stringify(remainingTransfers));
      setTransfersList(remainingTransfers);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      
      toast.success(`Đã xóa thành công ${selectedIds.size} phiếu chuyển kho`);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Lỗi khi xóa phiếu chuyển kho');
    } finally {
      setIsDeleting(false);
    }
  };

  // ========== IN PDF ==========
  const handlePrint = () => {
    const printContent = document.getElementById('phieu-chuyen-content');
    if (!printContent || !selectedTransfer) return;
    const originalTitle = document.title;
    document.title = `PhieuChuyen_${selectedTransfer.soPhieu}`;
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
  const PhieuChuyenContent = ({ data }: { data: TransferRecord }) => (
    <div id="phieu-chuyen-content" className="bg-white p-6 rounded-lg">
      <h2 style={{ textAlign: 'center', marginBottom: 20 }}>PHIẾU CHUYỂN KHO</h2>
      <div style={{ marginBottom: 20 }}>
        <p><strong>Số phiếu:</strong> {data.soPhieu}</p>
        <p><strong>Ngày chuyển:</strong> {data.ngayChuyen}</p>
        <p><strong>Dự án:</strong> {data.duAn}</p>
        <p><strong>Kho xuất:</strong> {data.khoXuat}</p>
        <p><strong>Kho nhập:</strong> {data.khoNhap}</p>
        <p><strong>Người thực hiện:</strong> {data.nguoiThucHien}</p>
        {data.nguoiDuyet && <p><strong>Người duyệt:</strong> {data.nguoiDuyet}</p>}
        {data.nguoiXacNhanChuyen && <p><strong>Người xác nhận chuyển:</strong> {data.nguoiXacNhanChuyen}</p>}
        {data.nguoiNhan && <p><strong>Người nhận:</strong> {data.nguoiNhan}</p>}
        {data.lyDoTuChoi && <p><strong>Lý do từ chối:</strong> {data.lyDoTuChoi}</p>}
        <p><strong>Trạng thái:</strong> {
          data.status === 'pending' ? 'Chờ duyệt' : 
          data.status === 'approved' ? 'Đã duyệt' : 
          data.status === 'transferred' ? 'Đã chuyển' : 
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
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{idx+1}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{item.tenChungLoai}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{item.soLuong}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{item.donVi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Kiểm tra xem có phiếu nào ở trạng thái "đã duyệt" để hiển thị nút "Chuyển" không
  const hasTransferableItems = transfersList.some(t => 
    selectedIds.has(t.soPhieu) && t.status === 'approved'
  );

  // Kiểm tra xem có phiếu nào ở trạng thái "đã chuyển" để hiển thị nút "Nhận" không
  const hasReceivableItems = transfersList.some(t => 
    selectedIds.has(t.soPhieu) && t.status === 'transferred'
  );

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chuyển Kho</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý phiếu chuyển kho | <strong>{transfersList.length}</strong> phiếu
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Nút Import Excel */}
          <Dialog open={importExcelOpen} onOpenChange={setImportExcelOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" disabled={!canAddOrEdit}>
                <Upload className="w-4 h-4 mr-2" /> Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-6">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl">Import phiếu chuyển kho từ Excel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors bg-gray-50">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload" className="cursor-pointer block">
                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Click để chọn file Excel hoặc kéo thả vào đây
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Hỗ trợ định dạng .xlsx, .xls
                    </p>
                  </label>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">📋 Cấu trúc file Excel:</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><span className="font-semibold">Cột bắt buộc:</span> Ngày chuyển, Dự án, Kho xuất, Kho nhập, Người thực hiện, Tên vật tư, Số lượng, Đơn vị</p>
                    <p><span className="font-semibold">Cột tùy chọn:</span> Ghi chú</p>
                    <p className="text-xs text-blue-600 mt-1">* Các mặt hàng cùng "Dự án" và "Ngày chuyển" sẽ được nhóm thành 1 phiếu chuyển</p>
                  </div>
                  <Button 
                    variant="link" 
                    className="text-blue-700 p-0 h-auto mt-2"
                    onClick={() => {
                      const sampleData = [
                        {
                          'Ngày chuyển': '22/01/2025',
                          'Dự án': 'Dự án A',
                          'Kho xuất': 'Kho Hà Nội',
                          'Kho nhập': 'Kho Hồ Chí Minh',
                          'Người thực hiện': 'Nguyễn Văn A',
                          'Tên vật tư': 'Xi măng',
                          'Số lượng': 100,
                          'Đơn vị': 'Bao',
                          'Ghi chú': 'Chuyển cho dự án A'
                        }
                      ];
                      
                      const ws = XLSX.utils.json_to_sheet(sampleData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
                      XLSX.writeFile(wb, 'mau_phieu_chuyen_kho.xlsx');
                    }}
                  >
                    📥 Tải file mẫu
                  </Button>
                </div>

                {excelData.length > 0 && (
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">📊 Dữ liệu đã đọc ({excelData.length} dòng)</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setExcelData([])}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" /> Xóa
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ngày chuyển</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dự án</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kho xuất</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kho nhập</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên vật tư</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">SL</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {excelData.slice(0, 10).map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm text-gray-900">{idx + 1}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.ngayChuyen}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.duAn}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.khoXuat}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.khoNhap}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.tenChungLoai}</td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">{row.soLuong}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.donVi}</td>
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

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => {
                    setImportExcelOpen(false);
                    setExcelData([]);
                  }}>
                    Hủy
                  </Button>
                  <Button 
                    onClick={handleImportExcel}
                    disabled={excelData.length === 0 || isProcessing}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isProcessing ? '⏳ Đang xử lý...' : '📤 Import dữ liệu'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Nút Thêm phiếu chuyển */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700" disabled={!canAddOrEdit}>
                <Plus className="w-4 h-4 mr-2" /> Thêm phiếu chuyển
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white p-6">
              <DialogHeader>
                <DialogTitle className="text-xl">Tạo phiếu chuyển kho mới</DialogTitle>
              </DialogHeader>
              <WarehouseTransfer onSuccess={handleSuccess} />
            </DialogContent>
          </Dialog>

          {/* Nút Duyệt hàng loạt - Admin */}
          {isAdmin && (
            <Button 
              variant="outline"
              onClick={handleApproveSelected}
              disabled={selectedIds.size === 0}
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Duyệt ({selectedIds.size})
            </Button>
          )}

          {/* Nút Từ chối hàng loạt - Admin */}
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

          {/* Nút Chuyển hàng loạt - Admin hoặc người thực hiện */}
          {hasTransferableItems && (
            <Button 
              variant="outline"
              onClick={handleTransferSelected}
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <Truck className="w-4 h-4 mr-2" />
              Chuyển ({selectedIds.size})
            </Button>
          )}

          {/* Nút Nhận hàng loạt - Admin */}
          {isAdmin && hasReceivableItems && (
            <Button 
              variant="outline"
              onClick={handleReceiveSelected}
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              <UserCheckIcon className="w-4 h-4 mr-2" />
              Nhận ({selectedIds.size})
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

      {/* FILTERS */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="🔍 Tìm kiếm theo số phiếu, dự án, kho..."
            className="w-full"
          />
        </div>
        <div className="min-w-[180px]">
          <Input
            type="date"
            className="w-full"
          />
        </div>
        <Badge variant="secondary" className="ml-auto">
          {transfersList.length} phiếu
        </Badge>
      </div>

      {/* Bảng danh sách phiếu chuyển */}
      <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="p-0 h-8 w-8"
                    disabled={transfersList.length === 0}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </Button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số phiếu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày chuyển</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dự án</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kho xuất</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kho nhập</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người thực hiện</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transfersList.map((t) => (
                <tr key={t.soPhieu} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSelect(t.soPhieu)}
                      className="p-0 h-8 w-8"
                    >
                      {selectedIds.has(t.soPhieu) ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.soPhieu}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.ngayChuyen}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.duAn}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.khoXuat}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.khoNhap}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.nguoiThucHien}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">{getStatusBadge(t.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {/* Nút Chỉnh sửa */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(t)}
                        className="text-blue-600 hover:text-blue-800"
                        disabled={!canEditData}
                        title="Chỉnh sửa phiếu chuyển kho"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      {/* Nút Duyệt - Admin */}
                      {isAdmin && canApproveTransfer(t) && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 border-green-300 hover:bg-green-50" 
                          onClick={() => updateTransferStatus(t.soPhieu, 'approved')}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" /> Duyệt
                        </Button>
                      )}
                      
                      {/* Nút Từ chối - Admin */}
                      {isAdmin && canReject(t) && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 border-red-300 hover:bg-red-50" 
                          onClick={() => {
                            const reason = window.prompt('Nhập lý do từ chối:');
                            if (reason !== null) {
                              if (reason.trim()) {
                                updateTransferStatus(t.soPhieu, 'rejected', reason);
                              } else {
                                toast.warning('Vui lòng nhập lý do từ chối');
                              }
                            }
                          }}
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Từ chối
                        </Button>
                      )}
                      
                      {/* Nút Chuyển - Admin hoặc người thực hiện */}
                      {canConfirmTransfer(t) && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-blue-600 border-blue-300 hover:bg-blue-50" 
                          onClick={() => updateTransferStatus(t.soPhieu, 'transferred')}
                        >
                          <Truck className="w-3 h-3 mr-1" /> Chuyển
                        </Button>
                      )}
                      
                      {/* Nút Nhận - Admin */}
                      {isAdmin && canConfirmReceive(t) && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 border-green-300 hover:bg-green-50" 
                          onClick={() => updateTransferStatus(t.soPhieu, 'received')}
                        >
                          <UserCheckIcon className="w-3 h-3 mr-1" /> Nhận
                        </Button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedTransfer(t); setViewOpen(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {transfersList.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-center text-gray-400">
                    Chưa có phiếu chuyển nào. Nhấn "Thêm phiếu chuyển" để tạo mới hoặc "Import Excel" để nhập từ file.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">✏️ Chỉnh sửa phiếu chuyển kho</DialogTitle>
            <p className="text-sm text-gray-500">Sửa thông tin phiếu {editFormData?.soPhieu}</p>
          </DialogHeader>
          
          {editFormData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Số phiếu</Label>
                  <Input value={editFormData.soPhieu} disabled className="bg-gray-100" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Ngày chuyển</Label>
                  <Input
                    type="date"
                    value={editFormData.ngayChuyen}
                    onChange={(e) => setEditFormData({...editFormData, ngayChuyen: e.target.value})}
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
                  <Label className="text-sm font-medium">Kho nhập</Label>
                  <Input
                    value={editFormData.khoNhap}
                    onChange={(e) => setEditFormData({...editFormData, khoNhap: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Người thực hiện</Label>
                  <Input
                    value={editFormData.nguoiThucHien}
                    onChange={(e) => setEditFormData({...editFormData, nguoiThucHien: e.target.value})}
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
                    </table>
                  </div>
                </div>
              </div>
              
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">📄 Chi tiết phiếu chuyển</DialogTitle>
          </DialogHeader>
          {selectedTransfer && <PhieuChuyenContent data={selectedTransfer} />}
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setViewOpen(false)}>Đóng</Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="w-4 h-4 mr-2" /> In / Lưu PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận xóa */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white p-6">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Bạn có chắc chắn muốn xóa <strong>{selectedIds.size}</strong> phiếu chuyển kho đã chọn?
            </p>
            <p className="text-red-500 text-sm mt-2">Hành động này không thể hoàn tác!</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Hủy
            </Button>
            <Button 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? '⏳ Đang xóa...' : 'Xóa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận duyệt hàng loạt */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="bg-white p-6">
          <DialogHeader>
            <DialogTitle>Xác nhận duyệt</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Bạn có chắc chắn muốn duyệt <strong>{selectedIds.size}</strong> phiếu chuyển kho đã chọn?
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Các phiếu ở trạng thái <span className="font-semibold">"Chờ duyệt"</span> sẽ được chuyển sang <span className="font-semibold text-green-600">"Đã duyệt"</span>
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={isApproving}>
              Hủy
            </Button>
            <Button 
              onClick={confirmApprove}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isApproving ? '⏳ Đang xử lý...' : 'Xác nhận duyệt'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận từ chối hàng loạt */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-white p-6">
          <DialogHeader>
            <DialogTitle>Xác nhận từ chối</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p>
              Bạn có chắc chắn muốn từ chối <strong>{selectedIds.size}</strong> phiếu chuyển kho đã chọn?
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
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRejecting ? '⏳ Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận chuyển hàng loạt */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="bg-white p-6">
          <DialogHeader>
            <DialogTitle>Xác nhận chuyển</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Bạn có chắc chắn muốn xác nhận <strong>chuyển</strong> {selectedIds.size} phiếu chuyển kho đã chọn?
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Các phiếu ở trạng thái <span className="font-semibold">"Đã duyệt"</span> sẽ được chuyển sang <span className="font-semibold text-blue-600">"Đã chuyển"</span>
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)} disabled={isTransferring}>
              Hủy
            </Button>
            <Button 
              onClick={confirmTransfer}
              disabled={isTransferring}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isTransferring ? '⏳ Đang xử lý...' : 'Xác nhận chuyển'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận nhận hàng loạt */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="bg-white p-6">
          <DialogHeader>
            <DialogTitle>Xác nhận đã nhận</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Bạn có chắc chắn muốn xác nhận <strong>đã nhận</strong> {selectedIds.size} phiếu chuyển kho đã chọn?
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Các phiếu ở trạng thái <span className="font-semibold">"Đã chuyển"</span> sẽ được chuyển sang <span className="font-semibold text-green-600">"Đã nhận"</span>
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)} disabled={isReceiving}>
              Hủy
            </Button>
            <Button 
              onClick={confirmReceive}
              disabled={isReceiving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isReceiving ? '⏳ Đang xử lý...' : 'Xác nhận đã nhận'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChuyenKho;