import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  ArrowLeft,
  BarChart3,
  Drill,
  DollarSign,
  FileWarning,
  Search,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

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
  sanLuong: number;
  gioGa: number;
  gioChay: number;
  nguoiVanHanh: string;
  ca: string;  // Thêm trường ca: "Ngày" hoặc "Đêm"
  chiPhiGa: number;
  chiPhiChayMay: number;
  chiPhiDao: number;
  tongChiPhi: number;
  toolEntries: ToolEntry[];
  status: 'pending' | 'approved' | 'rejected';
}

// Interface cho dữ liệu máy móc từ localStorage
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

  // Load dữ liệu máy móc từ localStorage
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

  // Hàm lấy đơn giá ca máy dựa trên tên máy, loại ca và số giờ
const getMachineRate = (tenMay: string, loaiCa: string, soGio: number): number => {
  // Tìm máy theo tên (không phân biệt hoa thường)
  const machine = machineRates.find(m => 
    m.tenMay?.toLowerCase().trim() === tenMay?.toLowerCase().trim()
  );
  
  if (!machine) {
    console.warn(`Không tìm thấy cấu hình giá cho máy: ${tenMay}`);
    return 0;
  }

  // Xác định key để lấy giá dựa trên số giờ và loại ca
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
  
  // Chuyển đổi string sang number (bỏ dấu phẩy, khoảng trắng)
  let numericValue = Number(String(rateValue).replace(/[^0-9.-]/g, ''));
  if (isNaN(numericValue)) return 0;
  
  // LÀM TRÒN SỐ - loại bỏ số lẻ thập phân
  numericValue = Math.round(numericValue);
  
  return numericValue;
};
  // Hàm xác định số giờ chuẩn của ca dựa trên giờ thực tế
  const getStandardHours = (gioThucTe: number): number => {
    if (gioThucTe >= 11.5 && gioThucTe <= 12.5) return 12;
    if (gioThucTe >= 9.5 && gioThucTe <= 10.5) return 10;
    return 8; // Mặc định ca 8h
  };

  // Hàm tính chi phí dựa trên giờ thực tế, loại ca và đơn giá ca chuẩn
  const calculateCost = (gioThucTe: number, loaiCa: string, donGiaCaChuan: number, soGioChuan: number): number => {
    if (donGiaCaChuan === 0) return 0;
    // Chi phí = (Giờ thực tế / Giờ chuẩn) * Đơn giá ca chuẩn
    return (gioThucTe / soGioChuan) * donGiaCaChuan;
  };

  // Load reports from localStorage
  const loadReports = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setReports([]);
        return;
      }

      const parsed: any[] = JSON.parse(raw);

      // Chuyển đổi dữ liệu cũ sang định dạng mới
      const converted = parsed.map(item => ({
        ...item,
        tenChiTiet: item.tenChiTiet || '',
        noiDung: item.noiDung || '',
        ca: item.ca || 'Ngày',  // Mặc định ca Ngày nếu chưa có
        chiPhiGa: 0,  // Sẽ tính lại
        chiPhiChayMay: 0,  // Sẽ tính lại
        chiPhiDao: item.chiPhiDao || 0,
        tongChiPhi: 0,  // Sẽ tính lại
        toolEntries: item.toolEntries || [],
      }));

      // Chỉ lấy báo cáo đã được duyệt
      const approved = converted.filter(
        (item) => item.status === 'approved'
      );

      setReports(approved);
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports([]);
    }
  };

  // Xử lý dữ liệu báo cáo với chi phí được tính từ module máy móc
  const processedReports = useMemo(() => {
    return reports.map(report => {
      const tenMay = report.may;
      const loaiCa = report.ca || 'Ngày';
      
      // === TÍNH CHI PHÍ GÁ ===
      const gioGaThucTe = report.gioGa || 0;
      const soGioChuanGa = getStandardHours(gioGaThucTe);
      const donGiaCaGa = getMachineRate(tenMay, loaiCa, soGioChuanGa);
      const chiPhiGaTinhToan = calculateCost(gioGaThucTe, loaiCa, donGiaCaGa, soGioChuanGa);
      
      // === TÍNH CHI PHÍ CHẠY MÁY ===
      const gioChayThucTe = report.gioChay || 0;
      const soGioChuanChay = getStandardHours(gioChayThucTe);
      const donGiaCaChay = getMachineRate(tenMay, loaiCa, soGioChuanChay);
      const chiPhiChayMayTinhToan = calculateCost(gioChayThucTe, loaiCa, donGiaCaChay, soGioChuanChay);
      
      // Tổng chi phí dao cụ từ toolEntries
      const chiPhiDao = (report.toolEntries || []).reduce((sum, tool) => sum + (tool.thanhTien || 0), 0);
      
      // Tổng chi phí
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

  // Get unique years from reports
  const years = useMemo(() => {
    const uniqueYears = [
      ...new Set(
        processedReports.map((item) => {
          try {
            return new Date(item.ngay).getFullYear();
          } catch {
            return new Date().getFullYear();
          }
        })
      ),
    ];
    return uniqueYears.sort((a, b) => b - a);
  }, [processedReports]);

  // Filter reports based on search term and year
  const filteredReports = useMemo(() => {
    return processedReports.filter((item) => {
      const keyword = searchTerm.toLowerCase();

      let itemYear = '';
      try {
        itemYear = String(new Date(item.ngay).getFullYear());
      } catch {
        itemYear = String(new Date().getFullYear());
      }

      const matchYear =
        selectedYear === 'all' ||
        itemYear === selectedYear;

      const matchKeyword =
        (item.maDuAn || '').toLowerCase().includes(keyword) ||
        (item.tenDuAn || '').toLowerCase().includes(keyword) ||
        (item.may || '').toLowerCase().includes(keyword) ||
        (item.nguoiVanHanh || '').toLowerCase().includes(keyword) ||
        (item.tenChiTiet || '').toLowerCase().includes(keyword) ||
        (item.noiDung || '').toLowerCase().includes(keyword);

      return matchYear && matchKeyword;
    });
  }, [processedReports, searchTerm, selectedYear]);

  // Tool reports - flatten all tool entries from filtered reports
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

  // Tool damage reports - only tools with damage
  const toolDamageReports = useMemo(() => {
    return toolReports
      .filter((item) => item.hong > 0)
      .map((item) => ({
        ...item,
        thietHai: item.hong * item.donGia,
      }));
  }, [toolReports]);

  // Calculate totals
  const totalProduction = filteredReports.reduce(
    (sum, item) => sum + (item.sanLuong || 0),
    0
  );

  const totalRunCost = filteredReports.reduce(
    (sum, item) => sum + (item.chiPhiChayMay || 0),
    0
  );

  const totalSetupCost = filteredReports.reduce(
    (sum, item) => sum + (item.chiPhiGa || 0),
    0
  );

  const totalToolCost = toolReports.reduce(
    (sum, item) => sum + (item.thanhTien || 0),
    0
  );

  const totalDamageCost = toolDamageReports.reduce(
    (sum, item) => sum + (item.thietHai || 0),
    0
  );

  const totalCost =
    totalRunCost +
    totalSetupCost +
    totalToolCost +
    totalDamageCost;

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

  // Initial load and event listeners
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
              <h1 className="text-3xl font-bold text-slate-900">Báo cáo gia công</h1>
              <p className="text-sm text-slate-600 mt-2">
                Tổng hợp dữ liệu sản xuất sau phê duyệt. Chi phí gá và chạy máy được tính tự động theo giá ca máy.
              </p>
            </div>
          </div>
          <Badge className="h-10 px-4 text-sm">{filteredReports.length} báo cáo</Badge>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <Card><CardContent className="p-5"><div className="text-sm text-slate-500">Tổng sản lượng</div><div className="text-2xl font-bold mt-2">{totalProduction}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="text-sm text-slate-500">Tiền chạy máy</div><div className="text-2xl font-bold mt-2 text-blue-600">{formatCurrency(totalRunCost)}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="text-sm text-slate-500">Tiền gá</div><div className="text-2xl font-bold mt-2 text-amber-600">{formatCurrency(totalSetupCost)}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="text-sm text-slate-500">Chi phí dao cụ</div><div className="text-2xl font-bold mt-2 text-emerald-600">{formatCurrency(totalToolCost)}</div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="text-sm text-slate-500">Tổng chi phí</div><div className="text-2xl font-bold mt-2 text-red-600">{formatCurrency(totalCost)}</div></CardContent></Card>
        </div>

        {/* SEARCH AND FILTER */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="h-10 rounded-md border px-3 bg-white">
                <option value="all">Tất cả năm</option>
                {years.map((year) => (<option key={year} value={String(year)}>{year}</option>))}
              </select>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input className="pl-10" placeholder="Tìm máy, dự án, người vận hành..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TABS SECTION */}
        <Tabs defaultValue="production">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="production"><BarChart3 className="w-4 h-4 mr-2" />Tổng hợp sản xuất</TabsTrigger>
            <TabsTrigger value="tools"><Drill className="w-4 h-4 mr-2" />Dao cụ sử dụng</TabsTrigger>
            <TabsTrigger value="damage"><FileWarning className="w-4 h-4 mr-2" />Hao hụt dao cụ</TabsTrigger>
            <TabsTrigger value="cost"><DollarSign className="w-4 h-4 mr-2" />Chi phí gia công</TabsTrigger>
          </TabsList>

          {/* TAB 1: PRODUCTION SUMMARY */}
          <TabsContent value="production">
            <Card>
              <CardHeader><CardTitle>Tổng hợp sản xuất</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-slate-100">
                    <tr><th className="border p-2">Ngày</th><th className="border p-2">Máy</th><th className="border p-2">Ca</th><th className="border p-2">Dự án</th><th className="border p-2">Tên chi tiết</th><th className="border p-2">Nội dung</th><th className="border p-2">SL</th><th className="border p-2">Giờ gá</th><th className="border p-2">Giờ chạy</th><th className="border p-2">Người vận hành</th><th className="border p-2">Tiền gá</th><th className="border p-2">Tiền chạy</th><th className="border p-2">Tổng</th></tr>
                  </thead>
                  <tbody>
                    {filteredReports.length === 0 ? (<tr><td colSpan={13} className="border p-8 text-center text-slate-500">Không có dữ liệu báo cáo</td></tr>) : (
                      filteredReports.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="border p-2">{formatDate(item.ngay)}</td>
                          <td className="border p-2">{item.may || '---'}</td>
                          <td className="border p-2 text-center">{item.ca || '---'}</td>
                          <td className="border p-2"><div className="font-semibold">{item.maDuAn || '---'}</div><div className="text-xs text-slate-500">{item.tenDuAn || '---'}</div></td>
                          <td className="border p-2">{item.tenChiTiet || '---'}</td>
                          <td className="border p-2 max-w-[250px] truncate" title={item.noiDung}>{item.noiDung || '---'}</td>
                          <td className="border p-2 text-center">{item.sanLuong || 0}</td>
                          <td className="border p-2 text-center">{item.gioGa || 0}</td>
                          <td className="border p-2 text-center">{item.gioChay || 0}</td>
                          <td className="border p-2">{item.nguoiVanHanh || '---'}</td>
                          <td className="border p-2 text-right text-amber-600 font-medium">{formatCurrency(item.chiPhiGa || 0)}</td>
                          <td className="border p-2 text-right text-blue-600 font-medium">{formatCurrency(item.chiPhiChayMay || 0)}</td>
                          <td className="border p-2 text-right text-red-600 font-bold">{formatCurrency(item.tongChiPhi || 0)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: TOOL USAGE */}
          <TabsContent value="tools">
            <Card>
              <CardHeader><CardTitle>Dao cụ sử dụng</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-slate-100"><tr><th className="border p-2">Ngày</th><th className="border p-2">Máy</th><th className="border p-2">Dự án</th><th className="border p-2">Dao cụ</th><th className="border p-2">SL cấp</th><th className="border p-2">SL sử dụng</th><th className="border p-2">Hỏng</th><th className="border p-2">ĐVT</th><th className="border p-2">Đơn giá</th><th className="border p-2">Thành tiền</th><th className="border p-2">Người vận hành</th></tr></thead>
                  <tbody>
                    {toolReports.length === 0 ? (<tr><td colSpan={11} className="border p-8 text-center text-slate-500">Không có dữ liệu dao cụ</td></tr>) : (
                      toolReports.map((tool, index) => (
                        <tr key={index}><td className="border p-2">{formatDate(tool.ngay)}</td><td className="border p-2">{tool.may || '---'}</td><td className="border p-2">{tool.maDuAn || '---'}</td><td className="border p-2 font-medium">{tool.tenDao || '---'}</td><td className="border p-2 text-center">{tool.slCap || 0}</td><td className="border p-2 text-center">{tool.slSuDung || 0}</td><td className="border p-2 text-center text-red-600 font-bold">{tool.hong || 0}</td><td className="border p-2">{tool.donVi || '---'}</td><td className="border p-2 text-right">{formatCurrency(tool.donGia)}</td><td className="border p-2 text-right text-blue-600 font-semibold">{formatCurrency(tool.thanhTien)}</td><td className="border p-2">{tool.nguoiVanHanh || '---'}</td></tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: TOOL DAMAGE */}
          <TabsContent value="damage">
            <Card>
              <CardHeader><CardTitle>Hao hụt dao cụ</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-slate-100"><tr><th className="border p-2">Ngày</th><th className="border p-2">Máy</th><th className="border p-2">Dự án</th><th className="border p-2">Dao cụ</th><th className="border p-2">SL hỏng</th><th className="border p-2">Đơn giá</th><th className="border p-2">Thiệt hại</th><th className="border p-2">Người vận hành</th></tr></thead>
                  <tbody>
                    {toolDamageReports.length === 0 ? (<tr><td colSpan={8} className="border p-8 text-center text-slate-500">Không có dữ liệu hao hụt dao cụ</td></tr>) : (
                      toolDamageReports.map((tool, index) => (
                        <tr key={index}><td className="border p-2">{formatDate(tool.ngay)}</td><td className="border p-2">{tool.may || '---'}</td><td className="border p-2">{tool.maDuAn || '---'}</td><td className="border p-2">{tool.tenDao || '---'}</td><td className="border p-2 text-center text-red-600 font-bold">{tool.hong || 0}</td><td className="border p-2 text-right">{formatCurrency(tool.donGia)}</td><td className="border p-2 text-right text-red-600 font-bold">{formatCurrency(tool.thietHai)}</td><td className="border p-2">{tool.nguoiVanHanh || '---'}</td></tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: COST BREAKDOWN */}
          <TabsContent value="cost">
            <Card>
              <CardHeader><CardTitle>Chi phí gia công</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-slate-100"><tr><th className="border p-2">Ngày</th><th className="border p-2">Máy</th><th className="border p-2">Ca</th><th className="border p-2">Dự án</th><th className="border p-2">Chi phí chạy</th><th className="border p-2">Chi phí gá</th><th className="border p-2">Chi phí dao</th><th className="border p-2">Hao hụt dao</th><th className="border p-2">Tổng chi phí</th></tr></thead>
                  <tbody>
                    {filteredReports.length === 0 ? (<tr><td colSpan={9} className="border p-8 text-center text-slate-500">Không có dữ liệu chi phí</td></tr>) : (
                      filteredReports.map((item) => {
                        const toolCost = (item.toolEntries || []).reduce((sum, tool) => sum + (tool.thanhTien || 0), 0);
                        const damageCost = (item.toolEntries || []).reduce((sum, tool) => sum + (tool.hong || 0) * (tool.donGia || 0), 0);
                        return (
                          <tr key={item.id}>
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
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}