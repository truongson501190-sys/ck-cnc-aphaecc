// src/modules/warehouse/pages/TransactionHistory.tsx
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
import type { TransactionHistoryEntry } from '@/types/warehouse';

const STORAGE_KEY = 'transactionHistory';
const PAGE_SIZE = 10;

const defaultData: TransactionHistoryEntry[] = [
  {
    id: 'th-1',
    reference: 'NK20250115001',
    itemCode: 'SP-001',
    itemName: 'Chi tiết CNC A',
    type: 'import',
    quantity: 100,
    unit: 'cái',
    warehouseTo: 'Kho 1',
    project: 'Dự án X',
    status: 'completed',
    transactionDate: '2025-01-15',
    createdBy: 'Nguyễn Văn A',
    notes: '',
  },
  {
    id: 'th-2',
    reference: 'XK20250116001',
    itemCode: 'SP-001',
    itemName: 'Chi tiết CNC A',
    type: 'export',
    quantity: -20,
    unit: 'cái',
    warehouseFrom: 'Kho 1',
    project: 'Dự án X',
    machine: 'Máy CNC 1',
    status: 'completed',
    transactionDate: '2025-01-16',
    createdBy: 'Trần Thị B',
    notes: 'Xuất phục vụ gia công',
  },
  {
    id: 'th-3',
    reference: 'CK20250117001',
    itemCode: 'SP-002',
    itemName: 'Vật tư gia công B',
    type: 'transfer',
    quantity: 30,
    unit: 'kg',
    warehouseFrom: 'Kho 2',
    warehouseTo: 'Kho 1',
    status: 'completed',
    transactionDate: '2025-01-17',
    createdBy: 'Lê Văn C',
    notes: '',
  },
  {
    id: 'th-4',
    reference: 'DM20250118001',
    itemCode: 'DAU-01',
    itemName: 'Dầu cắt',
    type: 'oil_export',
    quantity: -5,
    unit: 'lít',
    warehouseFrom: 'Kho 2',
    machine: 'Máy CNC 2',
    status: 'completed',
    transactionDate: '2025-01-18',
    createdBy: 'Phạm Thị D',
    notes: 'Tra dầu cho máy',
  },
];

export function TransactionHistory() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TransactionHistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const saved = loadArrayFromStorage<TransactionHistoryEntry>(STORAGE_KEY);
    setEntries(saved.length ? saved : defaultData);
  }, []);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        !searchTerm ||
        entry.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.project && entry.project.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = typeFilter === 'all' || entry.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [entries, searchTerm, typeFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getTypeLabel = (type: TransactionHistoryEntry['type']) => {
    switch (type) {
      case 'import': return 'Nhập kho';
      case 'export': return 'Xuất kho';
      case 'transfer': return 'Chuyển kho';
      case 'oil_export': return 'Xuất dầu';
      default: return type;
    }
  };

  const getStatusBadge = (status: TransactionHistoryEntry['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Hoàn thành</Badge>;
      case 'draft':
        return <Badge variant="outline">Nháp</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Hủy bỏ</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
              <h1 className="text-3xl font-bold text-slate-900">Lịch sử giao dịch</h1>
              <p className="text-sm text-slate-600 mt-2">Danh sách tất cả các giao dịch xuất, nhập, chuyển kho, xuất dầu.</p>
            </div>
          </div>
          <Badge variant="secondary">{entries.length} giao dịch</Badge>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Danh sách giao dịch</CardTitle>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Tìm số chứng từ, mã hàng, tên hàng, dự án"
                  className="pl-10 min-w-[260px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="min-w-[140px]">
                  <SelectValue placeholder="Loại giao dịch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="import">Nhập kho</SelectItem>
                  <SelectItem value="export">Xuất kho</SelectItem>
                  <SelectItem value="transfer">Chuyển kho</SelectItem>
                  <SelectItem value="oil_export">Xuất dầu</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="min-w-[140px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="draft">Nháp</SelectItem>
                  <SelectItem value="cancelled">Hủy bỏ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày GD</TableHead>
                    <TableHead>Chứng từ</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Mã hàng</TableHead>
                    <TableHead>Tên hàng</TableHead>
                    <TableHead>SL</TableHead>
                    <TableHead>ĐVT</TableHead>
                    <TableHead>Kho</TableHead>
                    <TableHead>Đối tác / Máy</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10 text-slate-500">
                        Không có giao dịch nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.transactionDate}</TableCell>
                        <TableCell className="font-mono text-xs">{entry.reference}</TableCell>
                        <TableCell>{getTypeLabel(entry.type)}</TableCell>
                        <TableCell>{entry.itemCode}</TableCell>
                        <TableCell>{entry.itemName}</TableCell>
                        <TableCell className={entry.quantity < 0 ? 'text-red-600' : 'text-green-600'}>
                          {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                        </TableCell>
                        <TableCell>{entry.unit}</TableCell>
                        <TableCell>
                          {entry.warehouseFrom && entry.warehouseTo
                            ? `${entry.warehouseFrom} → ${entry.warehouseTo}`
                            : entry.warehouseTo || entry.warehouseFrom || '-'}
                        </TableCell>
                        <TableCell>{entry.project || entry.machine || '-'}</TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
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

export default TransactionHistory;