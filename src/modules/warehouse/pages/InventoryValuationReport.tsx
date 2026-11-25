import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getCurrentValuation,
  getValuationHistory,
  type ValuationHistoryRow,
  type ValuationRow,
} from '@/api/valuation';
import { getWarehouses, type WarehouseRow } from '@/api/warehouse';

type Tab = 'current' | 'history';

function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 4 });
}

export default function InventoryValuationReport() {
  const [tab, setTab] = useState<Tab>('current');
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [warehouseId, setWarehouseId] = useState('all');
  const [rows, setRows] = useState<ValuationRow[]>([]);
  const [historyRows, setHistoryRows] = useState<ValuationHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [monthFrom, setMonthFrom] = useState(currentMonth);
  const [monthTo, setMonthTo] = useState(currentMonth);

  useEffect(() => {
    let active = true;
    const loadWarehouses = async () => {
      try {
        const result = await getWarehouses();
        if (!active) return;
        if (!result.ok) {
          toast.error(`Không tải được danh sách kho: ${result.error}`);
          return;
        }
        setWarehouses(result.data);
      } catch (error) {
        if (active) {
          toast.error(
            `Không tải được danh sách kho: ${
              error instanceof Error ? error.message : 'Lỗi không xác định'
            }`
          );
        }
      }
    };

    void loadWarehouses();
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'current') {
        const result = await getCurrentValuation();
        if (!result.ok) {
          toast.error(`Không tải được báo cáo tồn: ${result.error}`);
          return;
        }
        setRows(
          warehouseId === 'all'
            ? result.data
            : result.data.filter((row) => row.warehouse_id === warehouseId)
        );
        return;
      }

      const result = await getValuationHistory(monthFrom, monthTo);
      if (!result.ok) {
        toast.error(`Không tải được lịch sử định giá: ${result.error}`);
        return;
      }
      setHistoryRows(
        warehouseId === 'all'
          ? result.data
          : result.data.filter((row) => row.warehouse_id === warehouseId)
      );
    } catch (error) {
      toast.error(
        `Không tải được báo cáo: ${
          error instanceof Error ? error.message : 'Lỗi không xác định'
        }`
      );
    } finally {
      setLoading(false);
    }
  }, [monthFrom, monthTo, tab, warehouseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalValue = useMemo(
    () => rows.reduce((sum, row) => sum + row.on_hand_value, 0),
    [rows]
  );

  const warehouseName = (id: string) =>
    warehouses.find((warehouse) => warehouse.id === id)?.tenKho ?? id;

  const exportCsv = () => {
    if (tab === 'current') {
      if (rows.length === 0) {
        toast.error('Không có dữ liệu để xuất');
        return;
      }
      downloadCsv(`gia-tri-ton-${new Date().toISOString().slice(0, 10)}.csv`, [
        ['Kho', 'Sản phẩm', 'Tồn', 'Giá trị tồn', 'Đơn giá bình quân'],
        ...rows.map((row) => [
          warehouseName(row.warehouse_id),
          row.product_id,
          row.on_hand_qty,
          row.on_hand_value,
          row.avg_unit_cost,
        ]),
      ]);
      return;
    }

    if (historyRows.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    downloadCsv(`lich-su-gia-tri-ton-${monthFrom}-${monthTo}.csv`, [
      ['Tháng', 'Kho', 'Sản phẩm', 'Tồn cuối kỳ', 'Giá trị cuối kỳ'],
      ...historyRows.map((row) => [
        row.month,
        warehouseName(row.warehouse_id),
        row.product_id,
        row.closing_qty,
        row.closing_value,
      ]),
    ]);
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Báo cáo giá trị tồn kho</h1>

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList>
          <TabsTrigger value="current">Hiện tại</TabsTrigger>
          <TabsTrigger value="history">Lịch sử theo tháng</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Chọn kho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả kho</SelectItem>
                {warehouses.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.tenKho}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <TabsContent value="history" className="m-0 flex flex-wrap gap-3">
              <Input
                type="month"
                aria-label="Tháng bắt đầu"
                value={monthFrom}
                onChange={(event) => setMonthFrom(event.target.value)}
                className="w-full sm:w-44"
              />
              <Input
                type="month"
                aria-label="Tháng kết thúc"
                value={monthTo}
                onChange={(event) => setMonthTo(event.target.value)}
                className="w-full sm:w-44"
              />
            </TabsContent>

            <TabsContent value="current" className="m-0 flex-1 text-sm text-muted-foreground">
              Giá trị được tính từ sổ ledger; phiếu xuất/chuyển dùng giá bình quân tại thời điểm ghi sổ.
            </TabsContent>

            <Button onClick={() => void load()} disabled={loading}>
              {loading ? 'Đang tải…' : 'Làm mới'}
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={loading}>
              Xuất CSV
            </Button>
          </CardContent>
        </Card>

        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Tổng giá trị tồn: {totalValue.toLocaleString('vi-VN')} ₫
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({rows.length} dòng kho × sản phẩm)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kho</TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right">Tồn</TableHead>
                      <TableHead className="text-right">Đơn giá BQ</TableHead>
                      <TableHead className="text-right">Giá trị tồn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          {loading ? 'Đang tải dữ liệu…' : 'Không có dữ liệu'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow key={`${row.warehouse_id}:${row.product_id}`}>
                          <TableCell>{warehouseName(row.warehouse_id)}</TableCell>
                          <TableCell>{row.product_id}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.on_hand_qty)}</TableCell>
                          <TableCell className="text-right">
                            {formatNumber(row.avg_unit_cost)} ₫
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-700">
                            {formatNumber(row.on_hand_value)} ₫
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tháng</TableHead>
                      <TableHead>Kho</TableHead>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead className="text-right">Tồn cuối</TableHead>
                      <TableHead className="text-right">Giá trị cuối kỳ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          {loading ? 'Đang tải dữ liệu…' : 'Không có dữ liệu'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      historyRows.map((row, index) => (
                        <TableRow key={`${row.month}:${row.warehouse_id}:${row.product_id}:${index}`}>
                          <TableCell>{row.month}</TableCell>
                          <TableCell>{warehouseName(row.warehouse_id)}</TableCell>
                          <TableCell>{row.product_id}</TableCell>
                          <TableCell className="text-right">{formatNumber(row.closing_qty)}</TableCell>
                          <TableCell className="text-right font-medium text-green-700">
                            {formatNumber(row.closing_value)} ₫
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
