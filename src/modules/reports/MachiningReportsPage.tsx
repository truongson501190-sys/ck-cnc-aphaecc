import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

import {
  ArrowLeft,
  BarChart3,
  Drill,
  DollarSign,
  FileWarning,
  Search,
  Download,
  TrendingUp,
  FilterX,
  Printer,
  Calendar,
  Factory,
  Users,
  Clock,
  Package,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ToolEntry {
  tenDao: string;
  slCap: number;
  slSuDung: number;
  hong: number;
  donVi: string;
  donGia: number;
  thanhTien: number;
}

interface ProductionLog {
  id: string;
  ngay: string;
  may: string;
  maDuAn: string;
  tenDuAn: string;
  banVeSo: string;
  tenChiTiet: string;
  noiDung: string;
  vatLieu: string;
  sanLuong: number;
  gioGa: number;
  gioChay: number;
  nguoiVanHanh: string;
  ca: string;
  chiPhiGa: number;
  chiPhiChayMay: number;
  chiPhiDao: number;
  tongChiPhi: number;
  toolEntries: ToolEntry[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface MachineRate {
  id: string;
  maMay: string;
  tenMay: string;
  gia8h1Ca?: string;
  gia10h1Ca?: string;
  gia8h2Ca?: string;
  gia10h2Ca?: string;
  gia12h1Ca?: string;
  gia12h2Ca?: string;
  ghiChu?: string;
}

const STORAGE_KEY = 'PRODUCTION_LOGS_DATA';
const MACHINE_STORAGE_KEY = 'machines';

export function MachiningReportsPage() {
  const [reports, setReports] = useState<ProductionLog[]>([]);
  const [machineRates, setMachineRates] = useState<MachineRate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMachine, setSelectedMachine] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [selectedOperator, setSelectedOperator] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // State cho dialog xem chi tiết
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ProductionLog | null>(null);
  
  // State cho sub-sections
  const [openSubSections, setOpenSubSections] = useState({
    production: true,
    tools: true,
    damage: true,
    cost: true,
  });

  const toggleSubSection = (section: keyof typeof openSubSections) => {
    setOpenSubSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Load dữ liệu máy móc
  const loadMachineRates = () => {
    try {
      const saved = localStorage.getItem(MACHINE_STORAGE_KEY);
      if (saved) {
        setMachineRates(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading machine rates:', error);
    }
  };

  const getMachineRate = (tenMay: string, loaiCa: string, soGio: number): number => {
    const machine = machineRates.find(m => 
      m.tenMay?.toLowerCase().trim() === tenMay?.toLowerCase().trim()
    );
    
    if (!machine) return 0;

    let rateKey = '';
    if (soGio === 8 && loaiCa === 'Ngày') rateKey = 'gia8h1Ca';
    else if (soGio === 10 && loaiCa === 'Ngày') rateKey = 'gia10h1Ca';
    else if (soGio === 8 && loaiCa === 'Đêm') rateKey = 'gia8h2Ca';
    else if (soGio === 10 && loaiCa === 'Đêm') rateKey = 'gia10h2Ca';
    else if (soGio === 12 && loaiCa === 'Ngày') rateKey = 'gia12h1Ca';
    else if (soGio === 12 && loaiCa === 'Đêm') rateKey = 'gia12h2Ca';
    else return 0;

    const rateValue = machine[rateKey as keyof MachineRate];
    if (!rateValue) return 0;
    
    let numericValue = Number(String(rateValue).replace(/[^0-9.-]/g, ''));
    if (isNaN(numericValue)) return 0;
    numericValue = Math.round(numericValue);
    
    return numericValue;
  };

  const getStandardHours = (gioThucTe: number): number => {
    if (gioThucTe >= 11.5 && gioThucTe <= 12.5) return 12;
    if (gioThucTe >= 9.5 && gioThucTe <= 10.5) return 10;
    return 8;
  };

  const calculateCost = (gioThucTe: number, loaiCa: string, donGiaCaChuan: number, soGioChuan: number): number => {
    if (donGiaCaChuan === 0) return 0;
    return (gioThucTe / soGioChuan) * donGiaCaChuan;
  };

  const loadReports = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setReports([]);
        return;
      }

      const parsed: any[] = JSON.parse(raw);
      const converted = parsed.map(item => ({
        ...item,
        tenChiTiet: item.tenChiTiet || '',
        noiDung: item.noiDung || '',
        vatLieu: item.vatLieu || '',
        ca: item.ca || 'Ngày',
        chiPhiGa: 0,
        chiPhiChayMay: 0,
        chiPhiDao: item.chiPhiDao || 0,
        tongChiPhi: 0,
        toolEntries: item.toolEntries || [],
        createdAt: item.createdAt || new Date().toISOString(),
      }));

      const approved = converted.filter(item => item.status === 'approved');
      setReports(approved);
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports([]);
    }
  };

  const processedReports = useMemo(() => {
    return reports.map(report => {
      const tenMay = report.may;
      const loaiCa = report.ca || 'Ngày';
      
      const gioGaThucTe = report.gioGa || 0;
      const soGioChuanGa = getStandardHours(gioGaThucTe);
      const donGiaCaGa = getMachineRate(tenMay, loaiCa, soGioChuanGa);
      const chiPhiGaTinhToan = calculateCost(gioGaThucTe, loaiCa, donGiaCaGa, soGioChuanGa);
      
      const gioChayThucTe = report.gioChay || 0;
      const soGioChuanChay = getStandardHours(gioChayThucTe);
      const donGiaCaChay = getMachineRate(tenMay, loaiCa, soGioChuanChay);
      const chiPhiChayMayTinhToan = calculateCost(gioChayThucTe, loaiCa, donGiaCaChay, soGioChuanChay);
      
      const chiPhiDao = (report.toolEntries || []).reduce((sum, tool) => sum + (tool.thanhTien || 0), 0);
      const tongChiPhi = chiPhiGaTinhToan + chiPhiChayMayTinhToan + chiPhiDao;
      
      return {
        ...report,
        chiPhiGa: chiPhiGaTinhToan,
        chiPhiChayMay: chiPhiChayMayTinhToan,
        chiPhiDao: chiPhiDao,
        tongChiPhi: tongChiPhi,
      };
    });
  }, [reports, machineRates]);

  const years = useMemo(() => {
    const uniqueYears = [...new Set(processedReports.map((item) => {
      try {
        return new Date(item.ngay).getFullYear();
      } catch {
        return new Date().getFullYear();
      }
    }))];
    return uniqueYears.sort((a, b) => b - a);
  }, [processedReports]);

  const uniqueMachines = useMemo(() => {
    return [...new Set(processedReports.map(r => r.may).filter(Boolean))];
  }, [processedReports]);

  const uniqueOperators = useMemo(() => {
    return [...new Set(processedReports.map(r => r.nguoiVanHanh).filter(Boolean))];
  }, [processedReports]);

  const filteredReports = useMemo(() => {
    let filtered = processedReports.filter((item) => {
      const keyword = searchTerm.toLowerCase();
      let itemYear = '';
      try {
        itemYear = String(new Date(item.ngay).getFullYear());
      } catch {
        itemYear = String(new Date().getFullYear());
      }

      const matchYear = selectedYear === 'all' || itemYear === selectedYear;
      const matchMachine = selectedMachine === 'all' || item.may === selectedMachine;
      const matchShift = selectedShift === 'all' || item.ca === selectedShift;
      const matchOperator = selectedOperator === 'all' || item.nguoiVanHanh === selectedOperator;
      const matchKeyword = (item.maDuAn || '').toLowerCase().includes(keyword) ||
        (item.tenDuAn || '').toLowerCase().includes(keyword) ||
        (item.may || '').toLowerCase().includes(keyword) ||
        (item.nguoiVanHanh || '').toLowerCase().includes(keyword);

      return matchYear && matchMachine && matchShift && matchOperator && matchKeyword;
    });

    switch (sortBy) {
      case 'date_asc':
        filtered.sort((a, b) => new Date(a.ngay).getTime() - new Date(b.ngay).getTime());
        break;
      case 'date_desc':
        filtered.sort((a, b) => new Date(b.ngay).getTime() - new Date(a.ngay).getTime());
        break;
      case 'cost_desc':
        filtered.sort((a, b) => b.tongChiPhi - a.tongChiPhi);
        break;
      case 'output_desc':
        filtered.sort((a, b) => b.sanLuong - a.sanLuong);
        break;
    }

    return filtered;
  }, [processedReports, searchTerm, selectedYear, selectedMachine, selectedShift, selectedOperator, sortBy]);

  const toolReports = useMemo(() => {
    return filteredReports.flatMap((report) =>
      (report.toolEntries || []).map((tool) => ({
        ngay: report.ngay,
        may: report.may,
        maDuAn: report.maDuAn,
        tenDao: tool.tenDao,
        slCap: tool.slCap,
        slSuDung: tool.slSuDung,
        hong: tool.hong,
        donVi: tool.donVi,
        donGia: tool.donGia,
        thanhTien: tool.thanhTien,
        nguoiVanHanh: report.nguoiVanHanh,
      }))
    );
  }, [filteredReports]);

  const toolDamageReports = useMemo(() => {
    return toolReports
      .filter((item) => item.hong > 0)
      .map((item) => ({
        ...item,
        thietHai: item.hong * item.donGia,
      }));
  }, [toolReports]);

  const totalProduction = filteredReports.reduce((sum, item) => sum + (item.sanLuong || 0), 0);
  const totalRunCost = filteredReports.reduce((sum, item) => sum + (item.chiPhiChayMay || 0), 0);
  const totalSetupCost = filteredReports.reduce((sum, item) => sum + (item.chiPhiGa || 0), 0);
  const totalToolCost = toolReports.reduce((sum, item) => sum + (item.thanhTien || 0), 0);
  const totalDamageCost = toolDamageReports.reduce((sum, item) => sum + (item.thietHai || 0), 0);
  const totalCost = totalRunCost + totalSetupCost + totalToolCost + totalDamageCost;
  const totalRunHours = filteredReports.reduce((sum, item) => sum + (item.gioChay || 0), 0);
  const totalSetupHours = filteredReports.reduce((sum, item) => sum + (item.gioGa || 0), 0);

  const formatCurrency = (value: number) => {
    if (!value && value !== 0) return '0 đ';
    return value.toLocaleString('vi-VN') + ' đ';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('vi-VN');
    } catch {
      return dateString;
    }
  };

  const handleExportFullReport = () => {
    const exportData = filteredReports.map(item => ({
      'Ngày': formatDate(item.ngay),
      'Máy': item.may,
      'Ca': item.ca,
      'Mã Dự Án': item.maDuAn,
      'Tên Dự Án': item.tenDuAn,
      'Tên Chi Tiết': item.tenChiTiet,
      'Số Lượng': item.sanLuong,
      'Giờ Gá': item.gioGa,
      'Giờ Chạy': item.gioChay,
      'Người Vận Hành': item.nguoiVanHanh,
      'Chi Phí Gá': item.chiPhiGa,
      'Chi Phí Chạy': item.chiPhiChayMay,
      'Chi Phí Dao': item.chiPhiDao,
      'Tổng Chi Phí': item.tongChiPhi,
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoGiaCong');
    XLSX.writeFile(wb, `baocao_giacong_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedYear('all');
    setSelectedMachine('all');
    setSelectedShift('all');
    setSelectedOperator('all');
    setSortBy('date_desc');
    toast.info('Đã reset bộ lọc');
  };

  useEffect(() => {
    loadMachineRates();
    loadReports();

    const reload = () => {
      loadMachineRates();
      loadReports();
    };

    window.addEventListener('storage', reload);
    window.addEventListener('app-data-synced', reload);

    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener('app-data-synced', reload);
    };
  }, []);

  // Hàm xử lý click xem chi tiết
  const handleViewDetail = (report: ProductionLog) => {
    setSelectedReport(report);
    setIsViewDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Link to="/">
              <Button variant="outline" className="h-11 w-11 p-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">📊 Báo cáo & Dashboard</h1>
              <p className="text-sm text-slate-600 mt-2">
                Tổng hợp dữ liệu sản xuất sau phê duyệt. Click vào dòng để xem chi tiết.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Xuất báo cáo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExportFullReport}>
                  <Download className="w-4 h-4 mr-2" /> Xuất Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-2" /> In báo cáo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Badge className="h-10 px-4 text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              {filteredReports.length} báo cáo
            </Badge>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="text-sm text-slate-500">Tổng sản lượng</div>
                <Package className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold mt-2">{totalProduction.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="text-sm text-slate-500">Tiền chạy máy</div>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-bold mt-2 text-blue-600">{formatCurrency(totalRunCost)}</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="text-sm text-slate-500">Tiền gá</div>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-bold mt-2 text-amber-600">{formatCurrency(totalSetupCost)}</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="text-sm text-slate-500">Chi phí dao cụ</div>
                <Drill className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-bold mt-2 text-emerald-600">{formatCurrency(totalToolCost)}</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="text-sm text-slate-500">Hao hụt dao</div>
                <FileWarning className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-xl font-bold mt-2 text-red-600">{formatCurrency(totalDamageCost)}</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow bg-gradient-to-r from-red-50 to-orange-50">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="text-sm text-slate-600 font-medium">Tổng chi phí</div>
                <DollarSign className="w-4 h-4 text-red-600" />
              </div>
              <div className="text-2xl font-bold mt-2 text-red-700">{formatCurrency(totalCost)}</div>
            </CardContent>
          </Card>
        </div>

        {/* FILTER SECTION */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-semibold">🔍 Bộ lọc nâng cao</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                {showAdvancedFilters ? '📋 Thu gọn' : '⚙️ Mở rộng'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  className="pl-10" 
                  placeholder="Tìm kiếm..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)} 
                className="h-10 rounded-md border px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">📅 Tất cả năm</option>
                {years.map((year) => (<option key={year} value={String(year)}>{year}</option>))}
              </select>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)} 
                className="h-10 rounded-md border px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date_desc">📅 Mới nhất trước</option>
                <option value="date_asc">📅 Cũ nhất trước</option>
                <option value="cost_desc">💰 Chi phí cao nhất</option>
                <option value="output_desc">📦 Sản lượng cao nhất</option>
              </select>
              <Button variant="outline" onClick={resetFilters} className="gap-2">
                <FilterX className="w-4 h-4" />
                Reset
              </Button>
            </div>

            {showAdvancedFilters && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select 
                    value={selectedMachine} 
                    onChange={(e) => setSelectedMachine(e.target.value)} 
                    className="h-10 rounded-md border px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">🛠️ Tất cả máy</option>
                    {uniqueMachines.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select 
                    value={selectedShift} 
                    onChange={(e) => setSelectedShift(e.target.value)} 
                    className="h-10 rounded-md border px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">🕒 Tất cả ca</option>
                    <option value="Ngày">☀️ Ca ngày</option>
                    <option value="Đêm">🌙 Ca đêm</option>
                  </select>
                  <select 
                    value={selectedOperator} 
                    onChange={(e) => setSelectedOperator(e.target.value)} 
                    className="h-10 rounded-md border px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">👨‍🔧 Tất cả NV vận hành</option>
                    {uniqueOperators.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* BÁO CÁO TỔNG HỢP CHÍNH */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white">
            <CardTitle className="text-xl">📊 BÁO CÁO TỔNG HỢP SẢN XUẤT</CardTitle>
            <p className="text-sm text-slate-300 mt-1">Tổng hợp toàn bộ dữ liệu sản xuất - Click vào dòng để xem chi tiết</p>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-200">
            
            {/* SUB-SECTION 1: TỔNG HỢP SẢN XUẤT */}
            <div>
              <div 
                className="w-full cursor-pointer bg-white hover:bg-slate-50 transition-colors p-4 flex justify-between items-center"
                onClick={() => toggleSubSection('production')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">📋 TỔNG HỢP SẢN XUẤT</h3>
                    <p className="text-xs text-slate-500">Click vào dòng để xem chi tiết</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-blue-50">
                    {filteredReports.length} báo cáo
                  </Badge>
                  {openSubSections.production ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>
              {openSubSections.production && (
                <div className="overflow-x-auto border-t">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border p-2">Ngày</th>
                        <th className="border p-2">Máy</th>
                        <th className="border p-2">Ca</th>
                        <th className="border p-2">Mã dự án</th>
                        <th className="border p-2">Tên dự án</th>
                        <th className="border p-2">Tên chi tiết</th>
                        <th className="border p-2 text-center">SL</th>
                        <th className="border p-2 text-center">Giờ gá</th>
                        <th className="border p-2 text-center">Giờ chạy</th>
                        <th className="border p-2">NV vận hành</th>
                        <th className="border p-2 text-right">Tiền gá</th>
                        <th className="border p-2 text-right">Tiền chạy</th>
                        <th className="border p-2 text-right">Tổng CP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.length === 0 ? (
                        <tr>
                          <td colSpan={13} className="border p-8 text-center text-slate-500">
                            Không có dữ liệu báo cáo
                          </td>
                        </tr>
                      ) : (
                        filteredReports.map((item) => (
                          <tr 
                            key={item.id} 
                            className="hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={() => handleViewDetail(item)}
                          >
                            <td className="border p-2">{formatDate(item.ngay)}</td>
                            <td className="border p-2 font-medium">{item.may || '---'}</td>
                            <td className="border p-2 text-center">
                              <Badge variant={item.ca === 'Ngày' ? 'default' : 'secondary'} className="text-xs">
                                {item.ca || '---'}
                              </Badge>
                            </td>
                            <td className="border p-2 font-semibold">{item.maDuAn || '---'}</td>
                            <td className="border p-2">{item.tenDuAn || '---'}</td>
                            <td className="border p-2 max-w-[150px] truncate" title={item.tenChiTiet}>
                              {item.tenChiTiet || '---'}
                            </td>
                            <td className="border p-2 text-center">{item.sanLuong || 0}</td>
                            <td className="border p-2 text-center">{item.gioGa || 0}h</td>
                            <td className="border p-2 text-center">{item.gioChay || 0}h</td>
                            <td className="border p-2">{item.nguoiVanHanh || '---'}</td>
                            <td className="border p-2 text-right text-amber-600">{formatCurrency(item.chiPhiGa || 0)}</td>
                            <td className="border p-2 text-right text-blue-600">{formatCurrency(item.chiPhiChayMay || 0)}</td>
                            <td className="border p-2 text-right text-red-600 font-bold">{formatCurrency(item.tongChiPhi || 0)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SUB-SECTION 2: DAO CỤ SỬ DỤNG */}
            <div>
              <div 
                className="w-full cursor-pointer bg-white hover:bg-slate-50 transition-colors p-4 flex justify-between items-center"
                onClick={() => toggleSubSection('tools')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Drill className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">🔧 DAO CỤ SỬ DỤNG</h3>
                    <p className="text-xs text-slate-500">Chi tiết các loại dao cụ đã sử dụng</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-emerald-50">
                    {toolReports.length} lượt sử dụng
                  </Badge>
                  {openSubSections.tools ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>
              {openSubSections.tools && (
                <div className="overflow-x-auto border-t">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border p-2">Ngày</th>
                        <th className="border p-2">Máy</th>
                        <th className="border p-2">Dự án</th>
                        <th className="border p-2">Tên dao</th>
                        <th className="border p-2 text-center">SL cấp</th>
                        <th className="border p-2 text-center">SL dùng</th>
                        <th className="border p-2 text-center">Hỏng</th>
                        <th className="border p-2">ĐVT</th>
                        <th className="border p-2 text-right">Đơn giá</th>
                        <th className="border p-2 text-right">Thành tiền</th>
                        <th className="border p-2">NV vận hành</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toolReports.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="border p-8 text-center text-slate-500">
                            Không có dữ liệu dao cụ
                          </td>
                        </tr>
                      ) : (
                        toolReports.map((tool, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="border p-2">{formatDate(tool.ngay)}</td>
                            <td className="border p-2">{tool.may || '---'}</td>
                            <td className="border p-2">{tool.maDuAn || '---'}</td>
                            <td className="border p-2 font-medium">{tool.tenDao || '---'}</td>
                            <td className="border p-2 text-center">{tool.slCap || 0}</td>
                            <td className="border p-2 text-center">{tool.slSuDung || 0}</td>
                            <td className="border p-2 text-center text-red-600 font-bold">{tool.hong || 0}</td>
                            <td className="border p-2">{tool.donVi || '---'}</td>
                            <td className="border p-2 text-right">{formatCurrency(tool.donGia)}</td>
                            <td className="border p-2 text-right text-emerald-600 font-semibold">{formatCurrency(tool.thanhTien)}</td>
                            <td className="border p-2">{tool.nguoiVanHanh || '---'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SUB-SECTION 3: HAO HỤT DAO CỤ */}
            <div>
              <div 
                className="w-full cursor-pointer bg-white hover:bg-slate-50 transition-colors p-4 flex justify-between items-center"
                onClick={() => toggleSubSection('damage')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <FileWarning className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">⚠️ HAO HỤT DAO CỤ</h3>
                    <p className="text-xs text-slate-500">Thống kê dao cụ bị hỏng</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-red-50 text-red-600">
                    {toolDamageReports.length} sự cố
                  </Badge>
                  {openSubSections.damage ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>
              {openSubSections.damage && (
                <div className="overflow-x-auto border-t">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border p-2">Ngày</th>
                        <th className="border p-2">Máy</th>
                        <th className="border p-2">Dự án</th>
                        <th className="border p-2">Dao cụ</th>
                        <th className="border p-2 text-center">SL hỏng</th>
                        <th className="border p-2 text-right">Đơn giá</th>
                        <th className="border p-2 text-right">Thiệt hại</th>
                        <th className="border p-2">NV vận hành</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toolDamageReports.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="border p-8 text-center text-slate-500">
                            Không có dữ liệu hao hụt dao cụ
                          </td>
                        </tr>
                      ) : (
                        toolDamageReports.map((tool, index) => (
                          <tr key={index} className="hover:bg-red-50 transition-colors">
                            <td className="border p-2">{formatDate(tool.ngay)}</td>
                            <td className="border p-2">{tool.may || '---'}</td>
                            <td className="border p-2">{tool.maDuAn || '---'}</td>
                            <td className="border p-2 font-medium">{tool.tenDao || '---'}</td>
                            <td className="border p-2 text-center text-red-600 font-bold">{tool.hong || 0}</td>
                            <td className="border p-2 text-right">{formatCurrency(tool.donGia)}</td>
                            <td className="border p-2 text-right text-red-600 font-bold">{formatCurrency(tool.thietHai)}</td>
                            <td className="border p-2">{tool.nguoiVanHanh || '---'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SUB-SECTION 4: CHI PHÍ GIA CÔNG */}
            <div>
              <div 
                className="w-full cursor-pointer bg-white hover:bg-slate-50 transition-colors p-4 flex justify-between items-center"
                onClick={() => toggleSubSection('cost')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">💰 CHI PHÍ GIA CÔNG</h3>
                    <p className="text-xs text-slate-500">Phân tích chi tiết các khoản chi phí</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-purple-50">
                    {formatCurrency(totalCost)} tổng CP
                  </Badge>
                  {openSubSections.cost ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>
              {openSubSections.cost && (
                <div className="overflow-x-auto border-t">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="border p-2">Ngày</th>
                        <th className="border p-2">Máy</th>
                        <th className="border p-2">Ca</th>
                        <th className="border p-2">Dự án</th>
                        <th className="border p-2 text-right">CP chạy</th>
                        <th className="border p-2 text-right">CP gá</th>
                        <th className="border p-2 text-right">CP dao</th>
                        <th className="border p-2 text-right">Hao hụt</th>
                        <th className="border p-2 text-right">Tổng CP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="border p-8 text-center text-slate-500">
                            Không có dữ liệu chi phí
                          </td>
                        </tr>
                      ) : (
                        filteredReports.map((item) => {
                          const toolCost = (item.toolEntries || []).reduce((sum, tool) => sum + (tool.thanhTien || 0), 0);
                          const damageCost = (item.toolEntries || []).reduce((sum, tool) => sum + (tool.hong || 0) * (tool.donGia || 0), 0);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="border p-2">{formatDate(item.ngay)}</td>
                              <td className="border p-2">{item.may || '---'}</td>
                              <td className="border p-2 text-center">{item.ca || '---'}</td>
                              <td className="border p-2">{item.maDuAn || '---'}</td>
                              <td className="border p-2 text-right text-blue-600">{formatCurrency(item.chiPhiChayMay || 0)}</td>
                              <td className="border p-2 text-right text-amber-600">{formatCurrency(item.chiPhiGa || 0)}</td>
                              <td className="border p-2 text-right text-emerald-600">{formatCurrency(toolCost)}</td>
                              <td className="border p-2 text-right text-red-600">{formatCurrency(damageCost)}</td>
                              <td className="border p-2 text-right text-red-700 font-bold">{formatCurrency(item.tongChiPhi || 0)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 font-semibold">
                      <tr>
                        <td colSpan={4} className="border p-2 text-right">Tổng cộng:</td>
                        <td className="border p-2 text-right text-blue-700">{formatCurrency(totalRunCost)}</td>
                        <td className="border p-2 text-right text-amber-700">{formatCurrency(totalSetupCost)}</td>
                        <td className="border p-2 text-right text-emerald-700">{formatCurrency(totalToolCost)}</td>
                        <td className="border p-2 text-right text-red-700">{formatCurrency(totalDamageCost)}</td>
                        <td className="border p-2 text-right text-red-800 font-bold">{formatCurrency(totalCost)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* FOOTER SUMMARY */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">Tổng giờ chạy:</span>
                  <span className="font-bold">{totalRunHours.toFixed(1)}h</span>
                </div>
                <div className="w-px h-4 bg-slate-300" />
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">Tổng giờ gá:</span>
                  <span className="font-bold">{totalSetupHours.toFixed(1)}h</span>
                </div>
                <div className="w-px h-4 bg-slate-300" />
                <div className="flex items-center gap-2">
                  <Factory className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">Số máy hoạt động:</span>
                  <span className="font-bold">{uniqueMachines.length}</span>
                </div>
                <div className="w-px h-4 bg-slate-300" />
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-600">Số NV vận hành:</span>
                  <span className="font-bold">{uniqueOperators.length}</span>
                </div>
              </div>
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Cập nhật lần cuối: {new Date().toLocaleString('vi-VN')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DIALOG XEM CHI TIẾT */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>📄 CHI TIẾT BÁO CÁO SẢN XUẤT</DialogTitle>
            </DialogHeader>
            
            {selectedReport && (
              <div className="space-y-4">
                {/* Thông tin chính */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex"><span className="w-32 text-gray-600">Ngày tháng:</span><span className="font-medium">{formatDate(selectedReport.ngay)}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Máy Sản Xuất:</span><span className="font-medium">{selectedReport.may}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Mã Dự Án:</span><span className="font-medium text-blue-600">{selectedReport.maDuAn}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Tên Dự Án:</span><span className="font-medium">{selectedReport.tenDuAn}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Bản Vẽ Số:</span><span>{selectedReport.banVeSo || '---'}</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex"><span className="w-32 text-gray-600">Tên Chi Tiết:</span><span>{selectedReport.tenChiTiet || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Nội dung Gia Công:</span><span>{selectedReport.noiDung || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Vật Liệu:</span><span>{selectedReport.vatLieu || '---'}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Người Vận Hành:</span><span>{selectedReport.nguoiVanHanh}</span></div>
                    <div className="flex"><span className="w-32 text-gray-600">Ca sản xuất:</span><span>{selectedReport.ca}</span></div>
                  </div>
                </div>

                {/* Sản lượng và thời gian */}
                <div className="grid grid-cols-3 gap-4 border-t pt-4">
                  <div className="text-center"><p className="text-gray-600 text-sm">Số lượng</p><p className="text-xl font-bold">{selectedReport.sanLuong?.toLocaleString() || 0}</p></div>
                  <div className="text-center"><p className="text-gray-600 text-sm">Giờ gá</p><p className="text-xl font-bold">{selectedReport.gioGa}h</p></div>
                  <div className="text-center"><p className="text-gray-600 text-sm">Giờ chạy</p><p className="text-xl font-bold">{selectedReport.gioChay}h</p></div>
                </div>

                {/* Thông tin dao cụ */}
                {selectedReport.toolEntries && selectedReport.toolEntries.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">🔧 Thông tin Dao Cụ</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="border p-2">Tên Dao</th>
                            <th className="border p-2 text-center">SL Cấp</th>
                            <th className="border p-2 text-center">SL Sử Dụng</th>
                            <th className="border p-2 text-center">SL Hỏng</th>
                            <th className="border p-2">Đơn Vị</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReport.toolEntries.map((tool, idx) => (
                            <tr key={idx}>
                              <td className="border p-2">{tool.tenDao}</td>
                              <td className="border p-2 text-center">{tool.slCap}</td>
                              <td className="border p-2 text-center">{tool.slSuDung}</td>
                              <td className="border p-2 text-center text-red-600">{tool.hong}</td>
                              <td className="border p-2">{tool.donVi}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Trạng thái */}
                <div className="flex justify-between items-center border-t pt-4 text-sm text-gray-500">
                  <div>Trạng thái: <Badge className="bg-green-600">Đã duyệt</Badge></div>
                  <div>Ngày tạo: {new Date(selectedReport.createdAt).toLocaleString('vi-VN')}</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default MachiningReportsPage;