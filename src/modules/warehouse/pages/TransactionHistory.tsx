// src/modules/warehouse/pages/TransactionHistory.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, FileSpreadsheet, RefreshCw, Eye } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { loadArrayFromStorage, STORAGE_KEYS } from '@/lib/localStorage';
import type { Category, Transaction, ImportTransaction, ExportTransaction, TransferTransaction, ConsumableTransaction, AdjustmentTransaction } from '@/types/warehouse';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function TransactionHistory() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadData = () => {
    setIsLoading(true);
    try {
      const cats = loadArrayFromStorage<Category>(STORAGE_KEYS.CATEGORIES);
      setCategories(cats);

      const imports = loadArrayFromStorage<ImportTransaction>(STORAGE_KEYS.IMPORTS);
      const exports = loadArrayFromStorage<ExportTransaction>(STORAGE_KEYS.EXPORTS);
      const transfers = loadArrayFromStorage<TransferTransaction>(STORAGE_KEYS.TRANSFERS);
      const consumables = loadArrayFromStorage<ConsumableTransaction>(STORAGE_KEYS.CONSUMABLES);
      const adjustments = loadArrayFromStorage<AdjustmentTransaction>(STORAGE_KEYS.ADJUSTMENTS);

      const allTx: Transaction[] = [
        ...imports.map(t => ({ ...t, type: 'import' as const })),
        ...exports.map(t => ({ ...t, type: 'export' as const })),
        ...transfers.map(t => ({ ...t, type: 'transfer' as const })),
        ...consumables.map(t => ({ ...t, type: 'consumable' as const })),
        ...adjustments.map(t => ({ ...t, type: 'adjustment' as const })),
      ];
      allTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(allTx);
      setFiltered(allTx);
    } catch (error) {
      console.error(error);
      toast.error('Lỗi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = transactions;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(tx => {
        const idMatch = tx.id.toLowerCase().includes(term);
        const noteMatch = (tx.notes || '').toLowerCase().includes(term);
        const warehouseMatch = (tx as any).warehouse?.toLowerCase().includes(term) ||
                               (tx as any).fromWarehouse?.toLowerCase().includes(term) ||
                               (tx as any).toWarehouse?.toLowerCase().includes(term);
        const itemsMatch = tx.items?.some(item => {
          const cat = categories.find(c => c.id === item.categoryId);
          return cat?.name.toLowerCase().includes(term) || cat?.code.toLowerCase().includes(term);
        });
        return idMatch || noteMatch || warehouseMatch || itemsMatch;
      });
    }
    if (typeFilter !== 'all') {
      result = result.filter(tx => tx.type === typeFilter);
    }
    setFiltered(result);
  }, [searchTerm, typeFilter, transactions, categories]);

  const exportExcel = () => {
    if (filtered.length === 0) {
      toast.error('Không có dữ liệu');
      return;
    }
    const data = filtered.map((tx, idx) => ({
      'STT': idx + 1,
      'Số phiếu': tx.id,
      'Loại': tx.type,
      'Ngày': tx.date,
      'Kho': (tx as any).warehouse || (tx as any).fromWarehouse || '',
      'Kho nhận': (tx as any).toWarehouse || '',
      'Dự án': (tx as any).project || '',
      'Người thực hiện': (tx as any).createdBy || '',
      'Trạng thái': tx.status,
      'Ghi chú': tx.notes || '',
      'Số lượng mặt hàng': tx.items?.length || 0,
      'Tổng số lượng': tx.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LichSuGiaoDich');
    XLSX.writeFile(wb, `LichSuGiaoDich_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  const viewDetail = (tx: Transaction) => {
    setSelectedTx(tx);
    setDetailOpen(true);
  };

  const typeMap: Record<string, { label: string; icon: string; color: string }> = {
    import: { label: 'Nhập kho', icon: '📥', color: 'bg-green-50 text-green-700 border-green-200' },
    export: { label: 'Xuất kho', icon: '📤', color: 'bg-red-50 text-red-700 border-red-200' },
    transfer: { label: 'Chuyển kho', icon: '🔄', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    consumable: { label: 'Xuất vật tư', icon: '🔧', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    adjustment: { label: 'Điều chỉnh', icon: '⚙️', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Hoàn thành', color: 'bg-green-100 text-green-800' },
    rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-800' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Lịch sử giao dịch</h1>
              <p className="text-gray-600 text-sm">Tất cả các giao dịch kho</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Xuất Excel
            </Button>
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" /> Làm mới
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Bộ lọc</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Tìm theo số phiếu, kho, vật tư..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tất cả loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  {Object.entries(typeMap).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.icon} {val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="text-sm px-3 py-2">
                {filtered.length} giao dịch
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>STT</TableHead>
                    <TableHead>Số phiếu</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Kho</TableHead>
                    <TableHead>Dự án</TableHead>
                    <TableHead>SL mặt hàng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-center">Chi tiết</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8">Đang tải...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-500">Không có giao dịch nào</TableCell></TableRow>
                  ) : (
                    filtered.map((tx, idx) => {
                      const typeInfo = typeMap[tx.type] || { label: tx.type, icon: '📄', color: 'bg-gray-100' };
                      const statusInfo = statusMap[tx.status] || { label: tx.status || 'Không xác định', color: 'bg-gray-100 text-gray-800' };
                      return (
                        <TableRow key={`${tx.id}-${idx}`} className="hover:bg-gray-50">
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="font-medium">{tx.id}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={typeInfo.color}>
                              {typeInfo.icon} {typeInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(tx.date).toLocaleDateString('vi-VN')}</TableCell>
                          <TableCell>{(tx as any).warehouse || (tx as any).fromWarehouse || '---'}</TableCell>
                          <TableCell>{(tx as any).project || '---'}</TableCell>
                          <TableCell className="text-center">{tx.items?.length || 0}</TableCell>
                          <TableCell>
                            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" onClick={() => viewDetail(tx)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl bg-white p-6">
          <DialogHeader><DialogTitle className="text-xl">Chi tiết giao dịch</DialogTitle></DialogHeader>
          {selectedTx && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><strong>Số phiếu:</strong> {selectedTx.id}</div>
                <div><strong>Loại:</strong> {typeMap[selectedTx.type]?.label || selectedTx.type}</div>
                <div><strong>Ngày:</strong> {new Date(selectedTx.date).toLocaleString('vi-VN')}</div>
                <div><strong>Trạng thái:</strong> {statusMap[selectedTx.status]?.label || selectedTx.status}</div>
                <div><strong>Kho:</strong> {(selectedTx as any).warehouse || (selectedTx as any).fromWarehouse || '---'}</div>
                <div><strong>Dự án:</strong> {(selectedTx as any).project || '---'}</div>
              </div>
              <div className="border rounded-lg p-3 bg-gray-50">
                <h4 className="font-medium text-sm mb-2">Danh sách vật tư</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr><th className="text-left">Vật tư</th><th className="text-right">Số lượng</th><th className="text-right">Đơn giá</th><th className="text-right">Thành tiền</th></tr>
                  </thead>
                  <tbody>
                    {selectedTx.items?.map((item, idx) => {
                      const cat = categories.find(c => c.id === item.categoryId);
                      const name = cat ? `${cat.code} - ${cat.name}` : item.categoryId;
                      return (
                        <tr key={idx} className="border-t border-gray-200">
                          <td className="py-1">{name}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right">{item.price?.toLocaleString('vi-VN') || '---'}</td>
                          <td className="text-right">{(item.quantity * (item.price || 0)).toLocaleString('vi-VN')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-sm"><strong>Ghi chú:</strong> {selectedTx.notes || 'Không có'}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TransactionHistory;