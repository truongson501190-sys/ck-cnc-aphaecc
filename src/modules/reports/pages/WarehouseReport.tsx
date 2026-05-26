import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';
import { warehouseEntries, warehouses, materials } from '@/modules/reports/mock/warehouseReportData';
import { toast } from 'sonner';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function WarehouseReport() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [warehouse, setWarehouse] = useState('all');
  const [material, setMaterial] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const types = ['all', 'in', 'out', 'transfer', 'oil'];

  const filtered = useMemo(() => {
    return warehouseEntries.filter((e) => {
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      if (warehouse !== 'all' && e.warehouse !== warehouse) return false;
      if (material !== 'all' && e.material !== material) return false;
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(`${e.material} ${e.reference} ${e.warehouse}`.toLowerCase().includes(s))) return false;
      }
      return true;
    });
  }, [dateFrom, dateTo, warehouse, material, typeFilter, search]);

  const totals = useMemo(() => {
    const totalQty = filtered.reduce((s, r) => s + r.quantity, 0);
    const totalValue = filtered.reduce((s, r) => s + r.totalValue, 0);
    return { totalQty, totalValue };
  }, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const chartData = useMemo(() => {
    const byMaterial: Record<string, number> = {};
    filtered.forEach((r) => {
      byMaterial[r.material] = (byMaterial[r.material] || 0) + r.quantity;
    });
    return Object.keys(byMaterial).map((k) => ({ material: k, quantity: byMaterial[k] }));
  }, [filtered]);

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(filtered.map((r) => ({
      Ngày: r.date,
      Loại: r.type,
      Kho: r.warehouse,
      Vật_liệu: r.material,
      Số_lượng: r.quantity,
      Đơn_giá: r.unitPrice,
      Giá_trị: r.totalValue,
      Tham_chiếu: r.reference || '',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Warehouse');
    XLSX.writeFile(wb, `Warehouse_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success('Đã xuất Excel');
  };

  const handleExportPdf = () => {
    const w = window.open('', '_blank');
    if (!w) return toast.error('Không thể mở cửa sổ in');
    const html = document.getElementById('warehouse-report-root')?.innerHTML || '';
    w.document.write(`<!doctype html><html><head><title>Warehouse Report</title><meta charset="utf-8"/></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  const handlePrint = () => handleExportPdf();

  return (
    <div id="warehouse-report-root" className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Nút Quay lại trang chủ */}
            <Button 
              variant="outline" 
              className="h-11 shadow-sm gap-2" 
              onClick={() => window.location.href = '/'}
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Báo cáo kho</h1>
              <p className="text-sm text-slate-500">Nhập / Xuất / Chuyển / Tồn / Xuất dầu</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel}>Export Excel</Button>
            <Button variant="ghost" onClick={handleExportPdf}>Export PDF</Button>
            <Button onClick={handlePrint}>In</Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-wrap gap-3">
                <div>
                  <Label htmlFor="dateFrom">Từ</Label>
                  <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="dateTo">Đến</Label>
                  <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="warehouse">Kho</Label>
                  <Select value={warehouse} onValueChange={setWarehouse}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {warehouses.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="material">Vật liệu</Label>
                  <Select value={material} onValueChange={setMaterial}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      {materials.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Loại</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {types.map((t) => <SelectItem key={t} value={t}>{t === 'all' ? 'Tất cả' : t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input placeholder="Tìm kiếm..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle>Dữ liệu</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead><TableHead>Loại</TableHead><TableHead>Kho</TableHead><TableHead>Vật liệu</TableHead><TableHead>Số lượng</TableHead><TableHead>Đơn giá</TableHead><TableHead>Giá trị</TableHead><TableHead>Tham chiếu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.date}</TableCell><TableCell>{r.type}</TableCell><TableCell>{r.warehouse}</TableCell><TableCell>{r.material}</TableCell><TableCell>{r.quantity}</TableCell><TableCell>{r.unitPrice}</TableCell><TableCell>{r.totalValue}</TableCell><TableCell>{r.reference}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-slate-600">Tổng số bản ghi: {filtered.length}</div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">Tổng SL: <strong>{totals.totalQty}</strong></div>
                  <div className="text-sm">Tổng giá trị: <strong>{totals.totalValue}</strong></div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                  <span className="mx-2">{page} / {pageCount}</span>
                  <Button disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Next</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Thống kê theo vật liệu</CardTitle></CardHeader>
            <CardContent>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="material" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantity" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}