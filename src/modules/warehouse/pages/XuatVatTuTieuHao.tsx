// src/modules/warehouse/pages/XuatVatTuTieuHao.tsx
import React, { useState, useEffect } from 'react';
import { ConsumableExport } from '@/modules/warehouse/components/ConsumableExport';
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

interface ConsumableRecord {
  soPhieu: string;
  ngayXuat: string;
  mayMoc: string;
  nguoiNhan: string;
  nguoiDuyet?: string;
  nguoiXacNhanXuat?: string;
  nguoiNhanXacNhan?: string;
  lyDo?: string;
  ghiChu?: string;
  lyDoTuChoi?: string;
  totalValue: number;
  status: 'pending' | 'approved' | 'transferred' | 'received' | 'rejected';
  items: Array<{
    itemName: string;
    quantity: number;
    unit: string;
    price: number;
    totalValue: number;
  }>;
  createdAt: string;
  approvedAt?: string;
  transferredAt?: string;
  receivedAt?: string;
  rejectedAt?: string;
}

export const XuatVatTuTieuHao: React.FC = () => {
  const { user } = useAuth();
  const { canEdit } = usePermission();
  const canEditOrDelete = canEdit('xuat_dau');
  const canEditData = canEdit('xuat_dau');
  const isAdmin = user?.role === 'admin';
  
  const [open, setOpen] = useState(false);
  const [exportsList, setExportsList] = useState<ConsumableRecord[]>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedExport, setSelectedExport] = useState<ConsumableRecord | null>(null);
  
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
  
  // State cho xác nhận xuất hàng loạt
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  
  // State cho nhận hàng loạt
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  
  // State cho từ chối
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const loadExports = () => {
    try {
      const data = localStorage.getItem('consumableExports');
      if (data) {
        const parsed = JSON.parse(data);
        const withStatus = parsed.map((exp: any) => ({
          ...exp,
          status: exp.status || 'pending'
        }));
        setExportsList(withStatus);
        setSelectedIds(new Set());
        setIsAllSelected(false);
        localStorage.setItem('consumableExports', JSON.stringify(withStatus));
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
    toast.success('Phiếu xuất vật tư đã được thêm');
  };

  // Cập nhật trạng thái
  const updateExportStatus = (soPhieu: string, newStatus: 'approved' | 'transferred' | 'received' | 'rejected', lyDo?: string) => {
    const updatedList = exportsList.map(exp => {
      if (exp.soPhieu === soPhieu) {
        const updated: ConsumableRecord = { ...exp, status: newStatus };
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
    localStorage.setItem('consumableExports', JSON.stringify(updatedList));
    
    const statusMessages = {
      approved: 'đã được duyệt',
      transferred: 'đã được xác nhận xuất',
      received: 'đã được xác nhận nhận',
      rejected: 'đã bị từ chối'
    };
    
    toast.success(`Phiếu ${soPhieu} ${statusMessages[newStatus]}`);
  };

  // ===== EDIT HANDLERS =====
  const handleEdit = (exp: ConsumableRecord) => {
    setEditFormData({
      soPhieu: exp.soPhieu,
      ngayXuat: exp.ngayXuat,
      mayMoc: exp.mayMoc,
      nguoiNhan: exp.nguoiNhan,
      lyDo: exp.lyDo || '',
      ghiChu: exp.ghiChu || '',
      items: exp.items.map(item => ({ ...item })),
      totalValue: exp.totalValue
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;
    
    setIsSaving(true);
    try {
      // Tính lại tổng tiền
      const newTotalValue = editFormData.items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0);
      
      // Cập nhật dữ liệu
      const updatedExports = exportsList.map(exp => {
        if (exp.soPhieu === editFormData.soPhieu) {
          return {
            ...exp,
            ngayXuat: editFormData.ngayXuat,
            mayMoc: editFormData.mayMoc,
            nguoiNhan: editFormData.nguoiNhan,
            lyDo: editFormData.lyDo,
            ghiChu: editFormData.ghiChu,
            items: editFormData.items.map((item: any) => ({
              ...item,
              totalValue: item.quantity * item.price
            })),
            totalValue: newTotalValue
          };
        }
        return exp;
      });
      
      localStorage.setItem('consumableExports', JSON.stringify(updatedExports));
      setExportsList(updatedExports);
      
      setEditOpen(false);
      setEditFormData(null);
      toast.success('Đã cập nhật phiếu xuất vật tư thành công!');
      loadExports();
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Lỗi cập nhật phiếu xuất vật tư');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditItemChange = (index: number, field: string, value: any) => {
    const newItems = [...editFormData.items];
    newItems[index][field] = value;
    if (field === 'quantity' || field === 'price') {
      newItems[index].totalValue = newItems[index].quantity * newItems[index].price;
    }
    setEditFormData({ ...editFormData, items: newItems });
  };

  const handleAddItem = () => {
    setEditFormData({
      ...editFormData,
      items: [...editFormData.items, {
        itemName: '',
        quantity: 0,
        unit: '',
        price: 0,
        totalValue: 0
      }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = editFormData.items.filter((_: any, i: number) => i !== index);
    setEditFormData({ ...editFormData, items: newItems });
  };

  // Kiểm tra quyền
  const canApproveExport = (exp: ConsumableRecord) => {
    return isAdmin && exp.status === 'pending';
  };

  const canConfirmTransfer = (exp: ConsumableRecord) => {
    return isAdmin && exp.status === 'approved';
  };

  const canConfirmReceive = (exp: ConsumableRecord) => {
    const currentUserName = user?.fullName || user?.name;
    return (isAdmin || (currentUserName && currentUserName === exp.nguoiNhan)) && exp.status === 'transferred';
  };

  const canReject = (exp: ConsumableRecord) => {
    return isAdmin && (exp.status === 'pending' || exp.status === 'approved');
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

  // ========== DUYỆT HÀNG LOẠT ==========
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
    
    setApproveDialogOpen(true);
  };

  const confirmApprove = async () => {
    setIsApproving(true);
    try {
      let approvedCount = 0;
      const now = new Date().toISOString();
      const currentUser = user?.fullName || user?.name || 'System';
      
      const updatedList = exportsList.map(exp => {
        if (selectedIds.has(exp.soPhieu) && exp.status === 'pending') {
          approvedCount++;
          return {
            ...exp,
            status: 'approved' as const,
            approvedAt: now,
            nguoiDuyet: currentUser
          };
        }
        return exp;
      });
      
      localStorage.setItem('consumableExports', JSON.stringify(updatedList));
      setExportsList(updatedList);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      
      toast.success(`Đã duyệt thành công ${approvedCount} phiếu xuất vật tư`);
      setApproveDialogOpen(false);
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Lỗi khi duyệt phiếu xuất vật tư');
    } finally {
      setIsApproving(false);
    }
  };

  // ========== XÁC NHẬN XUẤT HÀNG LOẠT ==========
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
      
      localStorage.setItem('consumableExports', JSON.stringify(updatedList));
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

  // ========== NHẬN HÀNG LOẠT ==========
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
      
      localStorage.setItem('consumableExports', JSON.stringify(updatedList));
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

  // ========== TỪ CHỐI HÀNG LOẠT ==========
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
      
      localStorage.setItem('consumableExports', JSON.stringify(updatedList));
      setExportsList(updatedList);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      
      toast.success(`Đã từ chối thành công ${rejectedCount} phiếu xuất vật tư`);
      setRejectDialogOpen(false);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Lỗi khi từ chối phiếu xuất vật tư');
    } finally {
      setIsRejecting(false);
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
          'Ngày xuất': 'ngayXuat',
          'Máy móc': 'mayMoc',
          'Người nhận': 'nguoiNhan',
          'Lý do': 'lyDo',
          'Tên vật tư': 'itemName',
          'Số lượng': 'quantity',
          'Đơn vị': 'unit',
          'Đơn giá': 'price',
          'Thành tiền': 'totalValue',
          'Ghi chú': 'ghiChu'
        };

        const requiredFields = ['Ngày xuất', 'Máy móc', 'Người nhận', 'Tên vật tư', 'Số lượng', 'Đơn vị', 'Đơn giá'];
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

          mappedRow.quantity = Number(mappedRow.quantity) || 1;
          mappedRow.price = Number(String(mappedRow.price).replace(/,/g, '')) || 0;
          mappedRow.totalValue = Number(String(mappedRow.totalValue).replace(/,/g, '')) || 0;
          
          if (!mappedRow.totalValue || mappedRow.totalValue === 0) {
            mappedRow.totalValue = mappedRow.quantity * mappedRow.price;
          }

          mappedRow.nguoiNhan = mappedRow.nguoiNhan || '';
          mappedRow.mayMoc = mappedRow.mayMoc || '';
          mappedRow.lyDo = mappedRow.lyDo || '';

          mappedRow.soPhieu = `VT${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
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
        const key = `${row.mayMoc || 'unknown'}_${row.ngayXuat}`;
        
        if (!acc[key]) {
          acc[key] = {
            soPhieu: `VT${Date.now()}_${Object.keys(acc).length + 1}`,
            ngayXuat: row.ngayXuat || new Date().toISOString().split('T')[0],
            mayMoc: row.mayMoc || '',
            nguoiNhan: row.nguoiNhan || '',
            lyDo: row.lyDo || '',
            ghiChu: row.ghiChu || '',
            status: 'pending',
            items: [],
            totalValue: 0,
            createdAt: new Date().toISOString()
          };
        }
        
        acc[key].items.push({
          itemName: row.itemName,
          quantity: row.quantity,
          unit: row.unit,
          price: row.price,
          totalValue: row.totalValue
        });
        acc[key].totalValue += row.totalValue;
        
        return acc;
      }, {});

      const importRecords = Object.values(groupedData) as ConsumableRecord[];
      
      const existingExports = JSON.parse(localStorage.getItem('consumableExports') || '[]');
      const updatedExports = [...existingExports, ...importRecords];
      localStorage.setItem('consumableExports', JSON.stringify(updatedExports));
      
      setExportsList(updatedExports);
      
      toast.success(`Import thành công ${importRecords.length} phiếu xuất vật tư`);
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
      localStorage.setItem('consumableExports', JSON.stringify(remainingExports));
      setExportsList(remainingExports);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      
      toast.success(`Đã xóa thành công ${selectedIds.size} phiếu xuất vật tư`);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Lỗi khi xóa phiếu xuất vật tư');
    } finally {
      setIsDeleting(false);
    }
  };

  // ========== IN PDF ==========
  const handlePrint = () => {
    const printContent = document.getElementById('phieu-vat-tu-content');
    if (!printContent || !selectedExport) return;
    const originalTitle = document.title;
    document.title = `PhieuVTTH_${selectedExport.soPhieu}`;
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
  const PhieuVatTuContent = ({ data }: { data: ConsumableRecord }) => (
    <div id="phieu-vat-tu-content">
      <h2 style={{ textAlign: 'center', marginBottom: 20 }}>PHIẾU XUẤT VẬT TƯ TIÊU HAO</h2>
      <div style={{ marginBottom: 20 }}>
        <p><strong>Số phiếu:</strong> {data.soPhieu}</p>
        <p><strong>Ngày xuất:</strong> {data.ngayXuat}</p>
        <p><strong>Máy móc / Bộ phận:</strong> {data.mayMoc}</p>
        <p><strong>Người nhận:</strong> {data.nguoiNhan}</p>
        {data.nguoiDuyet && <p><strong>Người duyệt:</strong> {data.nguoiDuyet}</p>}
        {data.nguoiXacNhanXuat && <p><strong>Người xác nhận xuất:</strong> {data.nguoiXacNhanXuat}</p>}
        {data.nguoiNhanXacNhan && <p><strong>Người xác nhận nhận:</strong> {data.nguoiNhanXacNhan}</p>}
        {data.lyDoTuChoi && <p><strong>Lý do từ chối:</strong> {data.lyDoTuChoi}</p>}
        <p><strong>Lý do xuất:</strong> {data.lyDo || '---'}</p>
        <p><strong>Ghi chú:</strong> {data.ghiChu || '---'}</p>
        <p><strong>Trạng thái:</strong> {
          data.status === 'pending' ? 'Chờ duyệt' : 
          data.status === 'approved' ? 'Đã duyệt' : 
          data.status === 'transferred' ? 'Đã xuất' : 
          data.status === 'received' ? 'Đã nhận' : 
          'Từ chối'
        }</p>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>STT</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>Tên vật tư</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Số lượng</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>Đơn vị</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Đơn giá (₫)</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Thành tiền (₫)</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{idx+1}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{item.itemName}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{item.quantity}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{item.unit}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{item.price.toLocaleString('vi-VN')}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{item.totalValue.toLocaleString('vi-VN')}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 'bold', backgroundColor: '#f9fafb' }}>
            <td colSpan={5} style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Tổng cộng:</td>
            <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{data.totalValue.toLocaleString('vi-VN')} ₫</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // Kiểm tra xem có phiếu nào ở trạng thái "đã duyệt" để hiển thị nút "Xác nhận xuất" không
  const hasTransferableItems = exportsList.some(exp => 
    selectedIds.has(exp.soPhieu) && exp.status === 'approved'
  );

  // Kiểm tra xem có phiếu nào ở trạng thái "đã xuất" để hiển thị nút "Đã nhận" không
  const hasReceivableItems = exportsList.some(exp => 
    selectedIds.has(exp.soPhieu) && exp.status === 'transferred'
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Xuất Vật Tư Tiêu Hao</h1>
        <div className="flex gap-2 flex-wrap">
          {/* Nút Import Excel */}
          <Dialog open={importExcelOpen} onOpenChange={setImportExcelOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" disabled={!canEditOrDelete}>
                <Upload className="w-4 h-4 mr-2" /> Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">Import phiếu xuất vật tư từ Excel</DialogTitle>
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
                    <p><span className="font-semibold">Cột bắt buộc:</span> Ngày xuất, Máy móc, Người nhận, Tên vật tư, Số lượng, Đơn vị, Đơn giá</p>
                    <p><span className="font-semibold">Cột tùy chọn:</span> Thành tiền, Lý do, Ghi chú</p>
                    <p className="text-xs text-blue-600">* Nếu không có cột "Thành tiền", hệ thống sẽ tự động tính = Số lượng × Đơn giá</p>
                    <p className="text-xs text-blue-600">* Các vật tư cùng "Máy móc" và "Ngày xuất" sẽ được nhóm thành 1 phiếu xuất</p>
                  </div>
                  <Button 
                    variant="link" 
                    className="text-blue-700 p-0 h-auto mt-2"
                    onClick={() => {
                      const sampleData = [
                        {
                          'Ngày xuất': '22/01/2025',
                          'Máy móc': 'Máy CNC 001',
                          'Người nhận': 'Nguyễn Văn A',
                          'Lý do': 'Bảo trì máy',
                          'Tên vật tư': 'Dầu bôi trơn',
                          'Số lượng': 5,
                          'Đơn vị': 'Lít',
                          'Đơn giá': 50000,
                          'Thành tiền': 250000,
                          'Ghi chú': 'Dầu bôi trơn cho máy CNC'
                        }
                      ];
                      
                      const ws = XLSX.utils.json_to_sheet(sampleData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
                      XLSX.writeFile(wb, 'mau_phieu_xuat_vat_tu_tieu_hao.xlsx');
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
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ngày xuất</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Máy móc</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Người nhận</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên vật tư</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">SL</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Đơn vị</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Đơn giá</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {excelData.slice(0, 10).map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 text-sm text-gray-900">{idx + 1}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.ngayXuat}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.mayMoc}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.nguoiNhan}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.itemName}</td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">{row.quantity}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{row.unit}</td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">{row.price.toLocaleString('vi-VN')}</td>
                              <td className="px-4 py-2 text-sm text-right text-gray-900">{row.totalValue.toLocaleString('vi-VN')}</td>
                            </tr>
                          ))}
                          {excelData.length > 10 && (
                            <tr>
                              <td colSpan={9} className="px-4 py-2 text-sm text-gray-500 text-center">
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
              <Button className="bg-teal-600 hover:bg-teal-700" disabled={!canEditOrDelete}>
                <Plus className="w-4 h-4 mr-2" /> Thêm phiếu xuất
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">Tạo phiếu xuất vật tư tiêu hao mới</DialogTitle>
              </DialogHeader>
              <ConsumableExport onSuccess={handleSuccess} />
            </DialogContent>
          </Dialog>

          {/* Nút Duyệt - Admin */}
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

          {/* Nút Xác nhận xuất - Admin */}
          {isAdmin && hasTransferableItems && (
            <Button 
              variant="outline"
              onClick={handleTransferSelected}
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <Truck className="w-4 h-4 mr-2" />
              Xác nhận xuất ({selectedIds.size})
            </Button>
          )}

          {/* Nút Đã nhận - Admin hoặc người nhận */}
          {hasReceivableItems && (
            <Button 
              variant="outline"
              onClick={handleReceiveSelected}
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              <UserCheckIcon className="w-4 h-4 mr-2" />
              Đã nhận ({selectedIds.size})
            </Button>
          )}

          {/* Nút Từ chối - Admin */}
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
          {canEditOrDelete && (
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máy móc</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người nhận</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.mayMoc}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.nguoiNhan}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-teal-600 font-semibold">
                    {exp.totalValue.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">{getStatusBadge(exp.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {/* Nút Chỉnh sửa */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(exp)}
                        className="text-blue-600 hover:text-blue-800"
                        disabled={!canEditData}
                        title="Chỉnh sửa phiếu xuất vật tư"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      {/* Admin buttons */}
                      {isAdmin && (
                        <>
                          {canApproveExport(exp) && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-600 border-green-300 hover:bg-green-50" 
                                onClick={() => updateExportStatus(exp.soPhieu, 'approved')}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" /> Duyệt
                              </Button>
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
                            </>
                          )}
                          {canConfirmTransfer(exp) && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-blue-600 border-blue-300 hover:bg-blue-50" 
                              onClick={() => updateExportStatus(exp.soPhieu, 'transferred')}
                            >
                              <Truck className="w-3 h-3 mr-1" /> Xác nhận xuất
                            </Button>
                          )}
                        </>
                      )}
                      
                      {/* Nút "Đã nhận" - Admin hoặc người nhận */}
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
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-400">
                    Chưa có phiếu xuất vật tư nào. Nhấn "Thêm phiếu xuất" để tạo mới hoặc "Import Excel" để nhập từ file.
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
            <DialogTitle className="text-xl">✏️ Chỉnh sửa phiếu xuất vật tư</DialogTitle>
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
                  <Label className="text-sm font-medium">Máy móc</Label>
                  <Input
                    value={editFormData.mayMoc}
                    onChange={(e) => setEditFormData({...editFormData, mayMoc: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Người nhận</Label>
                  <Input
                    value={editFormData.nguoiNhan}
                    onChange={(e) => setEditFormData({...editFormData, nguoiNhan: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Lý do xuất</Label>
                  <Input
                    value={editFormData.lyDo}
                    onChange={(e) => setEditFormData({...editFormData, lyDo: e.target.value})}
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
                                value={item.itemName}
                                onChange={(e) => handleEditItemChange(idx, 'itemName', e.target.value)}
                                placeholder="Tên vật tư"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleEditItemChange(idx, 'quantity', Number(e.target.value))}
                                className="text-right"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                value={item.unit}
                                onChange={(e) => handleEditItemChange(idx, 'unit', e.target.value)}
                                placeholder="Đơn vị"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                value={item.price}
                                onChange={(e) => handleEditItemChange(idx, 'price', Number(e.target.value))}
                                className="text-right"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              {(item.quantity * item.price).toLocaleString('vi-VN')} ₫
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
                          <td colSpan={4} className="px-3 py-2 text-right font-bold">
                            Tổng cộng:
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-green-600">
                            {editFormData.items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0).toLocaleString('vi-VN')} ₫
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Chi tiết phiếu xuất</DialogTitle></DialogHeader>
          {selectedExport && <PhieuVatTuContent data={selectedExport} />}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setViewOpen(false)}>Đóng</Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" /> In / Lưu PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận xóa */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Bạn có chắc chắn muốn xóa <strong>{selectedIds.size}</strong> phiếu xuất vật tư đã chọn?
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
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Đang xóa...' : 'Xóa'}
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
              Bạn có chắc chắn muốn duyệt <strong>{selectedIds.size}</strong> phiếu xuất vật tư đã chọn?
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
              className="bg-green-600 hover:bg-green-700"
            >
              {isApproving ? 'Đang xử lý...' : 'Xác nhận duyệt'}
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
              Bạn có chắc chắn muốn xác nhận xuất <strong>{selectedIds.size}</strong> phiếu xuất vật tư đã chọn?
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

      {/* Dialog xác nhận nhận hàng loạt */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận đã nhận</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Bạn có chắc chắn muốn xác nhận <strong>đã nhận</strong> {selectedIds.size} phiếu xuất vật tư đã chọn?
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

      {/* Dialog từ chối hàng loạt */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận từ chối</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p>
              Bạn có chắc chắn muốn từ chối <strong>{selectedIds.size}</strong> phiếu xuất vật tư đã chọn?
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

export default XuatVatTuTieuHao;