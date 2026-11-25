// src/modules/warehouse/pages/ChuyenKho.tsx
import React, { useState, useEffect } from 'react';
import { WarehouseTransfer } from '@/modules/warehouse/components/WarehouseTransfer';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Eye, Download, Truck, UserCheck, Upload, X, Trash2, CheckSquare, Square, CheckCircle, Clock, UserCheck as UserCheckIcon, Edit, Save, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { listDocuments, deleteDocument, createDocument, postDocument } from '@/api/stockDocument';
import { getSupabase } from '@/supabase';
import { WarehouseTransaction } from '@/types/inventory';

interface TransferRecord {
  id: string;
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
  items: Array<{ tenChungLoai: string; soLuong: number; donVi: string; }>;
  createdAt: string;
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
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // ===== LOAD DATA TỪ SUPABASE =====
  const loadTransfers = async () => {
    try {
      const result = await listDocuments({ documentType: 'TRANSFER' });
      if (!result.ok) { toast.error('Lỗi tải dữ liệu chuyển kho'); return; }

      const client = getSupabase();
      const records: TransferRecord[] = [];

      for (const doc of result.data) {
        let lines: any[] = [];
        if (client) {
          const { data } = await client.from('stock_document_lines').select('*').eq('document_id', doc.id).order('line_no');
          lines = data ?? [];
        }
        
        records.push({
          id: doc.id, soPhieu: doc.reference_number, ngayChuyen: doc.transaction_date,
          duAn: doc.project_id || '---', khoXuat: doc.from_warehouse_id || '', khoNhap: doc.to_warehouse_id || '',
          nguoiThucHien: doc.created_by || '', nguoiNhan: doc.received_by || '',
          ghiChu: doc.notes || '', status: (doc.workflow_status as any) || 'pending', createdAt: doc.created_at,
          items: lines.map(l => ({ tenChungLoai: l.product_id, soLuong: l.quantity, donVi: l.unit || '' }))
        });
      }
      setTransfersList(records);
      setSelectedIds(new Set()); setIsAllSelected(false);
    } catch (error) { console.error(error); toast.error('Lỗi tải dữ liệu'); }
  };

  useEffect(() => { void loadTransfers(); }, []);

