// src/modules/warehouse/pages/InventoryCount.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Edit3, Trash2, ArrowLeft, Upload, X, CheckSquare, Square, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { buildLocalId, loadArrayFromStorage, saveArrayToStorage, STORAGE_KEYS } from '@/lib/localStorage';
import { usePermission } from '@/hooks/usePermission';
import type { InventoryCountEntry, AdjustmentTransaction, Category } from '@/types/warehouse';

const PAGE_SIZE = 8;
const columnMap: { [key: string]: string } = {
  'Mã vật tư': 'itemCode',
  'Tên vật tư': 'itemName',
  'Kho': 'warehouse',
  'Số lượng thực tế': 'countedQuantity',
  'Số lượng kỳ vọng': 'expectedQuantity',
  'Ngày kiểm kê': 'countedAt',
  'Trạng thái': 'status',
  'Ghi chú': 'notes'
};

export function InventoryCount() {
  const navigate = useNavigate();
  const { canEdit } = usePermission();
  const canEditOrDelete = canEdit('kiem_ke_kho');

  const [entries, setEntries] = useState<InventoryCountEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<InventoryCountEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [importExcelOpen, setImportExcelOpen] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyingEntry, setApplyingEntry] = useState<InventoryCountEntry | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const [formData, setFormData] = useState<Omit<InventoryCountEntry, 'id' | 'difference'> & { categoryId: string }>({
    categoryId: '',
    itemCode: '',
    itemName: '',
    warehouse: '',
    countedQuantity: 0,
    expectedQuantity: 0,
    countedAt: new Date().toISOString().slice(0, 10),
    status: 'pending',
    notes: '',
  });

  // Load data
  useEffect(() => {
    const saved = loadArrayFromStorage<InventoryCountEntry>(STORAGE_KEYS.INVENTORY_COUNTS);
    setEntries(saved.length ? saved : []);
    const cats = loadArrayFromStorage<Category>(STORAGE_KEYS.CATEGORIES);
    setCategories(cats);
    setSelectedIds(new Set());
  }, []);

  const saveEntries = (next: InventoryCountEntry[]) => {
    saveArrayToStorage(STORAGE_KEYS.INVENTORY_COUNTS, next);
    setEntries(next);
    setSelectedIds(new Set());
  };

  // Filter
  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        !searchTerm ||
        entry.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.warehouse.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesWarehouse = warehouseFilter === 'all' || entry.warehouse === warehouseFilter;
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      return matchesSearch && matchesWarehouse && matchesStatus;
    });
  }, [entries, searchTerm, warehouseFilter, statusFilter]);

  // Reset page khi filter thay đổi
  useEffect(() => {
    setPage(1);
  }, [searchTerm, warehouseFilter, statusFilter]);

  // Reset selection khi page/filter thay đổi
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, searchTerm, warehouseFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Tính isAllSelected
  const isAllSelected = useMemo(() => {
    return pageItems.length > 0 && pageItems.every(item => selectedIds.has(item.id));
  }, [pageItems, selectedIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageItems.map(item => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // CRUD
  const openNewDialog = () => {
    setSelectedEntry(null);
    setFormData({
      categoryId: '',
      itemCode: '',
      itemName: '',
      warehouse: '',
      countedQuantity: 0,
      expectedQuantity: 0,
      countedAt: new Date().toISOString().slice(0, 10),
      status: 'pending',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: InventoryCountEntry) => {
    setSelectedEntry(entry);
    setFormData({
      categoryId: entry.categoryId,
      itemCode: entry.itemCode,
      itemName: entry.itemName,
      warehouse: entry.warehouse,
      countedQuantity: entry.countedQuantity,
      expectedQuantity: entry.expectedQuantity,
      countedAt: entry.countedAt,
      status: entry.status,
      notes: entry.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa phiếu kiểm kê này?')) {
      saveEntries(entries.filter((entry) => entry.id !== id));
      toast.success('Xóa kiểm kê thành công');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.categoryId) {
      toast.error('Vui lòng chọn danh mục vật tư');
      return;
    }
    if (!formData.itemCode.trim() || !formData.itemName.trim() || !formData.warehouse.trim()) {
      toast.error('Vui lòng điền đủ mã vật tư, tên vật tư và kho');
      return;
    }
    const difference = formData.countedQuantity - formData.expectedQuantity;
    const nextEntry: InventoryCountEntry = {
      id: selectedEntry?.id ?? buildLocalId('count'),
      categoryId: formData.categoryId,
      itemCode: formData.itemCode,
      itemName: formData.itemName,
      warehouse: formData.warehouse,
      countedQuantity: formData.countedQuantity,
      expectedQuantity: formData.expectedQuantity,
      difference,
      countedAt: formData.countedAt,
      status: difference === 0 ? 'matched' : 'mismatch',
      notes: formData.notes,
    };

    if (selectedEntry) {
      saveEntries(entries.map((entry) => (entry.id === selectedEntry.id ? nextEntry : entry)));
      toast.success('Cập nhật phiếu kiểm kê thành công');
    } else {
      saveEntries([nextEntry, ...entries]);
      toast.success('Thêm phiếu kiểm kê mới thành công');
    }
    setIsDialogOpen(false);
  };

  // Import Excel
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
        if (jsonData.length === 0) {
          toast.error('File Excel không có dữ liệu');
          return;
        }

        const columns = Object.keys(jsonData[0] || {}).map(k => k.trim());
        const requiredFields = ['Mã vật tư', 'Tên vật tư', 'Kho', 'Số lượng thực tế', 'Số lượng kỳ vọng'];
        const missingFields = requiredFields.filter(field => !columns.includes(field));
        if (missingFields.length > 0) {
          toast.error(`Thiếu các cột bắt buộc: ${missingFields.join(', ')}`);
          toast.info(`Các cột hiện có: ${columns.join(', ')}`);
          return;
        }

        const mappedData: any[] = [];
        const errors: string[] = [];

        jsonData.forEach((row: any, index: number) => {
          const mappedRow: any = {};
          Object.keys(row).forEach(key => {
            const trimmedKey = key.trim();
            const mappedKey = columnMap[trimmedKey] || trimmedKey;
            mappedRow[mappedKey] = row[key];
          });

          const counted = Number(mappedRow.countedQuantity);
          const expected = Number(mappedRow.expectedQuantity);
          if (isNaN(counted) || isNaN(expected)) {
            errors.push(`Dòng ${index+1}: Số lượng không hợp lệ`);
            return;
          }

          mappedRow.countedQuantity = counted;
          mappedRow.expectedQuantity = expected;
          mappedRow.difference = counted - expected;
          if (!mappedRow.countedAt) {
            mappedRow.countedAt = new Date().toISOString().slice(0, 10);
          }
          // Xử lý status
          const statusMap: { [key: string]: string } = {
            'Đang chờ': 'pending',
            'Khớp': 'matched',
            'Chênh lệch': 'mismatch'
          };
          if (mappedRow.status && statusMap[mappedRow.status]) {
            mappedRow.status = statusMap[mappedRow.status];
          } else {
            mappedRow.status = mappedRow.difference === 0 ? 'matched' : 'mismatch';
          }
          mappedRow.id = buildLocalId('count');
          mappedRow.notes = mappedRow.notes || '';
          // Với import, cần tìm categoryId từ mã/tên (tạm thời để trống, người dùng sẽ chọn sau)
          mappedRow.categoryId = ''; // Sẽ phải chọn thủ công
          mappedData.push(mappedRow);
        });

        if (errors.length > 0) {
          toast.error(`Có ${errors.length} dòng lỗi: ${errors.join('; ')}`);
        }
        setExcelData(mappedData);
        toast.success(`Đã đọc ${mappedData.length} dòng (bỏ qua ${errors.length} dòng lỗi)`);
      } catch (error) {
        console.error('Error reading Excel:', error);
        toast.error('Lỗi đọc file: ' + (error as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const handleImportExcel = async () => {
    if (excelData.length === 0) {
      toast.error('Không có dữ liệu hợp lệ');
      return;
    }
    setIsProcessing(true);
    try {
      const existing = loadArrayFromStorage<InventoryCountEntry>(STORAGE_KEYS.INVENTORY_COUNTS);
      const newEntries = excelData.map((item) => ({
        ...item,
        id: buildLocalId('count'),
        categoryId: item.categoryId || '', // yêu cầu người dùng chọn sau
      }));
      const updated = [...existing, ...newEntries];
      saveArrayToStorage(STORAGE_KEYS.INVENTORY_COUNTS, updated);
      setEntries(updated);
      toast.success(`Import thành công ${newEntries.length} phiếu`);
      setExcelData([]);
      setImportExcelOpen(false);
    } catch (error) {
      toast.error('Lỗi import: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Áp dụng chênh lệch
  const handleApplyAdjustment = (entry: InventoryCountEntry) => {
    if (entry.status === 'applied') {
      toast.warning('Phiếu đã áp dụng');
      return;
    }
    if (entry.difference === 0) {
      toast.info('Không có chênh lệch');
      return;
    }
    setApplyingEntry(entry);
    setApplyDialogOpen(true);
  };

  const confirmApplyAdjustment = async () => {
    if (!applyingEntry) return;
    setIsApplying(true);
    try {
      const adjustment: AdjustmentTransaction = {
        id: buildLocalId('adj'),
        type: 'adjustment',
        date: new Date().toISOString(),
        items: [
          {
            categoryId: applyingEntry.categoryId,
            quantity: -applyingEntry.difference,
          }
        ],
        status: 'completed',
        warehouse: applyingEntry.warehouse,
        reason: `Điều chỉnh kiểm kê (phiếu ${applyingEntry.id})`,
        inventoryCountId: applyingEntry.id,
        notes: `Điều chỉnh từ phiếu kiểm kê ${applyingEntry.id}`,
        createdAt: new Date().toISOString(),
      };

      const adjustments = loadArrayFromStorage<AdjustmentTransaction>(STORAGE_KEYS.ADJUSTMENTS);
      adjustments.push(adjustment);
      saveArrayToStorage(STORAGE_KEYS.ADJUSTMENTS, adjustments);

      // Cập nhật phiếu kiểm kê
      const updated = entries.map(e =>
        e.id === applyingEntry.id
          ? { ...e, status: 'applied' as const, adjustedTransactionId: adjustment.id }
          : e
      );
      saveArrayToStorage(STORAGE_KEYS.INVENTORY_COUNTS, updated);
      setEntries(updated);

      toast.success(`Đã áp dụng chênh lệch cho ${applyingEntry.itemName}`);
      setApplyDialogOpen(false);
      setApplyingEntry(null);
    } catch (error) {
      toast.error('Lỗi áp dụng: ' + (error as Error).message);
    } finally {
      setIsApplying(false);
    }
  };

  // Xóa hàng loạt
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      toast.warning('Chọn ít nhất một phiếu');
      return;
    }
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const remaining = entries.filter(e => !selectedIds.has(e.id));
      saveArrayToStorage(STORAGE_KEYS.INVENTORY_COUNTS, remaining);
      setEntries(remaining);
      setSelectedIds(new Set());
      toast.success(`Xóa ${selectedIds.size} phiếu thành công`);
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error('Lỗi xóa: ' + (error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const warehouseOptions = Array.from(new Set(entries.map((e) => e.warehouse).filter(Boolean)));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/')} className="border-gray-300 hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Kiểm kê kho</h1>
              <p className="text-sm text-slate-600 mt-2">Ghi nhận và đối soát số lượng tồn kho thực tế.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="secondary">{entries.length} phiếu</Badge>
            <Dialog open={importExcelOpen} onOpenChange={setImportExcelOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" disabled={!canEditOrDelete}>
                  <Upload className="w-4 h-4 mr-2" /> Import Excel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-6">
                <DialogHeader><DialogTitle>Import phiếu kiểm kê từ Excel</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors bg-gray-50">
                    <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" id="excel-upload" />
                    <label htmlFor="excel-upload" className="cursor-pointer block">
                      <Upload className="w-12 h-12 mx-auto text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">Click để chọn file Excel hoặc kéo thả</p>
                      <p className="text-xs text-gray-500 mt-1">Hỗ trợ .xlsx, .xls</p>
                    </label>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">📋 Cấu trúc file Excel:</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><span className="font-semibold">Cột bắt buộc:</span> Mã vật tư, Tên vật tư, Kho, Số lượng thực tế, Số lượng kỳ vọng</p>
                      <p><span className="font-semibold">Cột tùy chọn:</span> Ngày kiểm kê, Trạng thái, Ghi chú</p>
                    </div>
                    <Button variant="link" className="text-blue-700 p-0 h-auto mt-2" onClick={() => {
                      const sample = [
                        { 'Mã vật tư': 'SP-001', 'Tên vật tư': 'Chi tiết CNC A', 'Kho': 'Kho 1', 'Số lượng thực tế': 42, 'Số lượng kỳ vọng': 40, 'Ngày kiểm kê': '2025-01-22', 'Trạng thái': 'Chênh lệch', 'Ghi chú': 'Chênh lệch sau kiểm kê' }
                      ];
                      const ws = XLSX.utils.json_to_sheet(sample);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
                      XLSX.writeFile(wb, 'mau_phieu_kiem_ke.xlsx');
                    }}>
                      📥 Tải file mẫu
                    </Button>
                  </div>
                  {excelData.length > 0 && (
                    <div className="bg-white border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">📊 Dữ liệu ({excelData.length} dòng)</span>
                        <Button variant="ghost" size="sm" onClick={() => setExcelData([])} className="text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" /> Xóa
                        </Button>
                      </div>
                      <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">STT</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mã</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kho</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thực tế</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Kỳ vọng</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Chênh lệch</th>
                            </tr>
                          </thead>
                          <tbody>
                            {excelData.slice(0, 10).map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-900">{idx+1}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{row.itemCode}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{row.itemName}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{row.warehouse}</td>
                                <td className="px-4 py-2 text-sm text-right text-gray-900">{row.countedQuantity}</td>
                                <td className="px-4 py-2 text-sm text-right text-gray-900">{row.expectedQuantity}</td>
                                <td className={`px-4 py-2 text-sm text-right font-semibold ${row.difference !== 0 ? 'text-red-600' : 'text-green-600'}`}>{row.difference}</td>
                              </tr>
                            ))}
                            {excelData.length > 10 && <tr><td colSpan={7} className="px-4 py-2 text-sm text-gray-500 text-center">... và {excelData.length - 10} dòng khác</td></tr>}
                          </tbody>
                        </table>
                      </div>
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="inline-flex items-center gap-2" disabled={!canEditOrDelete} onClick={openNewDialog}>
                  <Plus className="w-4 h-4" /> Thêm phiếu
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl bg-white p-6">
                <DialogHeader><DialogTitle>{selectedEntry ? 'Chỉnh sửa kiểm kê' : 'Thêm kiểm kê mới'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="categoryId">Danh mục vật tư *</Label>
                      <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                        <SelectTrigger id="categoryId"><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.code} - {cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="itemCode">Mã vật tư *</Label>
                      <Input id="itemCode" value={formData.itemCode} onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })} required />
                    </div>
                    <div>
                      <Label htmlFor="itemName">Tên vật tư *</Label>
                      <Input id="itemName" value={formData.itemName} onChange={(e) => setFormData({ ...formData, itemName: e.target.value })} required />
                    </div>
                    <div>
                      <Label htmlFor="warehouse">Kho *</Label>
                      <Input id="warehouse" value={formData.warehouse} onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })} placeholder="Kho 1 / Kho 2" required />
                    </div>
                    <div>
                      <Label htmlFor="countedAt">Ngày kiểm kê</Label>
                      <Input id="countedAt" type="date" value={formData.countedAt} onChange={(e) => setFormData({ ...formData, countedAt: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="expectedQuantity">Số lượng kỳ vọng *</Label>
                      <Input id="expectedQuantity" type="number" min={0} value={formData.expectedQuantity} onChange={(e) => setFormData({ ...formData, expectedQuantity: Number(e.target.value) })} required />
                    </div>
                    <div>
                      <Label htmlFor="countedQuantity">Số lượng thực tế *</Label>
                      <Input id="countedQuantity" type="number" min={0} value={formData.countedQuantity} onChange={(e) => setFormData({ ...formData, countedQuantity: Number(e.target.value) })} required />
                    </div>
                    <div>
                      <Label htmlFor="status">Trạng thái</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as InventoryCountEntry['status'] })}>
                        <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Đang chờ</SelectItem>
                          <SelectItem value="matched">Khớp</SelectItem>
                          <SelectItem value="mismatch">Chênh lệch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Ghi chú</Label>
                    <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="submit">Lưu</Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {canEditOrDelete && (
              <Button variant="destructive" onClick={handleDeleteSelected} disabled={selectedIds.size === 0} className="bg-red-600 hover:bg-red-700">
                <Trash2 className="w-4 h-4 mr-2" /> Xóa ({selectedIds.size})
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Danh sách kiểm kê</CardTitle>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Tìm mã, tên hoặc kho" className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                  <SelectTrigger className="min-w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả kho</SelectItem>
                    {warehouseOptions.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="min-w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="pending">Đang chờ</SelectItem>
                    <SelectItem value="matched">Khớp</SelectItem>
                    <SelectItem value="mismatch">Chênh lệch</SelectItem>
                    <SelectItem value="applied">Đã áp dụng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="p-0 h-8 w-8" disabled={pageItems.length === 0}>
                        {isAllSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                      </Button>
                    </TableHead>
                    <TableHead>Mã vật tư</TableHead>
                    <TableHead>Tên vật tư</TableHead>
                    <TableHead>Kho</TableHead>
                    <TableHead className="text-right">Thực tế</TableHead>
                    <TableHead className="text-right">Kỳ vọng</TableHead>
                    <TableHead className="text-right">Chênh lệch</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-center">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-10 text-slate-500">Không có phiếu kiểm kê.</TableCell></TableRow>
                  ) : (
                    pageItems.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-slate-50">
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => toggleSelect(entry.id)} className="p-0 h-8 w-8">
                            {selectedIds.has(entry.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{entry.itemCode}</TableCell>
                        <TableCell>{entry.itemName}</TableCell>
                        <TableCell>{entry.warehouse}</TableCell>
                        <TableCell className="text-right">{entry.countedQuantity}</TableCell>
                        <TableCell className="text-right">{entry.expectedQuantity}</TableCell>
                        <TableCell className={`text-right font-semibold ${entry.difference !== 0 ? 'text-red-600' : 'text-green-600'}`}>{entry.difference}</TableCell>
                        <TableCell>
                          <Badge variant={entry.status === 'matched' ? 'secondary' : entry.status === 'mismatch' ? 'destructive' : entry.status === 'applied' ? 'default' : 'outline'}>
                            {entry.status === 'matched' ? 'Khớp' : entry.status === 'mismatch' ? 'Chênh lệch' : entry.status === 'applied' ? 'Đã áp dụng' : 'Đang chờ'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {canEditOrDelete && entry.status !== 'applied' && (
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)} disabled={!canEditOrDelete}>
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            )}
                            {canEditOrDelete && (
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)} disabled={!canEditOrDelete}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            {entry.status === 'mismatch' && (
                              <Button variant="outline" size="sm" onClick={() => handleApplyAdjustment(entry)} className="text-green-600 border-green-300 hover:bg-green-50" disabled={!canEditOrDelete}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Áp dụng
                              </Button>
                            )}
                            {entry.status === 'applied' && <Badge variant="default" className="bg-green-100 text-green-800">Đã áp dụng</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <div>Hiển thị {pageItems.length} / {filtered.length} kết quả</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(p-1, 1))}>Trước</Button>
                <span>Trang {page} / {pageCount}</span>
                <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage(p => Math.min(p+1, pageCount))}>Sau</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white p-6">
          <DialogHeader><DialogTitle>Xác nhận xóa</DialogTitle></DialogHeader>
          <div className="py-4">
            <p>Bạn có chắc chắn muốn xóa <strong>{selectedIds.size}</strong> phiếu kiểm kê?</p>
            <p className="text-red-500 text-sm mt-2">Không thể hoàn tác!</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>Hủy</Button>
            <Button onClick={confirmDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeleting ? '⏳ Đang xóa...' : 'Xóa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="bg-white p-6">
          <DialogHeader><DialogTitle>Xác nhận áp dụng chênh lệch</DialogTitle></DialogHeader>
          <div className="py-4">
            <p>Áp dụng chênh lệch cho phiếu kiểm kê:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Vật tư:</strong> {applyingEntry?.itemName}</li>
              <li><strong>Kho:</strong> {applyingEntry?.warehouse}</li>
              <li><strong>Chênh lệch:</strong> {applyingEntry?.difference}</li>
            </ul>
            <p className="mt-3 text-sm text-orange-600">⚠️ Hệ thống sẽ tạo phiếu điều chỉnh tồn kho.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)} disabled={isApplying}>Hủy</Button>
            <Button onClick={confirmApplyAdjustment} disabled={isApplying} className="bg-green-600 hover:bg-green-700 text-white">
              {isApplying ? '⏳ Đang xử lý...' : 'Xác nhận áp dụng'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InventoryCount;