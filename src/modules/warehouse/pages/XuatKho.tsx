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
import { listDocuments, deleteDocument, createDocument } from '@/api/stockDocument';
import { validateStock } from '@/api/warehouse';
import { postStockDocument } from '@/api/stock';
import { getSupabase } from '@/supabase';
import { WarehouseTransaction } from '@/types/inventory';

interface ExportRecord {
  id: string;
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
  items: Array<{ tenChungLoai: string; soLuong: number; donVi: string; donGia: number; thanhTien: number; jobNo?: string; }>;
  createdAt: string;
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
  
  const [editOpen, setEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // ===== LOAD DATA TỪ SUPABASE =====
  const loadExports = async () => {
    try {
      const result = await listDocuments({ documentType: 'OUT' });
      if (!result.ok) { toast.error('Lỗi tải dữ liệu xuất kho'); return; }

      const client = getSupabase();
      const records: ExportRecord[] = [];

      for (const doc of result.data) {
        let lines: any[] = [];
        if (client) {
          const { data } = await client.from('stock_document_lines').select('*').eq('document_id', doc.id).order('line_no');
          lines = data ?? [];
        }
        
        let parsedNguoiNhan = '';
        let parsedGhiChu = doc.notes || '';
        if (doc.notes) {
          const match = doc.notes.match(/Người nhận:\s*([^|]+)/);
          if (match) {
            parsedNguoiNhan = match[1].trim();
            parsedGhiChu = doc.notes.replace(/Người nhận:\s*[^|]+\|?/, '').trim();
          }
        }

        records.push({
          id: doc.id, soPhieu: doc.reference_number, ngayXuat: doc.transaction_date,
          duAn: doc.project_id || '---', khoXuat: doc.warehouse_id || '',
          nguoiXuat: doc.created_by || '', nguoiNhan: parsedNguoiNhan,
          ghiChu: parsedGhiChu, tongTien: doc.total_value || 0,
          status: (doc.workflow_status as any) || 'pending', createdAt: doc.created_at,
          items: lines.map(l => ({
            tenChungLoai: l.product_id, soLuong: l.quantity, donVi: l.unit || '', donGia: l.unit_cost || 0, thanhTien: l.total_value || 0
          }))
        });
      }
      setExportsList(records);
      setSelectedIds(new Set()); setIsAllSelected(false);
    } catch (error) { console.error(error); toast.error('Lỗi tải dữ liệu'); }
  };

  useEffect(() => { void loadExports(); }, []);

  const handleSubmitAPI = async (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => {
    const docInput = {
      documentType: 'OUT' as const, referenceNumber: transaction.referenceNumber, transactionDate: transaction.transactionDate,
      warehouseId: transaction.warehouse_id, projectId: transaction.project_id,
      notes: transaction.notes ? `${transaction.notes} | Người nhận: ${transaction.recipient}` : `Người nhận: ${transaction.recipient}`,
      createdBy: transaction.created_by,
      lines: (transaction.items || []).map((it, idx) => ({
        lineNo: idx + 1, productId: it.itemName || it.category_id || '', quantity: it.quantity, unit: it.unit, unitCost: it.price || 0, totalValue: it.totalValue || 0
      })),
    };
    const res = await createDocument(docInput);
    if (!res.ok) throw new Error(res.error);
  };

  const handleSuccess = () => { setOpen(false); void loadExports(); toast.success('Phiếu xuất đã được thêm'); };

  // ===== UPDATE STATUS (CÓ VALIDATE KHO) =====
  const updateExportStatus = async (id: string, newStatus: 'approved' | 'transferred' | 'received' | 'rejected', lyDo?: string) => {
    const exp = exportsList.find(e => e.id === id);
    if (!exp) return;

    try {
      setIsProcessing(true);
      const client = getSupabase();
      if (!client) throw new Error('No DB client');

      if (newStatus === 'transferred') {
        for (const item of exp.items) {
          const val = await validateStock(item.tenChungLoai, exp.khoXuat, item.soLuong);
          if (!val.ok) { toast.error(`Lỗi kiểm tra tồn kho: ${val.error}`); setIsProcessing(false); return; }
          if (!val.sufficient) { toast.error(`Kho ${exp.khoXuat} không đủ tồn kho cho ${item.tenChungLoai} (Cần ${item.soLuong}, Còn ${val.onHand})`); setIsProcessing(false); return; }
        }
        const tx: any = {
          id: exp.id, type: 'export', referenceNumber: exp.soPhieu, warehouse_id: exp.khoXuat,
          items: exp.items.map(i => ({ itemName: i.tenChungLoai, quantity: i.soLuong, price: 0 })), status: 'approved', created_by: user?.name || '', operator: user?.name || ''
        };
        const postRes = await postStockDocument(tx);
        if (!postRes.ok) { toast.error('Ghi sổ kho thất bại'); setIsProcessing(false); return; }
      }

      const now = new Date().toISOString();
      const patch: any = { workflow_status: newStatus };
      if (newStatus === 'approved') { patch.approved_by = user?.name; patch.approved_at = now; }
      if (newStatus === 'transferred') { patch.transferred_by = user?.name; patch.transferred_at = now; }
      if (newStatus === 'received') { patch.received_by = user?.name; patch.received_at = now; }
      if (newStatus === 'rejected') { patch.rejected_by = user?.name; patch.rejected_at = now; patch.rejected_reason = lyDo; }

      const { error } = await client.from('stock_documents').update(patch).eq('id', id);
      if (error) throw error;

      toast.success(`Đã chuyển trạng thái thành công`);
      void loadExports();
    } catch (error: any) { toast.error(error.message || 'Lỗi cập nhật trạng thái'); } 
    finally { setIsProcessing(false); }
  };

  // ===== CÁC HÀM DUYỆT HÀNG LOẠT =====
  const confirmApprove = async () => {
    setIsApproving(true);
    try {
      const now = new Date().toISOString();
      for (const id of Array.from(selectedIds)) {
        const exp = exportsList.find(e => e.id === id);
        if (exp && exp.status === 'pending') {
          await getSupabase()?.from('stock_documents').update({ workflow_status: 'approved', approved_by: user?.name, approved_at: now }).eq('id', id);
        }
      }
      toast.success(`Đã duyệt thành công các phiếu chọn`);
      setSelectedIds(new Set()); setIsAllSelected(false);
      setApproveDialogOpen(false); void loadExports();
    } finally { setIsApproving(false); }
  };

  const confirmTransfer = async () => {
    setIsTransferring(true);
    try {
      for (const id of Array.from(selectedIds)) {
        const exp = exportsList.find(e => e.id === id);
        if (exp && exp.status === 'approved') {
           await updateExportStatus(id, 'transferred');
        }
      }
      setSelectedIds(new Set()); setIsAllSelected(false);
      setTransferDialogOpen(false);
    } finally { setIsTransferring(false); }
  };

  const confirmReceive = async () => {
    setIsReceiving(true);
    try {
      const now = new Date().toISOString();
      for (const id of Array.from(selectedIds)) {
        const exp = exportsList.find(e => e.id === id);
        if (exp && exp.status === 'transferred') {
          await getSupabase()?.from('stock_documents').update({ workflow_status: 'received', received_by: user?.name, received_at: now }).eq('id', id);
        }
      }
      toast.success(`Đã xác nhận nhận thành công`);
      setSelectedIds(new Set()); setIsAllSelected(false);
      setReceiveDialogOpen(false); void loadExports();
    } finally { setIsReceiving(false); }
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return;
    setIsRejecting(true);
    try {
      const now = new Date().toISOString();
      for (const id of Array.from(selectedIds)) {
        const exp = exportsList.find(e => e.id === id);
        if (exp && (exp.status === 'pending' || exp.status === 'approved')) {
          await getSupabase()?.from('stock_documents').update({ workflow_status: 'rejected', rejected_by: user?.name, rejected_at: now, rejected_reason: rejectReason }).eq('id', id);
        }
      }
      toast.success(`Đã từ chối thành công`);
      setSelectedIds(new Set()); setIsAllSelected(false);
      setRejectDialogOpen(false); setRejectReason(''); void loadExports();
    } finally { setIsRejecting(false); }
  };

  // ===== XỬ LÝ EDIT =====
  const handleSaveEdit = async () => {
    if (!editFormData) return;
    setIsSaving(true);
    try {
      const client = getSupabase();
      if (!client) throw new Error('No DB client');
      
      await client.from('stock_documents').update({
        transaction_date: editFormData.ngayXuat,
        project_id: editFormData.duAn,
        warehouse_id: editFormData.khoXuat,
        notes: editFormData.ghiChu ? `${editFormData.ghiChu} | Người nhận: ${editFormData.nguoiNhan}` : `Người nhận: ${editFormData.nguoiNhan}`,
      }).eq('id', editFormData.id);

      await client.from('stock_document_lines').delete().eq('document_id', editFormData.id);
      const lines = editFormData.items.map((it: any, idx: number) => ({
        document_id: editFormData.id, line_no: idx + 1, product_id: it.tenChungLoai, quantity: it.soLuong, unit: it.donVi, unit_cost: 0, total_value: 0
      }));
      await client.from('stock_document_lines').insert(lines);

      toast.success('Đã cập nhật phiếu xuất'); setEditOpen(false); void loadExports();
    } catch (error: any) { toast.error(error.message); } finally { setIsSaving(false); }
  };

  const handleEditItemChange = (index: number, field: string, value: any) => {
    const newItems = [...editFormData.items];
    newItems[index][field] = value;
    setEditFormData({ ...editFormData, items: newItems });
  };

  // ===== XỬ LÝ IMPORT EXCEL =====
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        if (jsonData.length === 0) { toast.error('File Excel không có dữ liệu'); return; }
        const columns = Object.keys(jsonData[0] || {});
        
        const columnMap: { [key: string]: string } = {
          'Ngay': 'ngayXuat', 'Chung Loai': 'tenChungLoai', 'So Luong': 'soLuong', 'Don vi': 'donVi',
          'Job No': 'jobNo', 'Don gia': 'donGia', 'Thanh Tien': 'thanhTien', 'Xuat Kho': 'xuatKho',
          'Nguoi Nhan': 'nguoiNhan', 'Nguoi Xuat': 'nguoiXuat', 'Ghi chú': 'ghiChu'
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

          mappedRow.soLuong = Number(mappedRow.soLuong) || 1;
          mappedRow.donGia = Number(String(mappedRow.donGia).replace(/,/g, '')) || 0;
          mappedRow.thanhTien = Number(String(mappedRow.thanhTien).replace(/,/g, '')) || (mappedRow.soLuong * mappedRow.donGia);

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
      } catch (error) { toast.error('Lỗi đọc file Excel: ' + (error as Error).message); }
    };
    reader.readAsArrayBuffer(file); event.target.value = '';
  };

