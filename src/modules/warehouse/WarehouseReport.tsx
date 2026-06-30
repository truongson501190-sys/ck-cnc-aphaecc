// src/modules/reports/warehouse/WarehouseReport.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, ArrowLeft, Loader2 } from 'lucide-react';
import {
  ledgerStatsFromMovements,
  matchesMovementFilter,
  movementTypeLabel,
} from '@/api/stock';
import { useValuation, useLedgerMovements } from '@/shared/hooks/useInventory';
import { ReportTable, Column } from '@/components/ReportTable';

interface WarehouseRow {
  id: string;
  ngay: string;
  loai: string;
  productId: string;
  warehouseId: string;
  qtyDelta: number;
  unitCost: number;
  value: number;
  reference: string;
  notes: string;
}

export function WarehouseReport() {
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: new Date().toISOString().split('T')[0],
  });
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: valuation } = useValuation();
  const { data: ledgerMovements = [], isLoading } = useLedgerMovements({
    fromDate: dateFilter.startDate || undefined,
    toDate: dateFilter.endDate ? `${dateFilter.endDate}T23:59:59` : undefined,
    limit: 1000,
  });

  const filteredMovements = useMemo(
    () =>
      ledgerMovements.filter((row) =>
        matchesMovementFilter(row.movement_type, typeFilter)
      ),
    [ledgerMovements, typeFilter]
  );

  const stats = useMemo(
    () => ({
      ...ledgerStatsFromMovements(filteredMovements),
      ledgerValuation: valuation?.totalValue ?? 0,
    }),
    [filteredMovements, valuation]
  );

  const data: WarehouseRow[] = useMemo(() => {
    return filteredMovements.map((row) => ({
      id: row.id,
      ngay: row.occurred_at?.slice(0, 10) || '',
      loai: movementTypeLabel(row.movement_type),
      productId: row.product_id,
      warehouseId: row.warehouse_id,
      qtyDelta: row.qty_delta,
      unitCost: row.unit_cost || 0,
      value: Math.abs(Number(row.qty_delta) * Number(row.unit_cost || 0)),
      reference: row.reference || '',
      notes: row.notes || '',
    }));
  }, [filteredMovements]);

  const columns: Column<WarehouseRow>[] = [
    { key: 'ngay', header: 'Ngày' },
    { key: 'loai', header: 'Loại' },
    { key: 'productId', header: 'Mã SP' },
    { key: 'warehouseId', header: 'Kho' },
    {
      key: 'qtyDelta',
      header: 'Thay đổi SL',
      align: 'center',
      render: (row) => (
        <span className={row.qtyDelta > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
          {row.qtyDelta > 0 ? '+' : ''}{row.qtyDelta}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Giá trị',
      align: 'right',
      render: (row) => row.value.toLocaleString('vi-VN') + ' đ',
    },
    { key: 'reference', header: 'Tham chiếu' },
    { key: 'notes', header: 'Ghi chú' },
  ];

  const summary = (
    <div className="flex gap-3 flex-wrap">
      <div className="px-3 py-1 bg-blue-50 rounded-lg text-sm">
        <span className="text-gray-600">Tổng dòng:</span>
        <span className="ml-1 font-bold text-blue-700">{stats.totalLines}</span>
      </div>
      <div className="px-3 py-1 bg-green-50 rounded-lg text-sm">
        <span className="text-gray-600">Nhập:</span>
        <span className="ml-1 font-bold text-green-700">{stats.ins}</span>
      </div>
      <div className="px-3 py-1 bg-red-50 rounded-lg text-sm">
        <span className="text-gray-600">Xuất:</span>
        <span className="ml-1 font-bold text-red-700">{stats.outs}</span>
      </div>
      <div className="px-3 py-1 bg-purple-50 rounded-lg text-sm">
        <span className="text-gray-600">Giá trị tồn:</span>
        <span className="ml-1 font-bold text-purple-700">
          {stats.ledgerValuation.toLocaleString('vi-VN')} đ
        </span>
      </div>
    </div>
  );

  const ledgerTrends = useMemo(() => {
    const grouped = filteredMovements.reduce(
      (acc, row) => {
        const date = row.occurred_at?.slice(0, 10) || '';
        if (!date) return acc;
        if (!acc[date]) acc[date] = { date, count: 0, value: 0 };
        acc[date].count++;
        acc[date].value += Math.abs(Number(row.qty_delta) * Number(row.unit_cost || 0));
        return acc;
      },
      {} as Record<string, { date: string; count: number; value: number }>
    );
    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredMovements]);

  const actions = (
    <div className="w-80">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={ledgerTrends} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">🏭 Báo cáo kho</h1>
          <p className="text-gray-500 text-sm">Nhập / Xuất / Chuyển / Xuất dầu</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-4 h-4" /> Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Từ ngày</Label>
              <Input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) =>
                  setDateFilter((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Đến ngày</Label>
              <Input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) =>
                  setDateFilter((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Loại movement</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="import">Nhập</SelectItem>
                  <SelectItem value="export">Xuất</SelectItem>
                  <SelectItem value="transfer">Chuyển</SelectItem>
                  <SelectItem value="oil_export">Xuất dầu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReportTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        title="📊 Chi tiết Stock Ledger"
        searchPlaceholder="Tìm kiếm..."
        searchFields={['productId', 'warehouseId', 'reference']}
        exportFileName="bao_cao_kho"
        exportSheetName="StockLedger"
        summary={summary}
        actions={actions}
      />
    </div>
  );
}