// src/modules/reports/machining/CostBreakdown.tsx
import { useMemo } from 'react';
import { useProductionReports } from '@/hooks/useProductionReports';
import { ReportTable, Column } from '@/components/ReportTable';

interface CostRow {
  id: string;
  ngay: string;
  may: string;
  ca: string;
  caMay: string;        // Thêm: Ca máy (ví dụ: 8h/1Ca)
  donGia: number;       // Thêm: Đơn giá máy
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

  // Hàm tính tổng giờ gá
  const getTotalSetupHours = (report: any) => {
    if (report.setup_time_entries && Array.isArray(report.setup_time_entries)) {
      return report.setup_time_entries.reduce((sum: number, entry: any) => {
        return sum + (entry.soGio || 0);
      }, 0);
    }
    return 0;
  };

  // Hàm tính tổng giờ chạy
  const getTotalWorkHours = (report: any) => {
    if (report.work_time_entries && Array.isArray(report.work_time_entries)) {
      return report.work_time_entries.reduce((sum: number, entry: any) => {
        return sum + (entry.soGio || 0);
      }, 0);
    }
    return 0;
  };

  // Hàm xác định loại ca máy dựa trên tổng giờ làm việc
  const getMachineShift = (report: any) => {
    const totalHours = getTotalWorkHours(report) + getTotalSetupHours(report);
    
    // Xác định ca dựa trên tổng giờ
    if (totalHours <= 8) return '8h/1Ca';
    if (totalHours <= 10) return '10h/1Ca';
    if (totalHours <= 12) return '12h/1Ca';
    if (totalHours <= 16) return '8h/2Ca';
    if (totalHours <= 20) return '10h/2Ca';
    if (totalHours <= 24) return '12h/2Ca';
    return `${totalHours}h/${Math.ceil(totalHours / 8)}Ca`;
  };

  // Hàm tính đơn giá máy
  const getMachineRate = (report: any) => {
    const cpMay = report.cpMay || 0;
    const totalHours = getTotalWorkHours(report) + getTotalSetupHours(report);
    
    // Nếu có cpMay và tổng giờ > 0, tính đơn giá máy = cpMay / tổng giờ
    if (cpMay > 0 && totalHours > 0) {
      return cpMay / totalHours;
    }
    
    return 0;
  };

  // Hàm tính chi phí gá: CP gá = (Đơn giá máy / 2) × Tổng giờ gá
  const calculateSetupCost = (report: any) => {
    const setupHours = getTotalSetupHours(report);
    const machineRate = getMachineRate(report);
    
    // CP gá = (Đơn giá máy / 2) × Tổng giờ gá
    return (machineRate / 2) * setupHours;
  };

  const data: CostRow[] = useMemo(() => {
    return reports.map((r) => {
      const report = r as any;
      
      // Tính chi phí dao
      const chiPhiDao = (report.toolEntries || []).reduce((sum: number, t: any) => {
        return sum + (t.thanhTien || 0);
      }, 0);
      
      // Chi phí chạy máy (lấy từ cpMay)
      const chiPhiChayMay = report.cpMay || 0;
      
      // Tổng giờ
      const totalSetupHours = getTotalSetupHours(report);
      const totalWorkHours = getTotalWorkHours(report);
      const totalHours = totalSetupHours + totalWorkHours;
      
      // Đơn giá máy
      const donGia = getMachineRate(report);
      
      // Ca máy
      const caMay = getMachineShift(report);
      
      // Chi phí gá = (Đơn giá máy / 2) × Tổng giờ gá
      const chiPhiGa = calculateSetupCost(report);
      
      console.log(`Report ${report.id}:`, {
        'Tổng giờ': totalHours,
        'Ca máy': caMay,
        'Đơn giá máy': donGia,
        'Giờ gá': totalSetupHours,
        'Giờ chạy': totalWorkHours,
        'CP gá': chiPhiGa,
        'CP chạy máy': chiPhiChayMay,
        'CP dao': chiPhiDao,
        'Tổng CP': chiPhiChayMay + chiPhiGa + chiPhiDao
      });

      return {
        id: report.id,
        ngay: formatDate(report.ngayThang),
        may: report.maySanXuat || '---',
        ca: report.ca || 'Ngày',
        caMay: caMay,
        donGia: donGia,
        maDuAn: report.duAn || '---',
        chiPhiChayMay: chiPhiChayMay,
        chiPhiGa: chiPhiGa,
        chiPhiDao: chiPhiDao,
        tongChiPhi: chiPhiChayMay + chiPhiGa + chiPhiDao,
      };
    });
  }, [reports]);

  const columns: Column<CostRow>[] = [
    { key: 'ngay', header: 'Ngày' },
    { key: 'may', header: 'Máy' },
    { key: 'ca', header: 'Ca làm việc', align: 'center' },
    { 
      key: 'caMay', 
      header: 'Ca máy', 
      align: 'center',
      render: (row) => (
        <span className="font-mono font-semibold text-purple-600">
          {row.caMay}
        </span>
      )
    },
    { key: 'maDuAn', header: 'Dự án' },
    {
      key: 'donGia',
      header: 'Đơn giá máy',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-gray-600">
          {formatCurrency(row.donGia)}/h
        </span>
      )
    },
    {
      key: 'chiPhiChayMay',
      header: 'CP chạy máy',
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