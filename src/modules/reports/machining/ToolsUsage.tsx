// src/modules/reports/machining/ToolsUsage.tsx
import { useMemo } from 'react';
import { useProductionReports } from '@/hooks/useProductionReports';
import { ReportTable, Column } from '@/components/ReportTable';

interface ToolRow {
  ngay: string;
  may: string;
  maDuAn: string;
  tenDao: string;
  slCap: number;
  slSuDung: number;
  hong: number;
  donVi: string;
  donGia: number;
  thanhTien: number;
  nguoiVanHanh: string;
}

export function ToolsUsage() {
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

  const data: ToolRow[] = useMemo(() => {
    const result: ToolRow[] = [];
    reports.forEach((r) => {
      if (r.toolEntries && r.toolEntries.length > 0) {
        r.toolEntries.forEach((t: any) => {
          result.push({
            ngay: formatDate(r.ngayThang),
            may: r.maySanXuat || '---',
            maDuAn: r.duAn || '---',
            tenDao: t.tenDao || '---',
            slCap: t.slCap || 0,
            slSuDung: t.slSuDung || 0,
            hong: t.hong || 0,
            donVi: t.donVi || 'Cái',
            donGia: t.donGia || 0,
            thanhTien: t.thanhTien || 0,
            nguoiVanHanh: r.nguoiVanHanh || '---',
          });
        });
      }
    });
    return result;
  }, [reports]);

  const columns: Column<ToolRow>[] = [
    { key: 'ngay', header: 'Ngày' },
    { key: 'may', header: 'Máy' },
    { key: 'maDuAn', header: 'Dự án' },
    { key: 'tenDao', header: 'Tên dao', className: 'font-medium' },
    { key: 'slCap', header: 'SL cấp', align: 'center' },
    { key: 'slSuDung', header: 'SL dùng', align: 'center' },
    { key: 'hong', header: 'Hỏng', align: 'center', render: (row) => <span className="text-red-600">{row.hong}</span> },
    { key: 'donVi', header: 'ĐVT' },
    {
      key: 'donGia',
      header: 'Đơn giá',
      align: 'right',
      render: (row) => formatCurrency(row.donGia),
    },
    {
      key: 'thanhTien',
      header: 'Thành tiền',
      align: 'right',
      render: (row) => <span className="text-emerald-600 font-semibold">{formatCurrency(row.thanhTien)}</span>,
    },
  ];

  const totalCost = data.reduce((sum, item) => sum + (item.thanhTien || 0), 0);

  const summary = (
    <div className="px-3 py-1 bg-emerald-50 rounded-lg text-sm">
      <span className="text-gray-600">Tổng chi phí:</span>
      <span className="ml-2 font-bold text-emerald-600">{formatCurrency(totalCost)}</span>
    </div>
  );

  return (
    <div className="p-6">
      <ReportTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        title="🔧 DAO CỤ SỬ DỤNG"
        description="Chi tiết các loại dao cụ đã sử dụng trong sản xuất"
        searchPlaceholder="Tìm kiếm..."
        searchFields={['tenDao', 'maDuAn', 'may']}
        exportFileName="dao_cu_su_dung"
        exportSheetName="DaoCuSuDung"
        summary={summary}
      />
    </div>
  );
}