  const handleSubmitAPI = async (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => {
    const docInput = {
      documentType: 'TRANSFER' as const, referenceNumber: transaction.referenceNumber, transactionDate: transaction.transactionDate,
      fromWarehouseId: transaction.fromLocation, toWarehouseId: transaction.toLocation,
      notes: transaction.notes, createdBy: transaction.created_by,
      lines: (transaction.items || []).map((it, idx) => ({
        lineNo: idx + 1, productId: it.itemName || it.category_id || '', quantity: it.quantity, unit: it.unit, unitCost: 0, totalValue: 0
      })),
    };
    const res = await createDocument(docInput);
    if (!res.ok) throw new Error(res.error);
  };

  const handleSuccess = () => { setOpen(false); void loadTransfers(); toast.success('Phiếu chuyển kho đã được thêm'); };

  // ===== UPDATE STATUS (CÓ VALIDATE KHO & GHI LEDGER) =====
  const updateTransferStatus = async (id: string, newStatus: 'approved' | 'transferred' | 'received' | 'rejected', lyDo?: string) => {
    const t = transfersList.find(e => e.id === id);
    if (!t) return;

    let postedLedgerCount: number | undefined;
    try {
      setIsProcessing(true);
      const client = getSupabase();
      if (!client) throw new Error('No DB client');

      // 1. Nếu xác nhận chuyển, ghi ledger; RPC sẽ kiểm tra tồn kho.
      if (newStatus === 'transferred') {
        const postRes = await postDocument(t.id, user?.name || '');
        if (!postRes.ok) {
          toast.error('Ghi sổ kho thất bại: ' + postRes.error);
          return;
        }
        postedLedgerCount = postRes.ledgerIds.length;
      }

      // 2. Cập nhật trạng thái Document
      const now = new Date().toISOString();
      const patch: any = { workflow_status: newStatus };
      if (newStatus === 'approved') { patch.approved_by = user?.name; patch.approved_at = now; }
      if (newStatus === 'transferred') { patch.transferred_by = user?.name; patch.transferred_at = now; }
      if (newStatus === 'received') { patch.received_by = user?.name; patch.received_at = now; }
      if (newStatus === 'rejected') { patch.rejected_by = user?.name; patch.rejected_at = now; patch.rejected_reason = lyDo; }

      const { error } = await client.from('stock_documents').update(patch).eq('id', id);
      if (error) throw error;

      toast.success(
        postedLedgerCount === undefined
          ? 'Đã chuyển trạng thái thành công'
          : `Đã chuyển kho — ${postedLedgerCount} dòng ledger`
      );
      void loadTransfers();
    } catch (error: any) { toast.error(error.message || 'Lỗi cập nhật trạng thái'); } 
    finally { setIsProcessing(false); }
  };

  // ===== CÁC HÀM HÀNH ĐỘNG HÀNG LOẠT =====
  const confirmApprove = async () => {
    setIsApproving(true);
    try {
      const now = new Date().toISOString();
      for (const id of Array.from(selectedIds)) {
        const t = transfersList.find(e => e.id === id);
        if (t && t.status === 'pending') {
          await getSupabase()?.from('stock_documents').update({ workflow_status: 'approved', approved_by: user?.name, approved_at: now }).eq('id', id);
        }
      }
      toast.success(`Đã duyệt thành công các phiếu chọn`);
      setSelectedIds(new Set()); setIsAllSelected(false);
      setApproveDialogOpen(false); void loadTransfers();
    } finally { setIsApproving(false); }
  };

  const confirmTransfer = async () => {
    setIsTransferring(true);
    try {
      for (const id of Array.from(selectedIds)) {
        const t = transfersList.find(e => e.id === id);
        if (t && t.status === 'approved') {
           await updateTransferStatus(id, 'transferred');
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
        const t = transfersList.find(e => e.id === id);
        if (t && t.status === 'transferred') {
          await getSupabase()?.from('stock_documents').update({ workflow_status: 'received', received_by: user?.name, received_at: now }).eq('id', id);
        }
      }
      toast.success(`Đã xác nhận nhận thành công`);
      setSelectedIds(new Set()); setIsAllSelected(false);
      setReceiveDialogOpen(false); void loadTransfers();
    } finally { setIsReceiving(false); }
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return;
    setIsRejecting(true);
    try {
      const now = new Date().toISOString();
      for (const id of Array.from(selectedIds)) {
        const t = transfersList.find(e => e.id === id);
        if (t && t.status === 'pending') {
          await getSupabase()?.from('stock_documents').update({ workflow_status: 'rejected', rejected_by: user?.name, rejected_at: now, rejected_reason: rejectReason }).eq('id', id);
        }
      }
      toast.success(`Đã từ chối thành công`);
      setSelectedIds(new Set()); setIsAllSelected(false);
      setRejectDialogOpen(false); setRejectReason(''); void loadTransfers();
    } finally { setIsRejecting(false); }
  };

  // ===== EDIT =====
  const handleSaveEdit = async () => {
    if (!editFormData) return;
    setIsSaving(true);
    try {
      const client = getSupabase();
      if (!client) throw new Error('No DB client');
      
      await client.from('stock_documents').update({
        transaction_date: editFormData.ngayChuyen,
        project_id: editFormData.duAn,
        from_warehouse_id: editFormData.khoXuat,
        to_warehouse_id: editFormData.khoNhap,
        notes: editFormData.ghiChu,
      }).eq('id', editFormData.id);

      await client.from('stock_document_lines').delete().eq('document_id', editFormData.id);
      const lines = editFormData.items.map((it: any, idx: number) => ({
        document_id: editFormData.id, line_no: idx + 1, product_id: it.tenChungLoai, quantity: it.soLuong, unit: it.donVi, unit_cost: 0, total_value: 0
      }));
      await client.from('stock_document_lines').insert(lines);

      toast.success('Đã cập nhật phiếu chuyển kho'); setEditOpen(false); void loadTransfers();
    } catch (error: any) { toast.error(error.message); } finally { setIsSaving(false); }
  };

  const handleEditItemChange = (index: number, field: string, value: any) => {
    const newItems = [...editFormData.items];
    newItems[index][field] = value;
    setEditFormData({ ...editFormData, items: newItems });
  };

  // ===== IMPORT EXCEL =====
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        const mappedData = jsonData.map((row: any) => {
          const mappedRow: any = {};
          Object.keys(row).forEach(key => {
            const map: any = { 'Ngày chuyển': 'ngayChuyen', 'Dự án': 'duAn', 'Kho xuất': 'khoXuat', 'Kho nhập': 'khoNhap', 'Người thực hiện': 'nguoiThucHien', 'Tên vật tư': 'tenChungLoai', 'Số lượng': 'soLuong', 'Đơn vị': 'donVi', 'Ghi chú': 'ghiChu' };
            mappedRow[map[key] || key] = row[key];
          });
          mappedRow.soLuong = Number(mappedRow.soLuong) || 1;
          mappedRow.soPhieu = `CK${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          return mappedRow;
        });
        setExcelData(mappedData); toast.success(`Đọc thành công ${mappedData.length} dòng`);
      } catch (error) { toast.error('Lỗi đọc file'); }
    };
    reader.readAsArrayBuffer(file); event.target.value = '';
  };

  const handleImportExcel = async () => {
    if (excelData.length === 0) return; setIsProcessing(true);
    try {
      const groupedData = excelData.reduce((acc: any, row: any) => {
        const key = `${row.duAn || 'unknown'}_${row.ngayChuyen}`;
        if (!acc[key]) acc[key] = { soPhieu: `CK${Date.now()}_${Object.keys(acc).length}`, ngayChuyen: row.ngayChuyen || new Date().toISOString().split('T')[0], duAn: row.duAn || 'Dự án chính', khoXuat: row.khoXuat || 'Kho Tổng', khoNhap: row.khoNhap || 'Kho CNC', nguoiThucHien: row.nguoiThucHien || 'Admin', ghiChu: row.ghiChu || '', items: [] };
        acc[key].items.push({ itemName: row.tenChungLoai, quantity: row.soLuong, unit: row.donVi });
        return acc;
      }, {});
      for (const rec of Object.values(groupedData) as any[]) {
        const tx = { type: 'transfer', referenceNumber: rec.soPhieu, transactionDate: rec.ngayChuyen, fromLocation: rec.khoXuat, toLocation: rec.khoNhap, created_by: rec.nguoiThucHien, notes: rec.ghiChu, items: rec.items, status: 'pending' };
        await handleSubmitAPI(tx as any);
      }
      toast.success('Import thành công'); setExcelData([]); setImportExcelOpen(false); void loadTransfers();
    } catch (error) { toast.error('Lỗi import'); } finally { setIsProcessing(false); }
  };

  // ===== LỌC VÀ XÓA =====
  const filteredList = transfersList.filter(t => {
    const matchSearch = !searchTerm || t.soPhieu.toLowerCase().includes(searchTerm.toLowerCase()) || t.duAn.toLowerCase().includes(searchTerm.toLowerCase()) || t.khoXuat.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (!filterDate || t.ngayChuyen === filterDate);
  });

  const toggleSelect = (id: string) => { const n = new Set(selectedIds); n.has(id) ? n.delete(id) : n.add(id); setSelectedIds(n); setIsAllSelected(n.size === filteredList.length); };
  const toggleSelectAll = () => { if (isAllSelected) setSelectedIds(new Set()); else setSelectedIds(new Set(filteredList.map(e => e.id))); setIsAllSelected(!isAllSelected); };
  
  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      for (const id of selectedIds) await deleteDocument(id);
      toast.success(`Đã xóa ${selectedIds.size} phiếu chuyển kho`);
      setDeleteDialogOpen(false); setSelectedIds(new Set()); void loadTransfers();
    } finally { setIsDeleting(false); }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center gap-1"><Clock className="w-3 h-3" /> Chờ duyệt</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Đã duyệt</Badge>;
      case 'transferred': return <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300 flex items-center gap-1"><Truck className="w-3 h-3" /> Đã chuyển</Badge>;
      case 'received': return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1"><UserCheckIcon className="w-3 h-3" /> Đã nhận</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 flex items-center gap-1"><XCircle className="w-3 h-3" /> Từ chối</Badge>;
      default: return <Badge variant="outline" className="bg-gray-100 text-gray-800">Không xác định</Badge>;
    }
  };

  const canApproveTransfer = (t: TransferRecord) => isAdmin && t.status === 'pending';
  const canConfirmTransfer = (t: TransferRecord) => isAdmin && t.status === 'approved';
  const canConfirmReceive = (t: TransferRecord) => isAdmin && t.status === 'transferred';
  const canReject = (t: TransferRecord) => isAdmin && t.status === 'pending';

  const hasPendingItems = transfersList.some(t => selectedIds.has(t.id) && t.status === 'pending');
  const hasTransferableItems = transfersList.some(t => selectedIds.has(t.id) && t.status === 'approved');
  const hasReceivableItems = transfersList.some(t => selectedIds.has(t.id) && t.status === 'transferred');

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chuyển Kho</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý phiếu chuyển kho | <strong>{transfersList.length}</strong> phiếu</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={importExcelOpen} onOpenChange={setImportExcelOpen}>
            <DialogTrigger asChild><Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" disabled={!canAddOrEdit}><Upload className="w-4 h-4 mr-2" /> Import Excel</Button></DialogTrigger>
            <DialogContent className="max-w-4xl bg-white p-6 text-black">
              <DialogHeader><DialogTitle>Import từ Excel</DialogTitle></DialogHeader>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="mb-4 bg-white text-black" />
              {excelData.length > 0 && <div className="mb-4"><p className="mb-2">Đã đọc {excelData.length} dòng.</p><Button onClick={handleImportExcel} disabled={isProcessing} className="bg-green-600 text-white">Xác nhận Import</Button></div>}
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-purple-600 hover:bg-purple-700" disabled={!canAddOrEdit}><Plus className="w-4 h-4 mr-2" /> Thêm phiếu chuyển</Button></DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white p-0"><WarehouseTransfer onSubmit={handleSubmitAPI} onSuccess={handleSuccess} /></DialogContent>
          </Dialog>

          {isAdmin && hasPendingItems && <Button variant="outline" onClick={() => setApproveDialogOpen(true)} className="border-green-500 text-green-600 hover:bg-green-50"><CheckCircle className="w-4 h-4 mr-2" /> Duyệt ({selectedIds.size})</Button>}
          {hasTransferableItems && <Button variant="outline" onClick={() => setTransferDialogOpen(true)} className="border-blue-500 text-blue-600 hover:bg-blue-50"><Truck className="w-4 h-4 mr-2" /> Chuyển ({selectedIds.size})</Button>}
          {hasReceivableItems && <Button variant="outline" onClick={() => setReceiveDialogOpen(true)} className="border-green-500 text-green-600 hover:bg-green-50"><UserCheckIcon className="w-4 h-4 mr-2" /> Nhận ({selectedIds.size})</Button>}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày chuyển</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kho xuất</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kho nhập</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Người thực hiện</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Hành động</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredList.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4"><Button variant="ghost" size="sm" onClick={() => toggleSelect(t.id)}>{selectedIds.has(t.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}</Button></td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.soPhieu}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{t.ngayChuyen}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{t.khoXuat}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{t.khoNhap}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{t.nguoiThucHien}</td>
                  <td className="px-6 py-4 text-center">{getStatusBadge(t.status)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditFormData({...t}); setEditOpen(true); }} disabled={!canEditData || t.status !== 'pending'} className="text-blue-600"><Edit className="w-4 h-4" /></Button>
                      {canApproveTransfer(t) && <Button size="sm" variant="outline" className="text-green-600 border-green-300" onClick={() => updateTransferStatus(t.id, 'approved')}><CheckCircle className="w-3 h-3 mr-1" /> Duyệt</Button>}
                      {canReject(t) && <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => { const r = prompt('Lý do từ chối:'); if(r) updateTransferStatus(t.id, 'rejected', r); }}><XCircle className="w-3 h-3 mr-1" /> Từ chối</Button>}
                      {canConfirmTransfer(t) && <Button size="sm" variant="outline" className="text-blue-600 border-blue-300" onClick={() => updateTransferStatus(t.id, 'transferred')}><Truck className="w-3 h-3 mr-1" /> Chuyển</Button>}
                      {canConfirmReceive(t) && <Button size="sm" variant="outline" className="text-green-600 border-green-300" onClick={() => updateTransferStatus(t.id, 'received')}><UserCheckIcon className="w-3 h-3 mr-1" /> Nhận</Button>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center"><Button variant="ghost" size="sm" onClick={() => { setSelectedTransfer(t); setViewOpen(true); }}><Eye className="w-4 h-4" /></Button></td>
                </tr>
              ))}
              {filteredList.length === 0 && <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400">Chưa có phiếu chuyển nào.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl bg-white text-black">
          <DialogHeader><DialogTitle>✏️ Chỉnh sửa phiếu chuyển: {editFormData?.soPhieu}</DialogTitle></DialogHeader>
          {editFormData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Ngày chuyển</Label><Input type="date" value={editFormData.ngayChuyen} onChange={e => setEditFormData({...editFormData, ngayChuyen: e.target.value})} className="bg-white border-gray-300" /></div>
                <div><Label>Dự án</Label><Input value={editFormData.duAn} onChange={e => setEditFormData({...editFormData, duAn: e.target.value})} className="bg-white border-gray-300" /></div>
                <div><Label>Kho xuất</Label><Input value={editFormData.khoXuat} onChange={e => setEditFormData({...editFormData, khoXuat: e.target.value})} className="bg-white border-gray-300" /></div>
                <div><Label>Kho nhập</Label><Input value={editFormData.khoNhap} onChange={e => setEditFormData({...editFormData, khoNhap: e.target.value})} className="bg-white border-gray-300" /></div>
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
          <DialogHeader><DialogTitle>📄 Chi tiết phiếu: {selectedTransfer?.soPhieu}</DialogTitle></DialogHeader>
          {selectedTransfer && (
            <div className="space-y-4">
              <p><strong>Kho xuất:</strong> {selectedTransfer.khoXuat}</p>
              <p><strong>Kho nhập:</strong> {selectedTransfer.khoNhap}</p>
              <p><strong>Người thực hiện:</strong> {selectedTransfer.nguoiThucHien}</p>
              <table className="w-full text-sm border">
                <thead className="bg-gray-100"><tr><th className="p-2 border text-left">Tên hàng</th><th className="p-2 border text-right">SL</th><th className="p-2 border text-right">Đơn vị</th></tr></thead>
                <tbody>{selectedTransfer.items.map((i, idx) => <tr key={idx}><td className="p-2 border">{i.tenChungLoai}</td><td className="p-2 border text-right">{i.soLuong}</td><td className="p-2 border text-right">{i.donVi}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CÁC DIALOG XÁC NHẬN HÀNG LOẠT */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="bg-white text-black">
          <DialogHeader><DialogTitle>Xác nhận duyệt</DialogTitle></DialogHeader>
          <p className="py-4">Bạn có chắc chắn muốn duyệt <strong>{selectedIds.size}</strong> phiếu đã chọn?</p>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Hủy</Button><Button onClick={confirmApprove} disabled={isApproving} className="bg-green-600 text-white">Xác nhận duyệt</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="bg-white text-black">
          <DialogHeader><DialogTitle>Xác nhận chuyển kho</DialogTitle></DialogHeader>
          <p className="py-4">Bạn có chắc chắn muốn chuyển <strong>{selectedIds.size}</strong> phiếu đã chọn? (Hệ thống sẽ kiểm tra tồn kho).</p>
          <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Hủy</Button><Button onClick={confirmTransfer} disabled={isTransferring} className="bg-blue-600 text-white">Xác nhận chuyển</Button></div>
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

export default ChuyenKho;