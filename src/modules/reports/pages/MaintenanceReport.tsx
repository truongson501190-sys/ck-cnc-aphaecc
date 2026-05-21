import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type MaintenanceEntry = {
  id: string;
  date: string;
  machine: string;
  issue: string;
  downtime: number;
  cost: number;
  technician: string;
  status: 'completed' | 'in-progress' | 'scheduled';
  progress: number;
  notes: string;
};

const maintenanceData: MaintenanceEntry[] = [
  { id: 'm001', date: '2026-05-18', machine: 'CNC 1', issue: 'Thay mũi khoan', downtime: 2, cost: 850, technician: 'Nguyễn Văn A', status: 'completed', progress: 100, notes: 'Hoàn tất', },
  { id: 'm002', date: '2026-05-19', machine: 'CNC 2', issue: 'Điều chỉnh trục Z', downtime: 4, cost: 1450, technician: 'Trần Thị B', status: 'completed', progress: 100, notes: 'Đã kiểm tra lại', },
  { id: 'm003', date: '2026-05-20', machine: 'Mài 1', issue: 'Thay dầu bôi trơn', downtime: 1, cost: 300, technician: 'Lê Văn C', status: 'completed', progress: 100, notes: 'Chưa phát sinh', },
  { id: 'm004', date: '2026-05-21', machine: 'CNC 1', issue: 'Cân chỉnh lại phôi', downtime: 3, cost: 600, technician: 'Phạm Thị D', status: 'in-progress', progress: 65, notes: 'Đang đợi phụ tùng', },
  { id: 'm005', date: '2026-05-22', machine: 'Mài 2', issue: 'Thay bạc đạn', downtime: 5, cost: 1200, technician: 'Ngô Văn E', status: 'scheduled', progress: 20, notes: 'Lịch ngày mai', },
  { id: 'm006', date: '2026-05-22', machine: 'CNC 2', issue: 'Kiểm tra cảm biến', downtime: 2, cost: 400, technician: 'Nguyễn Văn A', status: 'completed', progress: 100, notes: 'Cảm biến ổn định', },
  { id: 'm007', date: '2026-05-23', machine: 'CNC 1', issue: 'Sửa lỗi phần mềm', downtime: 6, cost: 2200, technician: 'Lê Thị F', status: 'in-progress', progress: 40, notes: 'Đang cập nhật', },
];

const machineOptions = ['all', 'CNC 1', 'CNC 2', 'Mài 1', 'Mài 2'];
const statusOptions = ['all', 'completed', 'in-progress', 'scheduled'];