  const handleImportExcel = async () => {
    if (excelData.length === 0) { toast.error('Không có dữ liệu để import'); return; }
    setIsProcessing(true);
    try {
      const groupedData = excelData.reduce((acc: any, row: any) => {
        const key = `${row.jobNo || 'unknown'}_${row.ngayXuat}`;
        if (!acc[key]) {
          acc[key] = { soPhieu: `PX${Date.now()}_${Object.keys(acc).length + 1}`, ngayXuat: row.ngayXuat || new Date().toISOString().split('T')[0], duAn: row.jobNo || row.duAn || 'Dự án chính', khoXuat: row.khoXuat || 'Kho chính', nguoiXuat: row.nguoiXuat || 'Admin', nguoiNhan: row.nguoiNhan || '', ghiChu: row.ghiChu || '', status: 'pending', items: [], tongTien: 0, createdAt: new Date().toISOString() };
        }
        acc[key].items.push({ tenChungLoai: row.tenChungLoai, soLuong: row.soLuong, donVi: row.donVi, donGia: row.donGia, thanhTien: row.thanhTien, jobNo: row.jobNo || '' });
        acc[key].tongTien += row.thanhTien;
        return acc;
      }, {});

      const importRecords = Object.values(groupedData) as ExportRecord[];
      for (const rec of importRecords) {
        const tx = { type: 'export', referenceNumber: rec.soPhieu, transactionDate: rec.ngayXuat, warehouse_id: rec.khoXuat, project_id: rec.duAn, recipient: rec.nguoiNhan, created_by: rec.nguoiXuat, notes: rec.ghiChu, items: rec.items, status: 'pending' };
        await handleSubmitAPI(tx as any);
      }
      
      toast.success(`Import thành công ${importRecords.length} phiếu xuất`);
      setExcelData([]); setImportExcelOpen(false); void loadExports();
    } catch (error) { toast.error('Lỗi import dữ liệu: ' + (error as Error).message); } finally { setIsProcessing(false); }
  };

