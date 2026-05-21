import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { qcEntries, defectCategories, qcDailyTrends } from '@/modules/reports/mock/qcReportData';
import type { QaReportEntry } from '@/types/reports';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

export default function QCReport() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [machine, setMachine] = useState('all');
  const [inspector, setInspector] = useState('all');
  const [isLoading] = useState(false);

  const inspectors = Array.from(new Set(qcEntries.map((e) => e.inspector))).filter(Boolean);
  const machines = ['all', 'CNC 1', 'CNC 2', 'Mài 1'];

  const filtered = useMemo(() => {
    return qcEntries.filter((e) => {
      if (dateFrom && e.inspectionDate < dateFrom) return false;
      if (dateTo && e.inspectionDate > dateTo) return false;
      if (inspector !== 'all' && e.inspector !== inspector) return false;
      // machine filter is a placeholder — qcEntries don't have machine field in mock
      return true;
    });
  }, [dateFrom, dateTo, inspector]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const failed = filtered.filter((r) => r.result === 'failed').length;
    const passRate = total ? Math.round(((total - failed) / total) * 100) : 0;
    return { total, failed, passed: total - failed, passRate };
  }, [filtered]);

  const pieData = useMemo(() => {
    return defectCategories.map((d) => ({ name: d.category, value: d.count }));
  }, []);

  const handleExportXlsx = () => {
    if (filtered.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    const wsData = filtered.map((r) => ({
      Ngày: r.inspectionDate,
      Đơn_hàng: r.orderNumber,
      Loại: r.inspectionType,
      Kết_quả: r.result,
      Số_lỗi: r.defectCount,
      Người_kiểm_tra: r.inspector,
      Ghi_chú: r.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'QC');
    XLSX.writeFile(wb, `QC_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success('Đã xuất Excel');
  };

  return (
    <div className="min-h-screen p-4 md:p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Báo cáo QC</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Thống kê lỗi, tỷ lệ đạt và xu hướng chất lượng.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportXlsx}>Export Excel</Button>
            <Button variant="ghost">Export PDF</Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent>
                  <p className="text-sm text-slate-500">Tổng bản ghi</p>
                  <p className="text-2xl font-semibold mt-2">{stats.total}</p>
                  <p className="text-sm text-slate-400 mt-1">Passed: {stats.passed} · Failed: {stats.failed}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <p className="text-sm text-slate-500">Tỷ lệ đạt</p>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <p className="text-2xl font-semibold">{stats.passRate}%</p>
                    <div className="flex-1 ml-4"> 
                      <div className="rounded-full bg-slate-200 dark:bg-slate-800 h-2.5 overflow-hidden">
                        <div className={`h-2.5 rounded-full ${stats.passRate >= 80 ? 'bg-emerald-500' : stats.passRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${stats.passRate}%` }} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <p className="text-sm text-slate-500">Số lỗi tổng</p>
                  <p className="text-2xl font-semibold mt-2">{filtered.reduce((s, r) => s + (r.defectCount || 0), 0)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <p className="text-sm text-slate-500">Kiểm tra hôm nay</p>
                  <p className="text-2xl font-semibold mt-2">{filtered.filter((r) => r.inspectionDate === new Date().toISOString().slice(0,10)).length}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
              <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Phân loại lỗi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ReTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Xu hướng lỗi theo ngày</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={qcDailyTrends} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fill: 'var(--muted-foreground)' }} />
                        <YAxis tick={{ fill: 'var(--muted-foreground)' }} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="failed" fill="#ef4444" />
                        <Bar dataKey="total" fill="#3b82f6" opacity={0.3} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle>Danh sách sản phẩm lỗi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 items-center mb-4">
                  <div>
                    <Label htmlFor="dateFrom">Từ</Label>
                    <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="dateTo">Đến</Label>
                    <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="machine">Máy</Label>
                    <Select value={machine} onValueChange={setMachine}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {machines.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="inspector">Người kiểm tra</Label>
                    <Select value={inspector} onValueChange={setInspector}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        {inspectors.map((i) => (
                          <SelectItem key={i} value={i}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead>Đơn hàng</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Kết quả</TableHead>
                        <TableHead>Số lỗi</TableHead>
                        <TableHead>Người kiểm tra</TableHead>
                        <TableHead>Ghi chú</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.inspectionDate}</TableCell>
                          <TableCell>{r.orderNumber}</TableCell>
                          <TableCell>{r.inspectionType}</TableCell>
                          <TableCell>{r.result === 'passed' ? <Badge variant="secondary">Passed</Badge> : <Badge variant="destructive">Failed</Badge>}</TableCell>
                          <TableCell>{r.defectCount}</TableCell>
                          <TableCell>{r.inspector}</TableCell>
                          <TableCell>{r.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
