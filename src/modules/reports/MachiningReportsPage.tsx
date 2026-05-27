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

  tienGa: number;

  tienChay: number;

  tongTien: number;

  toolEntries: ToolEntry[];

  status: 'pending' | 'approved' | 'rejected';
}

const STORAGE_KEY = 'PRODUCTION_LOGS_DATA';

export function MachiningReportsPage() {
  const [reports, setReports] = useState<ProductionLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReports();

    const reload = () => {
      loadReports();
    };

    window.addEventListener('storage', reload);
    window.addEventListener('app-data-synced', reload);

    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener('app-data-synced', reload);
    };
  }, []);

  const loadReports = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        setReports([]);
        return;
      }

      const parsed: ProductionLog[] = JSON.parse(raw);

      // CHỈ LẤY ĐÃ DUYỆT
      const approved = parsed.filter(
        (item) => item.status === 'approved'
      );

      setReports(approved);
    } catch (error) {
      console.error(error);
      setReports([]);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      const keyword = searchTerm.toLowerCase();

      return (
        item.maDuAn.toLowerCase().includes(keyword) ||
        item.tenDuAn.toLowerCase().includes(keyword) ||
        item.may.toLowerCase().includes(keyword) ||
        item.nguoiVanHanh.toLowerCase().includes(keyword)
      );
    });
  }, [reports, searchTerm]);

  // ======================
  // TOOL REPORTS
  // ======================

  const toolReports = useMemo(() => {
    return filteredReports.flatMap((report) =>
      report.toolEntries.map((tool) => ({
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

  // ======================
  // TOOL DAMAGE REPORTS
  // ======================

  const toolDamageReports = useMemo(() => {
    return toolReports
      .filter((item) => item.hong > 0)
      .map((item) => ({
        ...item,
        thietHai: item.hong * item.donGia,
      }));
  }, [toolReports]);

  // ======================
  // TOTALS
  // ======================

  const totalProduction = filteredReports.reduce(
    (sum, item) => sum + item.sanLuong,
    0
  );

  const totalRunCost = filteredReports.reduce(
    (sum, item) => sum + item.tienChay,
    0
  );

  const totalSetupCost = filteredReports.reduce(
    (sum, item) => sum + item.tienGa,
    0
  );

  const totalToolCost = toolReports.reduce(
    (sum, item) => sum + item.thanhTien,
    0
  );

  const totalDamageCost = toolDamageReports.reduce(
    (sum, item) => sum + item.thietHai,
    0
  );

  const totalCost =
    totalRunCost +
    totalSetupCost +
    totalToolCost +
    totalDamageCost;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* HEADER */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">

            <Link to="/">
              <Button
                variant="outline"
                className="h-11 w-11 p-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>

            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Báo cáo gia công
              </h1>

              <p className="text-sm text-slate-600 mt-2">
                Tổng hợp dữ liệu sản xuất sau phê duyệt.
              </p>
            </div>
          </div>

          <Badge className="h-10 px-4 text-sm">
            {filteredReports.length} báo cáo
          </Badge>
        </div>

        {/* KPI */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">

          <Card>
            <CardContent className="p-5">
              <div className="text-sm text-slate-500">
                Tổng sản lượng
              </div>

              <div className="text-2xl font-bold mt-2">
                {totalProduction}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="text-sm text-slate-500">
                Tiền chạy máy
              </div>

              <div className="text-2xl font-bold mt-2 text-blue-600">
                {formatCurrency(totalRunCost)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="text-sm text-slate-500">
                Tiền gá
              </div>

              <div className="text-2xl font-bold mt-2 text-amber-600">
                {formatCurrency(totalSetupCost)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="text-sm text-slate-500">
                Chi phí dao cụ
              </div>

              <div className="text-2xl font-bold mt-2 text-emerald-600">
                {formatCurrency(totalToolCost)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="text-sm text-slate-500">
                Tổng chi phí
              </div>

              <div className="text-2xl font-bold mt-2 text-red-600">
                {formatCurrency(totalCost)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEARCH */}

        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />

              <Input
                className="pl-10"
                placeholder="Tìm máy, dự án, người vận hành..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* TABS */}

        <Tabs defaultValue="production">

          <TabsList className="grid w-full grid-cols-4">

            <TabsTrigger value="production">
              <BarChart3 className="w-4 h-4 mr-2" />
              Tổng hợp sản xuất
            </TabsTrigger>

            <TabsTrigger value="tools">
              <Drill className="w-4 h-4 mr-2" />
              Dao cụ sử dụng
            </TabsTrigger>

            <TabsTrigger value="damage">
              <FileWarning className="w-4 h-4 mr-2" />
              Hao hụt dao cụ
            </TabsTrigger>

            <TabsTrigger value="cost">
              <DollarSign className="w-4 h-4 mr-2" />
              Chi phí gia công
            </TabsTrigger>

          </TabsList>

          {/* ========================= */}
          {/* TỔNG HỢP */}
          {/* ========================= */}

          <TabsContent value="production">

            <Card>
              <CardHeader>
                <CardTitle>
                  Tổng hợp sản xuất
                </CardTitle>
              </CardHeader>

              <CardContent className="overflow-x-auto">

                <table className="w-full text-sm border">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border p-2">Ngày</th>
                      <th className="border p-2">Máy</th>
                      <th className="border p-2">Dự án</th>
                      <th className="border p-2">Bản vẽ</th>
                      <th className="border p-2">Tên chi tiết</th>
                      <th className="border p-2">Nội dung</th>
                      <th className="border p-2">SL</th>
                      <th className="border p-2">Giờ gá</th>
                      <th className="border p-2">Giờ chạy</th>
                      <th className="border p-2">Người vận hành</th>
                      <th className="border p-2">Tiền gá</th>
                      <th className="border p-2">Tiền chạy</th>
                      <th className="border p-2">Tổng</th>
                    </tr>
                  </thead>

                  <tbody>

                    {filteredReports.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="border p-2">
                          {item.ngay}
                        </td>

                        <td className="border p-2">
                          {item.may}
                        </td>

                        <td className="border p-2">
                          <div className="font-semibold">
                            {item.maDuAn}
                          </div>

                          <div className="text-xs text-slate-500">
                            {item.tenDuAn}
                          </div>
                        </td>

                        <td className="border p-2">
                          {item.banVeSo}
                        </td>

                        <td className="border p-2">
                          {item.tenChiTiet}
                        </td>

                        <td className="border p-2 max-w-[250px]">
                          {item.noiDung}
                        </td>

                        <td className="border p-2 text-center">
                          {item.sanLuong}
                        </td>

                        <td className="border p-2 text-center">
                          {item.gioGa}
                        </td>

                        <td className="border p-2 text-center">
                          {item.gioChay}
                        </td>

                        <td className="border p-2">
                          {item.nguoiVanHanh}
                        </td>

                        <td className="border p-2 text-right text-amber-600 font-medium">
                          {formatCurrency(item.tienGa)}
                        </td>

                        <td className="border p-2 text-right text-blue-600 font-medium">
                          {formatCurrency(item.tienChay)}
                        </td>

                        <td className="border p-2 text-right text-red-600 font-bold">
                          {formatCurrency(item.tongTien)}
                        </td>
                      </tr>
                    ))}

                  </tbody>
                </table>

              </CardContent>
            </Card>

          </TabsContent>

          {/* ========================= */}
          {/* DAO CỤ */}
          {/* ========================= */}

          <TabsContent value="tools">

            <Card>
              <CardHeader>
                <CardTitle>
                  Dao cụ sử dụng
                </CardTitle>
              </CardHeader>

              <CardContent className="overflow-x-auto">

                <table className="w-full text-sm border">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border p-2">Ngày</th>
                      <th className="border p-2">Máy</th>
                      <th className="border p-2">Dự án</th>
                      <th className="border p-2">Dao cụ</th>
                      <th className="border p-2">SL cấp</th>
                      <th className="border p-2">SL sử dụng</th>
                      <th className="border p-2">Hỏng</th>
                      <th className="border p-2">ĐVT</th>
                      <th className="border p-2">Đơn giá</th>
                      <th className="border p-2">Thành tiền</th>
                      <th className="border p-2">Người vận hành</th>
                    </tr>
                  </thead>

                  <tbody>

                    {toolReports.map((tool, index) => (
                      <tr key={index}>
                        <td className="border p-2">{tool.ngay}</td>

                        <td className="border p-2">{tool.may}</td>

                        <td className="border p-2">{tool.maDuAn}</td>

                        <td className="border p-2 font-medium">
                          {tool.tenDao}
                        </td>

                        <td className="border p-2 text-center">
                          {tool.slCap}
                        </td>

                        <td className="border p-2 text-center">
                          {tool.slSuDung}
                        </td>

                        <td className="border p-2 text-center text-red-600 font-bold">
                          {tool.hong}
                        </td>

                        <td className="border p-2">
                          {tool.donVi}
                        </td>

                        <td className="border p-2 text-right">
                          {formatCurrency(tool.donGia)}
                        </td>

                        <td className="border p-2 text-right text-blue-600 font-semibold">
                          {formatCurrency(tool.thanhTien)}
                        </td>

                        <td className="border p-2">
                          {tool.nguoiVanHanh}
                        </td>
                      </tr>
                    ))}

                  </tbody>
                </table>

              </CardContent>
            </Card>

          </TabsContent>

          {/* ========================= */}
          {/* HAO HỤT */}
          {/* ========================= */}

          <TabsContent value="damage">

            <Card>
              <CardHeader>
                <CardTitle>
                  Hao hụt dao cụ
                </CardTitle>
              </CardHeader>

              <CardContent className="overflow-x-auto">

                <table className="w-full text-sm border">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border p-2">Ngày</th>
                      <th className="border p-2">Máy</th>
                      <th className="border p-2">Dự án</th>
                      <th className="border p-2">Dao cụ</th>
                      <th className="border p-2">SL hỏng</th>
                      <th className="border p-2">Đơn giá</th>
                      <th className="border p-2">Thiệt hại</th>
                      <th className="border p-2">Người vận hành</th>
                    </tr>
                  </thead>

                  <tbody>

                    {toolDamageReports.map((tool, index) => (
                      <tr key={index}>
                        <td className="border p-2">{tool.ngay}</td>

                        <td className="border p-2">{tool.may}</td>

                        <td className="border p-2">{tool.maDuAn}</td>

                        <td className="border p-2">
                          {tool.tenDao}
                        </td>

                        <td className="border p-2 text-center text-red-600 font-bold">
                          {tool.hong}
                        </td>

                        <td className="border p-2 text-right">
                          {formatCurrency(tool.donGia)}
                        </td>

                        <td className="border p-2 text-right text-red-600 font-bold">
                          {formatCurrency(tool.thietHai)}
                        </td>

                        <td className="border p-2">
                          {tool.nguoiVanHanh}
                        </td>
                      </tr>
                    ))}

                  </tbody>
                </table>

              </CardContent>
            </Card>

          </TabsContent>

          {/* ========================= */}
          {/* CHI PHÍ */}
          {/* ========================= */}

          <TabsContent value="cost">

            <Card>
              <CardHeader>
                <CardTitle>
                  Chi phí gia công
                </CardTitle>
              </CardHeader>

              <CardContent className="overflow-x-auto">

                <table className="w-full text-sm border">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="border p-2">Ngày</th>
                      <th className="border p-2">Máy</th>
                      <th className="border p-2">Dự án</th>
                      <th className="border p-2">Chi phí chạy</th>
                      <th className="border p-2">Chi phí gá</th>
                      <th className="border p-2">Chi phí dao</th>
                      <th className="border p-2">Hao hụt dao</th>
                      <th className="border p-2">Tổng chi phí</th>
                    </tr>
                  </thead>

                  <tbody>

                    {filteredReports.map((item) => {

                      const toolCost =
                        item.toolEntries.reduce(
                          (sum, tool) =>
                            sum + tool.thanhTien,
                          0
                        );

                      const damageCost =
                        item.toolEntries.reduce(
                          (sum, tool) =>
                            sum +
                            tool.hong *
                              tool.donGia,
                          0
                        );

                      const total =
                        item.tienChay +
                        item.tienGa +
                        toolCost +
                        damageCost;

                      return (
                        <tr key={item.id}>
                          <td className="border p-2">
                            {item.ngay}
                          </td>

                          <td className="border p-2">
                            {item.may}
                          </td>

                          <td className="border p-2">
                            {item.maDuAn}
                          </td>

                          <td className="border p-2 text-right text-blue-600">
                            {formatCurrency(item.tienChay)}
                          </td>

                          <td className="border p-2 text-right text-amber-600">
                            {formatCurrency(item.tienGa)}
                          </td>

                          <td className="border p-2 text-right text-emerald-600">
                            {formatCurrency(toolCost)}
                          </td>

                          <td className="border p-2 text-right text-red-600">
                            {formatCurrency(damageCost)}
                          </td>

                          <td className="border p-2 text-right text-red-700 font-bold">
                            {formatCurrency(total)}
                          </td>
                        </tr>
                      );
                    })}

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