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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { qcEntries, defectCategories } from '@/modules/reports/mock/qcReportData';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

export default function QCReport() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [inspector, setInspector] = useState('all');
  const [isLoading] = useState(false);

  const inspectors = useMemo(() => Array.from(new Set(qcEntries.map((e) => e.inspector))).filter(Boolean), []);
  const machines = ['all', 'CNC 1', 'CNC 2', 'Mài 1'];

  const filtered = useMemo(() => {
    return qcEntries.filter((e) => {
      if (dateFrom && e.inspectionDate < dateFrom) return false;
      if (dateTo && e.inspectionDate > dateTo) return false;
      if (inspector !== 'all' && e.inspector !== inspector) return false;
      return true;
    });
  }, [dateFrom, dateTo, inspector]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const failed = filtered.filter((r) => r.result === 'failed').length;
    const passRate = total ? Math.round(((total - failed) / total) * 100) : 0;
    return { total, failed, passed: total - failed, passRate };
  }, [filtered]);

  const pieData = useMemo(() => defectCategories.map((d) => ({ name: d.category, value: d.count })), []);

  const qcDailyTrends = useMemo(() => {
    const grouped = filtered.reduce((acc: any, curr) => {
      acc[curr.inspectionDate] = acc[curr.inspectionDate] || { date: curr.inspectionDate, total: 0, failed: 0 };
      acc[curr.inspectionDate].total += 1;
      if (curr.result === 'failed') acc[curr.inspectionDate].failed += 1;
      return acc;
    }, {});
    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filtered]);

  const handleExportXlsx = () => {
    if (filtered.length === 0) {
      toast.error('Không có dữ liệu');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'QC');
    XLSX.writeFile(wb, `QC_Report.xlsx`);
    toast.success('Đã xuất Excel');
  };

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold">Báo cáo QC</h1>
            <p className="text-slate-600">Thống kê chất lượng sản xuất</p>
          </div>
          <Button onClick={handleExportXlsx}>Export Excel</Button>
        </div>

        {isLoading ? <Skeleton className="h-64" /> : (
          <div className="grid gap-6">
            <div className="grid grid-cols-4 gap-4">
              <Card><CardContent className="pt-6"><p className="text-sm">Tổng</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
              <Card><CardContent className="pt-6"><p className="text-sm">Tỷ lệ đạt</p><p className="text-2xl font-bold">{stats.passRate}%</p></CardContent></Card>
              <Card><CardContent className="pt-6"><p className="text-sm">Tổng lỗi</p><p className="text-2xl font-bold">{stats.failed}</p></CardContent></Card>
            </div>
            
            <Card>
              <CardHeader><CardTitle>Danh sách</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Đơn hàng</TableHead>
                      <TableHead>Kết quả</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.inspectionDate}</TableCell>
                        <TableCell>{r.orderNumber}</TableCell>
                        <TableCell>
                          <Badge variant={r.result === 'passed' ? 'default' : 'destructive'}>{r.result}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}