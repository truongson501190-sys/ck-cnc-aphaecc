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
import { Search, Plus, Edit3, Trash2, ArrowLeft, Upload, X, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { buildLocalId, loadArrayFromStorage, saveArrayToStorage } from '@/lib/localStorage';
import type { InventoryCountEntry } from '@/types/warehouse';
import { usePermission } from '@/hooks/usePermission';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'inventoryCountEntries';
const PAGE_SIZE = 8;

export function InventoryCount() {
  const navigate = useNavigate();
  const { canEdit } = usePermission();
  const canEditOrDelete = canEdit('kiem_ke_kho');
  
  const [entries, setEntries] = useState<InventoryCountEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<InventoryCountEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // State cho Import Excel
  const [importExcelOpen, setImportExcelOpen] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // State cho chọn và xóa
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState<Omit<InventoryCountEntry, 'id' | 'difference'>>({
    itemCode: '',
    itemName: '',
    warehouse: '',
    countedQuantity: 0,
    expectedQuantity: 0,
    countedAt: new Date().toISOString().slice(0, 10),
    status: 'pending',
    notes: '',
  });

  useEffect(() => {
    const saved = loadArrayFromStorage<InventoryCountEntry>(STORAGE_KEY);
    setEntries(saved.length ? saved : []);
    setSelectedIds(new Set());
    setIsAllSelected(false);
  }, []);

  const saveEntries = (next: InventoryCountEntry[]) => {
    saveArrayToStorage(STORAGE_KEY, next);
    setEntries(next);
    setSelectedIds(new Set());
    setIsAllSelected(false);
  };

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

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openNewDialog = () => {
    setSelectedEntry(null);
    setFormData({
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
    if (!formData.itemCode.trim() || !formData.itemName.trim() || !formData.warehouse.trim()) {
      toast.error('Vui lòng điền đủ mã vật tư, tên vật tư và kho');
      return;
    }
    const difference = formData.countedQuantity - formData.expectedQuantity;
    const nextEntry: InventoryCountEntry = {
      id: selectedEntry?.id ?? buildLocalId('count'),
      ...formData,
      difference,
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

        // Map các cột từ Excel sang tên trường chuẩn
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

        // Kiểm tra các cột bắt buộc
        const requiredFields = ['Mã vật tư', 'Tên vật tư', 'Kho', 'Số lượng thực tế', 'Số lượng kỳ vọng'];
        const missingFields = requiredFields.filter(field => !columns.includes(field));
        
        if (missingFields.length > 0) {
          toast.error(`Thiếu các cột bắt buộc: ${missingFields.join(', ')}`);
          toast.info(`Các cột hiện có: ${columns.join(', ')}`);
          return;
        }

        const mappedData = jsonData.map((row: any) => {
          const mappedRow: any = {};
          
          // Ánh xạ từng cột
          Object.keys(row).forEach(key => {
            const mappedKey = columnMap[key] || key;
            mappedRow[mappedKey] = row[key];
          });

          // Xử lý số liệu
          mappedRow.countedQuantity = Number(mappedRow.countedQuantity) || 0;
          mappedRow.expectedQuantity = Number(mappedRow.expectedQuantity) || 0;
          mappedRow.difference = mappedRow.countedQuantity - mappedRow.expectedQuantity;
          
          // Xử lý ngày
          if (!mappedRow.countedAt) {
            mappedRow.countedAt = new Date().toISOString().slice(0, 10);
          }

          // Xử lý trạng thái
          const statusMap: { [key: string]: string } = {
            'Đang chờ': 'pending',
            'Khớp': 'matched',
            'Chênh lệch': 'mismatch'
          };
          if (mappedRow.status && statusMap[mappedRow.status]) {
            mappedRow.status = statusMap[mappedRow.status];
          } else if (mappedRow.difference === 0) {
            mappedRow.status = 'matched';
          } else {
            mappedRow.status = 'mismatch';
          }

          // Tạo ID
          mappedRow.id = buildLocalId('count');
          mappedRow.notes = mappedRow.notes || '';

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
      const existingEntries = loadArrayFromStorage<InventoryCountEntry>(STORAGE_KEY);
      const updatedEntries = [...existingEntries, ...excelData];
      saveArrayToStorage(STORAGE_KEY, updatedEntries);
      setEntries(updatedEntries);
      
      toast.success(`Import thành công ${excelData.length} phiếu kiểm kê`);
      setExcelData([]);
      setImportExcelOpen(false);
    } catch (error) {
      console.error('Error importing Excel:', error);
      toast.error('Lỗi import dữ liệu: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ========== CHỨC NĂNG CHỌN VÀ XÓA ==========
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setIsAllSelected(newSelected.size === pageItems.length && pageItems.length > 0);
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(pageItems.map(item => item.id));
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
      const remainingEntries = entries.filter(entry => !selectedIds.has(entry.id));
      saveArrayToStorage(STORAGE_KEY, remainingEntries);
      setEntries(remainingEntries);
      setSelectedIds(new Set());
      setIsAllSelected(false);
      
      toast.success(`Đã xóa thành công ${selectedIds.size} phiếu kiểm kê`);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Lỗi khi xóa phiếu kiểm kê');
    } finally {
      setIsDeleting(false);
    }
  };

  const warehouseOptions = Array.from(new Set(entries.map((entry) => entry.warehouse).filter(Boolean)));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/')}
              className="border-gray-300 hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Kiểm kê kho</h1>
              <p className="text-sm text-slate-600 mt-2">Ghi nhận và đối soát số lượng tồn kho thực tế.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="secondary">{entries.length} phiếu</Badge>
            
            {/* Nút Import Excel */}
            <Dialog open={importExcelOpen} onOpenChange={setImportExcelOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" disabled={!canEditOrDelete}>
                  <Upload className="w-4 h-4 mr-2" /> Import Excel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-xl">Import phiếu kiểm kê từ Excel</DialogTitle>
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
                      <p><span className="font-semibold">Cột bắt buộc:</span> Mã vật tư, Tên vật tư, Kho, Số lượng thực tế, Số lượng kỳ vọng</p>
                      <p><span className="font-semibold">Cột tùy chọn:</span> Ngày kiểm kê, Trạng thái, Ghi chú</p>
                      <p className="text-xs text-blue-600 mt-1">* Trạng thái sẽ tự động tính: Khớp nếu chênh lệch = 0, Chênh lệch nếu khác</p>
                    </div>
                    <Button 
                      variant="link" 
                      className="text-blue-700 p-0 h-auto mt-2"
                      onClick={() => {
                        const sampleData = [
                          {
                            'Mã vật tư': 'SP-001',
                            'Tên vật tư': 'Chi tiết CNC A',
                            'Kho': 'Kho 1',
                            'Số lượng thực tế': 42,
                            'Số lượng kỳ vọng': 40,
                            'Ngày kiểm kê': '2025-01-22',
                            'Trạng thái': 'Chênh lệch',
                            'Ghi chú': 'Chênh lệch sau kiểm kê'
                          },
                          {
                            'Mã vật tư': 'SP-002',
                            'Tên vật tư': 'Vật tư gia công B',
                            'Kho': 'Kho 2',
                            'Số lượng thực tế': 12,
                            'Số lượng kỳ vọng': 12,
                            'Ngày kiểm kê': '2025-01-22',
                            'Trạng thái': 'Khớp',
                            'Ghi chú': 'Đã kiểm kê'
                          }
                        ];
                        
                        const ws = XLSX.utils.json_to_sheet(sampleData);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
                        XLSX.writeFile(wb, 'mau_phieu_kiem_ke.xlsx');
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
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mã vật tư</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên vật tư</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kho</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Thực tế</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Kỳ vọng</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Chênh lệch</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {excelData.slice(0, 10).map((row, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm text-gray-900">{idx + 1}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{row.itemCode}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{row.itemName}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{row.warehouse}</td>
                                <td className="px-4 py-2 text-sm text-right text-gray-900">{row.countedQuantity}</td>
                                <td className="px-4 py-2 text-sm text-right text-gray-900">{row.expectedQuantity}</td>
                                <td className={`px-4 py-2 text-sm text-right font-semibold ${row.difference !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {row.difference}
                                </td>
                              </tr>
                            ))}
                            {excelData.length > 10 && (
                              <tr>
                                <td colSpan={7} className="px-4 py-2 text-sm text-gray-500 text-center">
                                  ... và {excelData.length - 10} dòng khác
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        Tổng cộng: {excelData.length} phiếu kiểm kê
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

            {/* Nút Thêm phiếu */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="inline-flex items-center gap-2" disabled={!canEditOrDelete} onClick={openNewDialog}>
                  <Plus className="w-4 h-4" /> Thêm phiếu
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl bg-white p-6">
                <DialogHeader>
                  <DialogTitle>{selectedEntry ? 'Chỉnh sửa kiểm kê' : 'Thêm kiểm kê mới'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="itemCode">Mã vật tư *</Label>
                      <Input
                        id="itemCode"
                        value={formData.itemCode}
                        onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="itemName">Tên vật tư *</Label>
                      <Input
                        id="itemName"
                        value={formData.itemName}
                        onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="warehouse">Kho *</Label>
                      <Input
                        id="warehouse"
                        value={formData.warehouse}
                        onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                        placeholder="Kho 1 / Kho 2"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="countedAt">Ngày kiểm kê</Label>
                      <Input
                        id="countedAt"
                        type="date"
                        value={formData.countedAt}
                        onChange={(e) => setFormData({ ...formData, countedAt: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="expectedQuantity">Số lượng kỳ vọng *</Label>
                      <Input
                        id="expectedQuantity"
                        type="number"
                        min={0}
                        value={formData.expectedQuantity}
                        onChange={(e) => setFormData({ ...formData, expectedQuantity: Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="countedQuantity">Số lượng thực tế *</Label>
                      <Input
                        id="countedQuantity"
                        type="number"
                        min={0}
                        value={formData.countedQuantity}
                        onChange={(e) => setFormData({ ...formData, countedQuantity: Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Trạng thái</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as InventoryCountEntry['status'] })}>
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
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
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="submit">Lưu</Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Hủy
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

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

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Danh sách kiểm kê</CardTitle>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Tìm mã, tên hoặc kho"
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                  <SelectTrigger className="min-w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả kho</SelectItem>
                    {warehouseOptions.map((warehouse) => (
                      <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="min-w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="pending">Đang chờ</SelectItem>
                    <SelectItem value="matched">Khớp</SelectItem>
                    <SelectItem value="mismatch">Chênh lệch</SelectItem>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSelectAll}
                        className="p-0 h-8 w-8"
                        disabled={pageItems.length === 0}
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
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
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                        Không có phiếu kiểm kê phù hợp.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((entry) => (
                      <TableRow key={entry.id} className="hover:bg-slate-50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSelect(entry.id)}
                            className="p-0 h-8 w-8"
                          >
                            {selectedIds.has(entry.id) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{entry.itemCode}</TableCell>
                        <TableCell>{entry.itemName}</TableCell>
                        <TableCell>{entry.warehouse}</TableCell>
                        <TableCell className="text-right">{entry.countedQuantity}</TableCell>
                        <TableCell className="text-right">{entry.expectedQuantity}</TableCell>
                        <TableCell className={`text-right font-semibold ${entry.difference !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {entry.difference}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.status === 'matched' ? 'secondary' : entry.status === 'mismatch' ? 'destructive' : 'outline'}>
                            {entry.status === 'matched' ? 'Khớp' : entry.status === 'mismatch' ? 'Chênh lệch' : 'Đang chờ'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)} disabled={!canEditOrDelete}>
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)} disabled={!canEditOrDelete}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((prev) => Math.max(prev - 1, 1))}>
                  Trước
                </Button>
                <span>Trang {page} / {pageCount}</span>
                <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}>
                  Sau
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog xác nhận xóa */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white p-6">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Bạn có chắc chắn muốn xóa <strong>{selectedIds.size}</strong> phiếu kiểm kê đã chọn?
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
    </div>
  );
}

export default InventoryCount;