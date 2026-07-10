// src/modules/reports/MachinePerformancePage.tsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ArrowLeft, RefreshCw, FileSpreadsheet, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';

interface GroupedPerformance {
  machine: string;
  date: string;
  month: string;
  totalCa: number;
  totalOutput: number;
  avgUptime: number;
  avgDowntime: number;
  avgQuality: number;
  details: Array<{
    id: string;
    output: number;
    uptime: number;
    downtime: number;
    qualityRate: number;
    note: string;
  }>;
}

const MACHINE_OPTIONS = ['Tất cả', 'Máy doa CNC Neway FB160HC', 'Máy CNC 1', 'Máy CNC 2', 'Máy CNC 3'];

export function MachinePerformancePage() {
  const navigate = useNavigate();
  
  const [entries, setEntries] = useState<any[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedPerformance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [machineFilter, setMachineFilter] = useState('Tất cả');
  const [monthFilter, setMonthFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Lấy dữ liệu từ production_reports
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: reports, error } = await supabase
        .from('production_reports')
        .select('*')
        .order('ngayThang', { ascending: false });

      if (error) throw error;
      if (!reports || reports.length === 0) {
        setEntries([]);
        setGroupedData([]);
        return;
      }

      // Map dữ liệu
      const mapped = reports.map((r: any) => {
        const setup = r.gioGa || 0;
        const work = r.gioChay || 0;
        const total = setup + work;
        
        return {
          id: r.id,
          machine: r.maySanXuat || 'Máy CNC',
          date: r.ngayThang || new Date().toISOString().slice(0, 10),
          month: r.ngayThang ? r.ngayThang.slice(0, 7) : new Date().toISOString().slice(0, 7),
          uptime: total > 0 ? Math.round((work / total) * 100) : 85,
          downtime: total > 0 ? Math.round((setup / total) * 100) : 15,
          output: Number(r.soLuongHoanThanh) || 0,
          qualityRate: 95,
          note: `Dự án: ${r.duAn || ''} | KH: ${r.khach_hang || ''}`,
          project: r.duAn || '',
          customer: r.khach_hang || '',
        };
      });

      setEntries(mapped);
      
      // Gom nhóm dữ liệu
      groupData(mapped);
      
    } catch (error) {
      console.error('Error loading:', error);
      toast.error('Lỗi tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Hàm gom nhóm dữ liệu
  const groupData = useCallback((data: any[]) => {
    // Lọc theo tháng nếu có
    let filtered = data;
    if (monthFilter) {
      filtered = filtered.filter((e) => e.month === monthFilter);
    }
    if (machineFilter !== 'Tất cả') {
      filtered = filtered.filter((e) => e.machine === machineFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((e) => 
        e.machine.toLowerCase().includes(term) ||
        e.project.toLowerCase().includes(term) ||
        e.customer.toLowerCase().includes(term)
      );
    }

    // Nhóm theo máy + ngày
    const grouped = new Map<string, GroupedPerformance>();
    
    filtered.forEach((item) => {
      const key = `${item.machine}_${item.date}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          machine: item.machine,
          date: item.date,
          month: item.month,
          totalCa: 0,
          totalOutput: 0,
          avgUptime: 0,
          avgDowntime: 0,
          avgQuality: 0,
          details: [],
        });
      }
      
      const group = grouped.get(key)!;
      group.details.push({
        id: item.id,
        output: item.output,
        uptime: item.uptime,
        downtime: item.downtime,
        qualityRate: item.qualityRate,
        note: item.note,
      });
      group.totalCa += 1;
      group.totalOutput += item.output;
      group.avgUptime += item.uptime;
      group.avgDowntime += item.downtime;
      group.avgQuality += item.qualityRate;
    });

    // Tính trung bình
    const result = Array.from(grouped.values()).map((group) => ({
      ...group,
      avgUptime: Math.round(group.avgUptime / group.totalCa),
      avgDowntime: Math.round(group.avgDowntime / group.totalCa),
      avgQuality: Math.round(group.avgQuality / group.totalCa),
    }));

    // Sắp xếp theo ngày giảm dần
    result.sort((a, b) => b.date.localeCompare(a.date));

    setGroupedData(result);
  }, [monthFilter, machineFilter, searchTerm]);

  // Đồng bộ
  const syncData = useCallback(async () => {
    setIsSyncing(true);
    await loadData();
    toast.success('Đã cập nhật dữ liệu');
    setIsSyncing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, []);

  // Khi filter thay đổi, gom nhóm lại
  useEffect(() => {
    if (entries.length > 0) {
      groupData(entries);
    }
  }, [entries, monthFilter, machineFilter, searchTerm, groupData]);

  // Toggle expand
  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  // Thống kê tổng hợp
  const stats = useMemo(() => {
    const total = groupedData.reduce((sum, g) => sum + g.totalCa, 0);
    const totalOutput = groupedData.reduce((sum, g) => sum + g.totalOutput, 0);
    const avgUptime = groupedData.length > 0 
      ? Math.round(groupedData.reduce((sum, g) => sum + g.avgUptime, 0) / groupedData.length)
      : 0;
    const machines = new Set(groupedData.map((g) => g.machine)).size;
    return { total, totalOutput, avgUptime, machines };
  }, [groupedData]);

  // Xuất Excel
  const exportExcel = () => {
    if (!groupedData.length) {
      toast.error('Không có dữ liệu');
      return;
    }

    const data = groupedData.map((g, i) => ({
      'STT': i + 1,
      'Máy': g.machine,
      'Ngày': g.date,
      'Tháng': g.month,
      'Số ca': g.totalCa,
      'Sản lượng': g.totalOutput,
      'Uptime TB': g.avgUptime + '%',
      'Downtime TB': g.avgDowntime + '%',
      'Chất lượng TB': g.avgQuality + '%',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'HieuSuatMay');
    XLSX.writeFile(wb, `Hieu_suat_may_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  // Lấy danh sách tháng có dữ liệu
  const monthOptions = useMemo(() => {
    const months = new Set(entries.map((e) => e.month));
    return Array.from(months).sort();
  }, [entries]);

  // Badge trạng thái
  const getStatus = (uptime: number, quality: number) => {
    if (uptime >= 90 && quality >= 95) return <Badge className="bg-green-100 text-green-800">Tốt</Badge>;
    if (uptime >= 80 && quality >= 85) return <Badge className="bg-yellow-100 text-yellow-800">Trung bình</Badge>;
    return <Badge className="bg-red-100 text-red-800">Cần cải thiện</Badge>;
  };

  if (isLoading && !entries.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">📊 Báo cáo hiệu suất máy</h1>
            <p className="text-xs text-gray-500">
              {groupedData.length} nhóm máy | {stats.total} ca sản xuất
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={syncData} disabled={isSyncing} className="h-7 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Đang tải...' : 'Đồng bộ'}
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel} className="h-7 text-xs">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Xuất Excel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg px-3 py-2">
          <div className="text-xs text-gray-500">Tổng nhóm máy</div>
          <div className="text-lg font-bold text-blue-700">{stats.machines}</div>
        </div>
        <div className="bg-green-50 rounded-lg px-3 py-2">
          <div className="text-xs text-gray-500">Tổng ca sản xuất</div>
          <div className="text-lg font-bold text-green-700">{stats.total}</div>
        </div>
        <div className="bg-purple-50 rounded-lg px-3 py-2">
          <div className="text-xs text-gray-500">Uptime trung bình</div>
          <div className="text-lg font-bold text-purple-700">{stats.avgUptime}%</div>
        </div>
        <div className="bg-orange-50 rounded-lg px-3 py-2">
          <div className="text-xs text-gray-500">Tổng sản lượng</div>
          <div className="text-lg font-bold text-orange-700">{stats.totalOutput}</div>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded-lg shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input 
            className="pl-9 h-8 text-xs" 
            placeholder="Tìm máy, dự án..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <Select value={machineFilter} onValueChange={setMachineFilter}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn máy" /></SelectTrigger>
          <SelectContent>
            {MACHINE_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Chọn tháng" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tất cả tháng</SelectItem>
            {monthOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="text-xs text-gray-500 flex items-center">
          {groupedData.length} nhóm
        </div>
      </div>

      {/* Bảng dữ liệu đã gom nhóm */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-xs font-semibold">Máy</TableHead>
                  <TableHead className="text-xs font-semibold">Ngày</TableHead>
                  <TableHead className="text-center text-xs font-semibold">Số ca</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Sản lượng</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Uptime TB</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Downtime TB</TableHead>
                  <TableHead className="text-center text-xs font-semibold">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!groupedData.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-gray-400">
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedData.map((group, idx) => {
                    const key = `${group.machine}_${group.date}`;
                    const isExpanded = expandedRows.has(key);
                    
                    return (
                      <>
                        {/* Row chính */}
                        <TableRow 
                          key={key} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleExpand(key)}
                        >
                          <TableCell>
                            <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{group.machine}</TableCell>
                          <TableCell className="text-xs">{group.date}</TableCell>
                          <TableCell className="text-center text-xs">
                            <Badge variant="secondary">{group.totalCa}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-orange-600">
                            {group.totalOutput}
                          </TableCell>
                          <TableCell className="text-right text-xs text-green-600 font-semibold">
                            {group.avgUptime}%
                          </TableCell>
                          <TableCell className="text-right text-xs text-red-500">
                            {group.avgDowntime}%
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatus(group.avgUptime, group.avgQuality)}
                          </TableCell>
                        </TableRow>

                        {/* Chi tiết mở rộng */}
                        {isExpanded && (
                          <TableRow className="bg-gray-50">
                            <TableCell colSpan={8} className="p-0">
                              <div className="p-3 border-t">
                                <div className="text-xs text-gray-500 mb-2">
                                  Chi tiết {group.totalCa} ca sản xuất:
                                </div>
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-gray-100">
                                      <TableHead className="text-xs">STT</TableHead>
                                      <TableHead className="text-xs">Sản lượng</TableHead>
                                      <TableHead className="text-right text-xs">Uptime</TableHead>
                                      <TableHead className="text-right text-xs">Downtime</TableHead>
                                      <TableHead className="text-xs">Ghi chú</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {group.details.map((d, i) => (
                                      <TableRow key={d.id} className="text-xs">
                                        <TableCell>{i + 1}</TableCell>
                                        <TableCell>{d.output}</TableCell>
                                        <TableCell className="text-right text-green-600">{d.uptime}%</TableCell>
                                        <TableCell className="text-right text-red-500">{d.downtime}%</TableCell>
                                        <TableCell className="text-gray-500 max-w-[200px] truncate">{d.note}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {groupedData.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500 border-t">
              <span>Hiển thị {groupedData.length} nhóm máy</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}