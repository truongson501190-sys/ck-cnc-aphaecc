// src/modules/warehouse/pages/StockCard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { loadArrayFromStorage, STORAGE_KEYS } from '@/lib/localStorage';
import type { Category, Transaction, ImportTransaction, ExportTransaction, TransferTransaction, ConsumableTransaction, AdjustmentTransaction } from '@/types/warehouse';

export function StockCard() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);

  useEffect(() => {
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
    setTransactions(allTx);
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) {
      setFiltered([]);
      return;
    }

    const cat = categories.find(c => c.id === selectedCategoryId);
    if (!cat) return;

    const result = transactions
      .filter(tx => tx.items?.some(item => item.categoryId === selectedCategoryId))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningStock = 0;
    const enriched = result.map(tx => {
      const item = tx.items?.find(it => it.categoryId === selectedCategoryId);
      const qty = item?.quantity || 0;
      let change = 0;
      if (tx.type === 'import' || (tx.type === 'adjustment' && qty > 0)) change = qty;
      else if (tx.type === 'export' || tx.type === 'transfer' || tx.type === 'consumable' || (tx.type === 'adjustment' && qty < 0)) {
        change = -Math.abs(qty);
      }
      runningStock += change;
      return {
        ...tx,
        change,
        runningStock,
        itemQuantity: qty,
        unit: cat.unit,
      };
    });

    setFiltered(enriched);
  }, [selectedCategoryId, categories, transactions]);

  const exportExcel = () => {
    if (filtered.length === 0) {
      toast.error('Không có dữ liệu');
      return;
    }
    const cat = categories.find(c => c.id === selectedCategoryId);
    const data = filtered.map((t, idx) => ({
      'STT': idx + 1,
      'Số phiếu': t.id,
      'Loại': t.type,
      'Ngày': t.date,
      'Số lượng': t.itemQuantity,
      'Tăng/Giảm': t.change,
      'Tồn sau': t.runningStock,
      'Đơn vị': t.unit,
      'Ghi chú': t.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `TheKho_${cat?.code}`);
    XLSX.writeFile(wb, `TheKho_${cat?.code}_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Thẻ kho</h1>
              <p className="text-gray-600 text-sm">Chi tiết biến động theo mặt hàng</p>
            </div>
          </div>
          {selectedCategory && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {selectedCategory.code} - {selectedCategory.name}
              </Badge>
              <Button variant="outline" size="sm" onClick={exportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Xuất Excel
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Chọn mặt hàng</CardTitle></CardHeader>
          <CardContent>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Chọn mặt hàng..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.code} - {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedCategoryId && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">
                Biến động của <span className="font-bold">{selectedCategory?.name}</span>
                <span className="ml-2 text-sm font-normal text-gray-500">(Đơn vị: {selectedCategory?.unit})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>STT</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead className="text-right">Số lượng</TableHead>
                      <TableHead className="text-right">Tăng (+)</TableHead>
                      <TableHead className="text-right">Giảm (-)</TableHead>
                      <TableHead className="text-right">Tồn sau</TableHead>
                      <TableHead>Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">Không có giao dịch</TableCell></TableRow>
                    ) : (
                      filtered.map((t, idx) => (
                        <TableRow key={`${t.id}-${idx}`} className="hover:bg-gray-50">
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              t.type === 'import' ? 'bg-green-50 text-green-700 border-green-200' :
                              t.type === 'export' ? 'bg-red-50 text-red-700 border-red-200' :
                              t.type === 'transfer' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              t.type === 'consumable' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-purple-50 text-purple-700 border-purple-200'
                            }>
                              {t.type === 'import' ? '📥 Nhập' :
                               t.type === 'export' ? '📤 Xuất' :
                               t.type === 'transfer' ? '🔄 Chuyển' :
                               t.type === 'consumable' ? '🔧 Xuất VT' :
                               '⚙️ Điều chỉnh'}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(t.date).toLocaleDateString('vi-VN')}</TableCell>
                          <TableCell className="text-right font-medium">{t.itemQuantity}</TableCell>
                          <TableCell className="text-right text-green-600">{t.change > 0 ? t.change : 0}</TableCell>
                          <TableCell className="text-right text-red-600">{t.change < 0 ? Math.abs(t.change) : 0}</TableCell>
                          <TableCell className="text-right font-bold">{t.runningStock}</TableCell>
                          <TableCell className="text-xs text-gray-500">{t.notes || '---'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {filtered.length > 0 && (
                <div className="mt-4 text-sm text-gray-600">
                  Tồn cuối: <strong>{filtered[filtered.length-1]?.runningStock || 0}</strong> {selectedCategory?.unit}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default StockCard;