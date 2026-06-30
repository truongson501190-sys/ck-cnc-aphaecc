// src/modules/warehouse/pages/StockCard.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Search } from 'lucide-react';
import { toast } from 'sonner';
import { loadArrayFromStorage } from '@/lib/localStorage';
import type { StockCardEntry } from '@/types/warehouse';

const STORAGE_KEY = 'stockCardEntries';
const PAGE_SIZE = 10;

const defaultData: StockCardEntry[] = [
  {
    id: 'stock-1',
    itemCode: 'SP-001',
    itemName: 'Chi tiết CNC A',
    warehouse: 'Kho 1',
    transactionType: 'import',
    quantity: 100,
    balanceAfter: 100,
    transactionDate: '2025-01-15',
    reference: 'NK20250115001',
    note: 'Nhập kho lần đầu',
  },
  {
    id: 'stock-2',
    itemCode: 'SP-001',
    itemName: 'Chi tiết CNC A',
    warehouse: 'Kho 1',
    transactionType: 'export',
    quantity: -20,
    balanceAfter: 80,
    transactionDate: '2025-01-16',
    reference: 'XK20250116001',
    note: 'Xuất cho máy 1',
  },
  {
    id: 'stock-3',
    itemCode: 'SP-002',
    itemName: 'Vật tư gia công B',
    warehouse: 'Kho 2',
    transactionType: 'import',
    quantity: 50,
    balanceAfter: 50,
    transactionDate: '2025-01-17',
    reference: 'NK20250117001',
    note: '',
  },
];

export function StockCard() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<StockCardEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemFilter, setItemFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const saved = loadArrayFromStorage<StockCardEntry>(STORAGE_KEY);
    setEntries(saved.length ? saved : defaultData);
  }, []);

  const itemOptions = useMemo(() => {
    const items = Array.from(new Set(entries.map((e) => `${e.itemCode} - ${e.itemName}`)));
    return ['all', ...items];
  }, [entries]);

  const warehouseOptions = useMemo(() => {
    const warehouses = Array.from(new Set(entries.map((e) => e.warehouse)));
    return ['all', ...warehouses];
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        !searchTerm ||
        entry.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.reference.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesItem = itemFilter === 'all' || `${entry.itemCode} - ${entry.itemName}` === itemFilter;
      const matchesWarehouse = warehouseFilter === 'all' || entry.warehouse === warehouseFilter;
      return matchesSearch && matchesItem && matchesWarehouse;
    });
  }, [entries, searchTerm, itemFilter, warehouseFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getTransactionBadge = (type: StockCardEntry['transactionType']) => {
    switch (type) {
      case 'import':
        return <Badge className="bg-green-100 text-green-800">Nhập kho</Badge>;
      case 'export':
        return <Badge className="bg-blue-100 text-blue-800">Xuất kho</Badge>;
      case 'transfer':
        return <Badge className="bg-purple-100 text-purple-800">Chuyển kho</Badge>;
      case 'oil_export':
        return <Badge className="bg-orange-100 text-orange-800">Xuất dầu</Badge>;
      default:
        return <Badge>Khác</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate('/')} className="border-gray-300 hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Thẻ kho</h1>
              <p className="text-sm text-slate-600 mt-2">Theo dõi biến động tồn kho theo từng mặt hàng, từng kho.</p>
            </div>
          </div>
          <Badge variant="secondary">{entries.length} giao dịch</Badge>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Lịch sử thẻ kho</CardTitle>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Tìm mã vật tư, tên hoặc số chứng từ"
                  className="pl-10 min-w-[240px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={itemFilter} onValueChange={setItemFilter}>
                <SelectTrigger className="min-w-[180px]">
                  <SelectValue placeholder="Chọn vật tư" />
                </SelectTrigger>
                <SelectContent>
                  {itemOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt === 'all' ? 'Tất cả vật tư' : opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="min-w-[140px]">
                  <SelectValue placeholder="Chọn kho" />
                </SelectTrigger>
                <SelectContent>
                  {warehouseOptions.map((wh) => (
                    <SelectItem key={wh} value={wh}>
                      {wh === 'all' ? 'Tất cả kho' : wh}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Chứng từ</TableHead>
                    <TableHead>Mã vật tư</TableHead>
                    <TableHead>Tên vật tư</TableHead>
                    <TableHead>Loại giao dịch</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Tồn sau</TableHead>
                    <TableHead>Kho</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-10 text-slate-500">
                        Không có giao dịch thẻ kho.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.transactionDate}</TableCell>
                        <TableCell className="font-mono text-xs">{entry.reference}</TableCell>
                        <TableCell>{entry.itemCode}</TableCell>
                        <TableCell>{entry.itemName}</TableCell>
                        <TableCell>{getTransactionBadge(entry.transactionType)}</TableCell>
                        <TableCell className={entry.quantity < 0 ? 'text-red-600' : 'text-green-600'}>
                          {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                        </TableCell>
                        <TableCell>{entry.balanceAfter}</TableCell>
                        <TableCell>{entry.warehouse}</TableCell>
                        <TableCell className="max-w-xs truncate">{entry.note || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <div>Hiển thị {pageItems.length} / {filtered.length} giao dịch</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((prev) => Math.max(prev - 1, 1))}>
                  Trước
                </Button>
                <span>{page} / {pageCount}</span>
                <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}>
                  Sau
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default StockCard;