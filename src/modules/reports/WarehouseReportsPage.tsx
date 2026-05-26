import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Package, Download, Filter, ArrowLeft } from 'lucide-react';
import {
  ledgerStatsFromMovements,
  matchesMovementFilter,
  movementTypeLabel,
} from '@/api/stock';
import { useValuation, useLedgerMovements } from '@/shared/hooks/useInventory';

/** Unified warehouse reporting — reads stock_ledger only. */
export function WarehouseReportsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'warehouse' | 'trends'>('overview');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: new Date().toISOString().split('T')[0],
  });
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: valuation } = useValuation();
  const { data: ledgerMovements = [], isLoading } = useLedgerMovements({
    fromDate: dateFilter.startDate || undefined,
    toDate: dateFilter.endDate ? `${dateFilter.endDate}T23:59:59` : undefined,
    limit: 500,
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

  const handleExportData = () => {
    if (filteredMovements.length === 0) {
      toast.error('Không có dữ liệu ledger để xuất');
      return;
    }

    const exportData = filteredMovements.map((row) => ({
      Ngày: row.occurred_at?.slice(0, 10) || '',
      'Loại': movementTypeLabel(row.movement_type),
      'Mã SP': row.product_id,
      'Kho': row.warehouse_id,
      'Thay đổi SL': row.qty_delta,
      'Đơn giá': row.unit_cost || 0,
      'Số tham chiếu': row.reference || '',
      'Ghi chú': row.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'StockLedger');
    XLSX.writeFile(wb, `Bao_Cao_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Đã xuất báo cáo ledger');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/')}
          className="border-gray-300 hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Card className="flex-1">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Báo Cáo Kho (stock_ledger)
            </CardTitle>
            <Button onClick={handleExportData} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Xuất Excel
            </Button>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Từ ngày</Label>
              <Input
                id="startDate"
                type="date"
                value={dateFilter.startDate}
                onChange={(e) =>
                  setDateFilter((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="endDate">Đến ngày</Label>
              <Input
                id="endDate"
                type="date"
                value={dateFilter.endDate}
                onChange={(e) =>
                  setDateFilter((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="typeFilter">Loại movement</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
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
            <div className="flex items-end">
              <Button onClick={handleExportData} className="w-full">
                Xuất dữ liệu
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="warehouse">Chi tiết</TabsTrigger>
          <TabsTrigger value="trends">Xu hướng</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <p className="text-green-100 text-sm">Dòng ledger</p>
                <p className="text-3xl font-bold">{stats.totalLines}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <p className="text-blue-100 text-sm">Nhập (IN)</p>
                <p className="text-3xl font-bold">{stats.ins}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <p className="text-purple-100 text-sm">Giá trị tồn (view)</p>
                <p className="text-2xl font-bold">
                  {stats.ledgerValuation.toLocaleString('vi-VN')}
                </p>
                <p className="text-purple-100 text-xs">VND</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="warehouse" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Thống kê movement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Nhập:</span>
                  <Badge>{stats.ins}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Xuất:</span>
                  <Badge variant="destructive">{stats.outs}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Chuyển:</span>
                  <Badge variant="secondary">{stats.transfers}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Xuất dầu:</span>
                  <Badge variant="outline">{stats.oilExports}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ledger gần đây</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {isLoading && (
                    <p className="text-center text-gray-500 py-4">Đang tải ledger…</p>
                  )}
                  {!isLoading &&
                    filteredMovements.slice(0, 30).map((row) => (
                      <div
                        key={row.id}
                        className="p-3 bg-gray-50 rounded-lg border text-sm"
                      >
                        <div className="flex justify-between mb-1">
                          <Badge variant="outline">
                            {movementTypeLabel(row.movement_type)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {row.occurred_at?.slice(0, 10)}
                          </span>
                        </div>
                        <p>
                          SP: {row.product_id} · Kho: {row.warehouse_id}
                        </p>
                        <p className="font-semibold text-indigo-600">
                          Δ {Number(row.qty_delta).toLocaleString('vi-VN')}
                        </p>
                        {row.reference && (
                          <p className="text-xs text-gray-400">{row.reference}</p>
                        )}
                      </div>
                    ))}
                  {!isLoading && filteredMovements.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Không có dữ liệu ledger</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng theo ngày (ledger)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {ledgerTrends.map((trend) => (
                  <div
                    key={trend.date}
                    className="flex justify-between p-3 bg-green-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(trend.date).toLocaleDateString('vi-VN')}
                      </p>
                      <p className="text-sm text-gray-600">{trend.count} dòng</p>
                    </div>
                    <p className="font-semibold text-green-600">
                      {trend.value.toLocaleString('vi-VN')} VND
                    </p>
                  </div>
                ))}
                {ledgerTrends.length === 0 && (
                  <p className="text-center text-gray-500 py-4">Không có dữ liệu</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