export default function MaintenanceReport() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [machine, setMachine] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filteredEntries = useMemo(() => {
    return maintenanceData.filter((entry) => {
      if (dateFrom && entry.date < dateFrom) return false;
      if (dateTo && entry.date > dateTo) return false;
      if (machine !== 'all' && entry.machine !== machine) return false;
      if (status !== 'all' && entry.status !== status) return false;
      if (search) {
        const term = search.toLowerCase();
        return (
          entry.machine.toLowerCase().includes(term) ||
          entry.issue.toLowerCase().includes(term) ||
          entry.technician.toLowerCase().includes(term) ||
          entry.notes.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [dateFrom, dateTo, machine, status, search]);

  const totals = useMemo(() => {
    const totalDowntime = filteredEntries.reduce((sum, entry) => sum + entry.downtime, 0);
    const totalCost = filteredEntries.reduce((sum, entry) => sum + entry.cost, 0);
    return { jobs: filteredEntries.length, totalDowntime, totalCost };
  }, [filteredEntries]);

  const worstMachine = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEntries.forEach((entry) => {
      counts[entry.machine] = (counts[entry.machine] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length ? sorted[0][0] : 'Không có dữ liệu';
  }, [filteredEntries]);

  const chartData = useMemo(() => {
    const downtimeByMachine: Record<string, number> = {};
    filteredEntries.forEach((entry) => {
      downtimeByMachine[entry.machine] = (downtimeByMachine[entry.machine] || 0) + entry.downtime;
    });
    return Object.entries(downtimeByMachine).map(([machineName, downtime]) => ({ machine: machineName, downtime }));
  }, [filteredEntries]);

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const visibleEntries = filteredEntries.slice((page - 1) * pageSize, page * pageSize);

  const handleExportExcel = () => {
    if (!filteredEntries.length) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(filteredEntries.map((entry) => ({
      Ngày: entry.date,
      Máy: entry.machine,
      Sự_cố: entry.issue,
      Thời_gian_downtime: entry.downtime,
      Chi_phí: entry.cost,
      Kỹ_thuật_viên: entry.technician,
      Trạng_thái: entry.status,
      Tiến_độ: `${entry.progress}%`,
      Ghi_chú: entry.notes,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Maintenance');
    XLSX.writeFile(wb, `Maintenance_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Đã xuất Excel');
  };

  const handleExportPdf = () => {
    const container = document.getElementById('maintenance-report-root');
    if (!container) return;
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      toast.error('Không thể mở cửa sổ PDF');
      return;
    }
    newWindow.document.write(`<!doctype html><html><head><title>Báo cáo bảo trì</title><meta charset="utf-8"/><style>body{font-family:sans-serif;padding:16px;}table{width:100%;border-collapse:collapse;}th,td{padding:8px;border:1px solid #ddd;text-align:left;}h1,h2,h3{margin:0 0 12px;} .progress{background:#e5e7eb;border-radius:9999px;height:12px;} .progress-bar{background:#3b82f6;height:12px;border-radius:9999px;}</style></head><body>${container.innerHTML}</body></html>`);
    newWindow.document.close();
    newWindow.focus();
    setTimeout(() => newWindow.print(), 500);
  };

  return (
    <div id="maintenance-report-root" className="min-h-screen px-4 py-6 md:px-6 md:py-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Báo cáo bảo trì</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Thống kê downtime, chi phí, lịch sử sửa chữa và máy lỗi nhiều nhất.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportExcel}>Export Excel</Button>
            <Button variant="ghost" onClick={handleExportPdf}>Export PDF</Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Tổng ca bảo trì</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{totals.jobs}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Thời gian downtime</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{totals.totalDowntime}h</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tổng chi phí</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{totals.totalCost.toLocaleString('vi-VN')} ₫</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Máy lỗi nhiều nhất</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{worstMachine}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent>
            <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label htmlFor="dateFrom">Từ ngày</Label>
                  <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="dateTo">Đến ngày</Label>
                  <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="machineSelect">Máy</Label>
                  <Select id="machineSelect" value={machine} onValueChange={setMachine}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả máy" />
                    </SelectTrigger>
                    <SelectContent>
                      {machineOptions.map((item) => (
                        <SelectItem key={item} value={item}>{item === 'all' ? 'Tất cả' : item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="statusSelect">Trạng thái</Label>
                  <Select id="statusSelect" value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((item) => (
                        <SelectItem key={item} value={item}>{item === 'all' ? 'Tất cả' : item === 'completed' ? 'Hoàn thành' : item === 'in-progress' ? 'Đang làm' : 'Đã lên lịch'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="search">Tìm kiếm</Label>
                  <Input id="search" placeholder="Tìm máy, sự cố, kỹ thuật viên..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tiến độ bảo trì trung bình</p>
                  <div className="mt-3 space-y-3">
                    {maintenanceData.slice(0, 3).map((entry) => (
                      <div key={entry.id}>
                        <div className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300">
                          <span>{entry.machine}</span>
                          <span>{entry.progress}%</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-2 rounded-full bg-sky-500" style={{ width: `${entry.progress}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Downtime theo máy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div style={{ height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="machine" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value}h`, 'Downtime']} />
                          <Bar dataKey="downtime" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lịch sử sửa chữa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Máy</TableHead>
                    <TableHead>Sự cố</TableHead>
                    <TableHead>Downtime</TableHead>
                    <TableHead>Chi phí</TableHead>
                    <TableHead>Kỹ thuật viên</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleEntries.length ? visibleEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>{entry.machine}</TableCell>
                      <TableCell>{entry.issue}</TableCell>
                      <TableCell>{entry.downtime}h</TableCell>
                      <TableCell>{entry.cost.toLocaleString('vi-VN')} ₫</TableCell>
                      <TableCell>{entry.technician}</TableCell>
                      <TableCell>
                        <Badge variant={entry.status === 'completed' ? 'secondary' : entry.status === 'in-progress' ? 'outline' : 'destructive'}>
                          {entry.status === 'completed' ? 'Hoàn thành' : entry.status === 'in-progress' ? 'Đang xử lý' : 'Đã lên lịch'}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.notes}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500 dark:text-slate-400">
                        Không có bản ghi phù hợp
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">Hiển thị {visibleEntries.length} trên {filteredEntries.length} bản ghi</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  Trước
                </Button>
                <span className="text-sm">{page} / {pageCount}</span>
                <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
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