  // ===== LỌC & CHỌN =====
  const filteredList = exportsList.filter(exp => {
    const matchSearch = !searchTerm || exp.soPhieu.toLowerCase().includes(searchTerm.toLowerCase()) || exp.duAn.toLowerCase().includes(searchTerm.toLowerCase()) || exp.nguoiNhan.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (!filterDate || exp.ngayXuat === filterDate);
  });

  const toggleSelect = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); setIsAllSelected(n.size === filteredList.length); };
  const toggleSelectAll = () => { if (isAllSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(filteredList.map(e => e.id))); setIsAllSelected(!isAllSelected); };
  
  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      for (const id of selectedIds) await deleteDocument(id);
      toast.success(`Đã xóa ${selectedIds.size} phiếu xuất`);
      setDeleteDialogOpen(false); setSelectedIds(new Set()); void loadExports();
    } finally { setIsDeleting(false); }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center gap-1"><Clock className="w-3 h-3" /> Chờ duyệt</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Đã duyệt</Badge>;
      case 'transferred': return <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300 flex items-center gap-1"><Truck className="w-3 h-3" /> Đã xuất</Badge>;
      case 'received': return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1"><UserCheckIcon className="w-3 h-3" /> Đã nhận</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 flex items-center gap-1"><XCircle className="w-3 h-3" /> Từ chối</Badge>;
      default: return <Badge variant="outline" className="bg-gray-100 text-gray-800">Không xác định</Badge>;
    }
  };

  const canApprove = (exp: ExportRecord) => isAdmin && exp.status === 'pending';
  const canConfirmTransfer = (exp: ExportRecord) => isAdmin && exp.status === 'approved';
  const canConfirmReceive = (exp: ExportRecord) => exp.status === 'transferred';
  const canReject = (exp: ExportRecord) => isAdmin && (exp.status === 'pending' || exp.status === 'approved');

  const hasPendingItems = exportsList.some(exp => selectedIds.has(exp.id) && exp.status === 'pending');
  const hasTransferableItems = exportsList.some(exp => selectedIds.has(exp.id) && exp.status === 'transferred');
  const hasApprovedItems = exportsList.some(exp => selectedIds.has(exp.id) && exp.status === 'approved');

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Xuất Kho</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý phiếu xuất kho | <strong>{exportsList.length}</strong> phiếu</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          
          {/* ===== IMPORT EXCEL DIALOG (ĐÃ KHÔI PHỤC GIAO DIỆN) ===== */}
          <Dialog open={importExcelOpen} onOpenChange={setImportExcelOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" disabled={!canAddOrEdit}>
                <Upload className="w-4 h-4 mr-2" /> Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white p-6 text-black">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-xl">Import phiếu xuất từ Excel</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors bg-gray-50">
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="excel-upload" />
                  <label htmlFor="excel-upload" className="cursor-pointer block">
                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">Click để chọn file Excel hoặc kéo thả vào đây</p>
                    <p className="text-xs text-gray-500 mt-1">Hỗ trợ định dạng .xlsx, .xls</p>
                  </label>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">📋 Cấu trúc file Excel:</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><span className="font-semibold">Cột bắt buộc:</span> Ngay, Chung Loai, Don vi, Don gia</p>
                    <p><span className="font-semibold">Cột số lượng:</span> Số lượng (nếu có) hoặc cột thứ 3 trong file</p>
                    <p><span className="font-semibold">Cột tùy chọn:</span> Job No, Thanh Tien, Xuat Kho, Nguoi Nhan, Nguoi Xuat, Ghi chú</p>
                    <p className="text-xs text-blue-600 mt-1">* Nếu không có cột "Thanh Tien", hệ thống sẽ tự động tính = Số lượng × Đơn giá</p>
                  </div>
                  <Button 
                    variant="link" 
                    className="text-blue-700 p-0 h-auto mt-2"
                    onClick={() => {
                      const sampleData = [
                        {
                          'Ngay': '02/01/2025', 'Chung Loai': 'Mũi khoan 13.5 (HSS Nachi TD)',
                          'So Luong': 1, 'Don vi': 'Cây', 'Job No': 'AL-5399',
                          'Don gia': 395000, 'Thanh Tien': 395000, 'Xuat Kho': 'CNC',
                          'Nguoi Nhan': 'Lê Chí Công', 'Nguoi Xuat': 'Nguyễn Viết Nam'
                        }
                      ];
                      const ws = XLSX.utils.json_to_sheet(sampleData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
                      XLSX.writeFile(wb, 'mau_phieu_xuat.xlsx');
                    }}
                  >
                    📥 Tải file mẫu
                  </Button>
                </div>

                {excelData.length > 0 && (
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">📊 Dữ liệu đã đọc ({excelData.length} dòng)</span>
                      <Button variant="ghost" size="sm" onClick={() => setExcelData([])} className="text-red-500 hover:text-red-700">
                        <X className="w-4 h-4" /> Xóa
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
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
                            <tr key={idx} className="hover:bg-gray-50">
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
                            <tr><td colSpan={8} className="px-4 py-2 text-sm text-gray-500 text-center">... và {excelData.length - 10} dòng khác</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">Tổng cộng: {excelData.length} mặt hàng</div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => { setImportExcelOpen(false); setExcelData([]); }}>Hủy</Button>
                  <Button onClick={handleImportExcel} disabled={excelData.length === 0 || isProcessing} className="bg-green-600 hover:bg-green-700 text-white">
                    {isProcessing ? '⏳ Đang xử lý...' : '📤 Import dữ liệu'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-orange-600 hover:bg-orange-700" disabled={!canAddOrEdit}><Plus className="w-4 h-4 mr-2" /> Thêm phiếu xuất</Button></DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white p-0"><WarehouseExport onSubmit={handleSubmitAPI} onSuccess={handleSuccess} /></DialogContent>
          </Dialog>

          {isAdmin && hasPendingItems && <Button variant="outline" onClick={() => setApproveDialogOpen(true)} className="border-green-500 text-green-600 hover:bg-green-50"><CheckCircle className="w-4 h-4 mr-2" /> Duyệt ({selectedIds.size})</Button>}
          {isAdmin && hasApprovedItems && <Button variant="outline" onClick={() => setTransferDialogOpen(true)} className="border-blue-500 text-blue-600 hover:bg-blue-50"><Truck className="w-4 h-4 mr-2" /> Xác nhận xuất ({selectedIds.size})</Button>}
          {hasTransferableItems && <Button variant="outline" onClick={() => setReceiveDialogOpen(true)} className="border-green-500 text-green-600 hover:bg-green-50"><UserCheckIcon className="w-4 h-4 mr-2" /> Đã nhận ({selectedIds.size})</Button>}
          {isAdmin && <Button variant="outline" onClick={() => { setRejectReason(''); setRejectDialogOpen(true); }} disabled={selectedIds.size === 0} className="border-red-500 text-red-600 hover:bg-red-50"><XCircle className="w-4 h-4 mr-2" /> Từ chối ({selectedIds.size})</Button>}
          {canDelete && <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} disabled={selectedIds.size === 0} className="bg-red-600 hover:bg-red-700"><Trash2 className="w-4 h-4 mr-2" /> Xóa ({selectedIds.size})</Button>}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex-1 min-w-[200px]"><Input placeholder="🔍 Tìm kiếm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white text-black border-gray-300" /></div>
        <div className="min-w-[180px]"><Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full bg-white text-black border-gray-300" /></div>
        <Badge variant="secondary" className="ml-auto bg-gray-200 text-black">{filteredList.length} phiếu</Badge>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm bg-white border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left w-12"><Button variant="ghost" size="sm" onClick={toggleSelectAll}>{isAllSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}</Button></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số phiếu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày xuất</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dự án</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kho</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người xuất</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người nhận</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Hành động</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredList.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4"><Button variant="ghost" size="sm" onClick={() => toggleSelect(exp.id)}>{selectedIds.has(exp.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}</Button></td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{exp.soPhieu}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{exp.ngayXuat}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{exp.duAn}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{exp.khoXuat}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{exp.nguoiXuat}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{exp.nguoiNhan}</td>
                  <td className="px-6 py-4 text-center">{getStatusBadge(exp.status)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditFormData({...exp}); setEditOpen(true); }} disabled={!canEditData || exp.status !== 'pending'} className="text-blue-600"><Edit className="w-4 h-4" /></Button>
                      {canApprove(exp) && <Button size="sm" variant="outline" className="text-green-600 border-green-300" onClick={() => updateExportStatus(exp.id, 'approved')}><CheckCircle className="w-3 h-3 mr-1" /> Duyệt</Button>}
                      {canConfirmTransfer(exp) && <Button size="sm" variant="outline" className="text-blue-600 border-blue-300" onClick={() => updateExportStatus(exp.id, 'transferred')}><Truck className="w-3 h-3 mr-1" /> Xác nhận xuất</Button>}
                      {canReject(exp) && <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => { const r = prompt('Lý do từ chối:'); if(r) updateExportStatus(exp.id, 'rejected', r); }}><XCircle className="w-3 h-3 mr-1" /> Từ chối</Button>}
                      {canConfirmReceive(exp) && <Button size="sm" variant="outline" className="text-green-600 border-green-300" onClick={() => updateExportStatus(exp.id, 'received')}><UserCheckIcon className="w-3 h-3 mr-1" /> Đã nhận</Button>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center"><Button variant="ghost" size="sm" onClick={() => { setSelectedExport(exp); setViewOpen(true); }}><Eye className="w-4 h-4" /></Button></td>
                </tr>
              ))}
              {filteredList.length === 0 && <tr><td colSpan={10} className="px-6 py-10 text-center text-gray-400">Chưa có phiếu xuất nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl bg-white text-black">
          <DialogHeader><DialogTitle>✏️ Chỉnh sửa phiếu xuất: {editFormData?.soPhieu}</DialogTitle></DialogHeader>
          {editFormData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Ngày xuất</Label><Input type="date" value={editFormData.ngayXuat} onChange={e => setEditFormData({...editFormData, ngayXuat: e.target.value})} className="bg-white border-gray-300" /></div>
                <div><Label>Dự án</Label><Input value={editFormData.duAn} onChange={e => setEditFormData({...editFormData, duAn: e.target.value})} className="bg-white border-gray-300" /></div>
                <div><Label>Kho xuất</Label><Input value={editFormData.khoXuat} onChange={e => setEditFormData({...editFormData, khoXuat: e.target.value})} className="bg-white border-gray-300" /></div>
                <div><Label>Người nhận</Label><Input value={editFormData.nguoiNhan} onChange={e => setEditFormData({...editFormData, nguoiNhan: e.target.value})} className="bg-white border-gray-300" /></div>
                <div className="col-span-2"><Label>Ghi chú</Label><Textarea value={editFormData.ghiChu} onChange={e => setEditFormData({...editFormData, ghiChu: e.target.value})} rows={2} className="bg-white border-gray-300" /></div>
              </div>
              <div className="border border-gray-300 p-2 rounded bg-gray-50 max-h-60 overflow-y-auto">
                <p className="text-sm font-semibold mb-2">Danh sách vật tư</p>
                <table className="w-full text-sm">
                  <thead><tr><th className="text-left p-1">Tên</th><th className="text-right p-1">SL</th></tr></thead>
                  <tbody>{editFormData.items.map((i: any, idx: number) => <tr key={idx}><td className="p-1">{i.tenChungLoai}</td><td className="p-1 text-right">{i.soLuong}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Hủy</Button>
                <Button onClick={handleSaveEdit} disabled={isSaving} className="bg-blue-600 text-white">Lưu thay đổi</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* VIEW DIALOG */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-4xl bg-white text-black">
          <DialogHeader><DialogTitle>📄 Chi tiết phiếu: {selectedExport?.soPhieu}</DialogTitle></DialogHeader>
          {selectedExport && (
            <div className="space-y-4">
              <p><strong>Kho xuất:</strong> {selectedExport.khoXuat}</p>
              <p><strong>Người nhận:</strong> {selectedExport.nguoiNhan}</p>
              <table className="w-full text-sm border">
                <thead className="bg-gray-100"><tr><th className="p-2 border text-left">Tên hàng</th><th className="p-2 border text-right">SL</th><th className="p-2 border text-right">Đơn vị</th></tr></thead>
                <tbody>{selectedExport.items.map((i, idx) => <tr key={idx}><td className="p-2 border">{i.tenChungLoai}</td><td className="p-2 border text-right">{i.soLuong}</td><td className="p-2 border text-right">{i.donVi}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CÁC DIALOG XÁC NHẬN HÀNG LOẠT */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="bg-white text-black">
          <DialogHeader><DialogTitle>Xác nhận duyệt</DialogTitle></DialogHeader>
          <p className="py-4">Bạn có chắc chắn muốn duyệt <strong>{selectedIds.size}</strong> phiếu xuất đã chọn?</p>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Hủy</Button><Button onClick={confirmApprove} disabled={isApproving} className="bg-green-600 text-white">Xác nhận duyệt</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="bg-white text-black">
          <DialogHeader><DialogTitle>Xác nhận xuất</DialogTitle></DialogHeader>
          <p className="py-4">Bạn có chắc chắn muốn xuất kho <strong>{selectedIds.size}</strong> phiếu đã chọn? (Hệ thống sẽ kiểm tra tồn kho).</p>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Hủy</Button><Button onClick={confirmTransfer} disabled={isTransferring} className="bg-blue-600 text-white">Xác nhận xuất</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="bg-white text-black">
          <DialogHeader><DialogTitle>Xác nhận đã nhận</DialogTitle></DialogHeader>
          <p className="py-4">Bạn có chắc chắn muốn xác nhận đã nhận <strong>{selectedIds.size}</strong> phiếu đã chọn?</p>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>Hủy</Button><Button onClick={confirmReceive} disabled={isReceiving} className="bg-green-600 text-white">Xác nhận đã nhận</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-white text-black">
          <DialogHeader><DialogTitle>Xác nhận từ chối</DialogTitle></DialogHeader>
          <p className="py-2">Bạn có chắc chắn muốn từ chối <strong>{selectedIds.size}</strong> phiếu đã chọn?</p>
          <div className="space-y-4">
             <Textarea placeholder="Nhập lý do từ chối..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="bg-white border-gray-300" />
          </div>
          <div className="flex justify-end gap-3 mt-4"><Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Hủy</Button><Button onClick={confirmReject} disabled={isRejecting || !rejectReason.trim()} className="bg-red-600 text-white">Xác nhận từ chối</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white text-black">
          <DialogHeader><DialogTitle>Xác nhận xóa</DialogTitle></DialogHeader>
          <p className="py-4">Bạn có chắc chắn muốn xóa <strong>{selectedIds.size}</strong> phiếu đã chọn?</p>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Hủy</Button><Button onClick={confirmDelete} disabled={isDeleting} className="bg-red-600 text-white">Xóa</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default XuatKho;