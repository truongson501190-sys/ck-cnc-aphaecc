// src/modules/reports/machining/CostBreakdown.tsx
import { useMemo } from 'react';
import { useProductionReports } from '@/hooks/useProductionReports';
import { ReportTable, Column } from '@/components/ReportTable';
import { Card, CardContent } from '@/components/ui/card';

interface CostRow {
  id: string;
  ngay: string;
  may: string;
  ca: string;
  maDuAn: string;
  chiPhiChayMay: number;
  chiPhiGa: number;
  chiPhiDao: number;
  tongChiPhi: number;
}

export function CostBreakdown() {
  const { reports, isLoading } = useProductionReports();

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const formatCurrency = (value: number) => {
    if (!value) return '0 đ';
    return value.toLocaleString('vi-VN') + ' đ';
  };

  const data: CostRow[] = useMemo(() => {
    return reports.map((r) => {
      const chiPhiDao = (r.toolEntries || []).reduce((sum: number, t: any) => sum + (t.thanhTien || 0), 0);
      const cpMay = r.cpMay || 0;
      const cpGa = r.cpGa || 0;
      return {
        id: r.id,
        ngay: formatDate(r.ngayThang),
        may: r.maySanXuat || '---',
        ca: r.ca || 'Ngày',
        maDuAn: r.duAn || '---',
        chiPhiChayMay: cpMay,
        chiPhiGa: cpGa,
        chiPhiDao: chiPhiDao,
        tongChiPhi: cpMay + cpGa + chiPhiDao,
      };
    });
  }, [reports]);

  const columns: Column<CostRow>[] = [
    { key: 'ngay', header: 'Ngày' },
    { key: 'may', header: 'Máy' },
    { key: 'ca', header: 'Ca', align: 'center' },
    { key: 'maDuAn', header: 'Dự án' },
    {
      key: 'chiPhiChayMay',
      header: 'CP chạy',
      align: 'right',
      render: (row) => <span className="text-blue-600">{formatCurrency(row.chiPhiChayMay)}</span>,
    },
    {
      key: 'chiPhiGa',
      header: 'CP gá',
      align: 'right',
      render: (row) => <span className="text-amber-600">{formatCurrency(row.chiPhiGa)}</span>,
    },
    {
      key: 'chiPhiDao',
      header: 'CP dao',
      align: 'right',
      render: (row) => <span className="text-emerald-600">{formatCurrency(row.chiPhiDao)}</span>,
    },
    {
      key: 'tongChiPhi',
      header: 'Tổng CP',
      align: 'right',
      render: (row) => <span className="text-red-600 font-bold">{formatCurrency(row.tongChiPhi)}</span>,
    },
  ];

  const totalRunCost = data.reduce((sum, item) => sum + (item.chiPhiChayMay || 0), 0);
  const totalSetupCost = data.reduce((sum, item) => sum + (item.chiPhiGa || 0), 0);
  const totalToolCost = data.reduce((sum, item) => sum + (item.chiPhiDao || 0), 0);
  const totalCost = data.reduce((sum, item) => sum + (item.tongChiPhi || 0), 0);

  const summary = (
    <div className="flex gap-3 flex-wrap">
      <div className="px-3 py-1 bg-blue-50 rounded-lg text-sm">
        <span className="text-gray-600">CP chạy máy:</span>
        <span className="ml-1 font-bold text-blue-600">{formatCurrency(totalRunCost)}</span>
      </div>
      <div className="px-3 py-1 bg-amber-50 rounded-lg text-sm">
        <span className="text-gray-600">CP gá:</span>
        <span className="ml-1 font-bold text-amber-600">{formatCurrency(totalSetupCost)}</span>
      </div>
      <div className="px-3 py-1 bg-emerald-50 rounded-lg text-sm">
        <span className="text-gray-600">CP dao:</span>
        <span className="ml-1 font-bold text-emerald-600">{formatCurrency(totalToolCost)}</span>
      </div>
      <div className="px-3 py-1 bg-red-50 rounded-lg text-sm">
        <span className="text-gray-600">Tổng CP:</span>
        <span className="ml-1 font-bold text-red-600">{formatCurrency(totalCost)}</span>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <ReportTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        title="💰 CHI PHÍ GIA CÔNG"
        description="Phân tích chi tiết các khoản chi phí sản xuất"
        searchPlaceholder="Tìm kiếm..."
        searchFields={['maDuAn', 'may']}
        exportFileName="chi_phi_gia_cong"
        exportSheetName="ChiPhiGiaCong"
        summary={summary}
      />
    </div>
  );
}