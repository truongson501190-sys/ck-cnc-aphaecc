// src/modules/reports/machining/ToolsDamage.tsx
import { useMemo } from 'react';
import { useProductionReports } from '@/hooks/useProductionReports';
import { ReportTable, Column } from '@/components/ReportTable';

interface DamageRow {
  ngay: string;
  may: string;
  maDuAn: string;
  tenDao: string;
  hong: number;
  donGia: number;
  thietHai: number;
  nguoiVanHanh: string;
}

export function ToolsDamage() {
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

  const data: DamageRow[] = useMemo(() => {
    const result: DamageRow[] = [];
    reports.forEach((r) => {
      if (r.toolEntries && r.toolEntries.length > 0) {
        r.toolEntries.forEach((t: any) => {
          const hong = t.hong || 0;
          if (hong > 0) {
            result.push({
              ngay: formatDate(r.ngayThang),
              may: r.maySanXuat || '---',
              maDuAn: r.duAn || '---',
              tenDao: t.tenDao || '---',
              hong: hong,
              donGia: t.donGia || 0,
              thietHai: hong * (t.donGia || 0),
              nguoiVanHanh: r.nguoiVanHanh || '---',
            });
          }
        });
      }
    });
    return result;
  }, [reports]);

  const columns: Column<DamageRow>[] = [
    { key: 'ngay', header: 'Ngày' },
    { key: 'may', header: 'Máy' },
    { key: 'maDuAn', header: 'Dự án' },
    { key: 'tenDao', header: 'Dao cụ', className: 'font-medium' },
    {
      key: 'hong',
      header: 'SL hỏng',
      align: 'center',
      render: (row) => <span className="text-red-600 font-bold">{row.hong}</span>,
    },
    {
      key: 'donGia',
      header: 'Đơn giá',
      align: 'right',
      render: (row) => formatCurrency(row.donGia),
    },
    {
      key: 'thietHai',
      header: 'Thiệt hại',
      align: 'right',
      render: (row) => <span className="text-red-600 font-bold">{formatCurrency(row.thietHai)}</span>,
    },
  ];

  const totalDamage = data.reduce((sum, item) => sum + (item.thietHai || 0), 0);

  const summary = (
    <div className="px-3 py-1 bg-red-50 rounded-lg text-sm">
      <span className="text-gray-600">Tổng thiệt hại:</span>
      <span className="ml-2 font-bold text-red-600">{formatCurrency(totalDamage)}</span>
    </div>
  );

  return (
    <div className="p-6">
      <ReportTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        title="⚠️ HAO HỤT DAO CỤ"
        description="Thống kê các dao cụ bị hỏng hóc trong quá trình sản xuất"
        searchPlaceholder="Tìm kiếm..."
        searchFields={['tenDao', 'maDuAn', 'may']}
        exportFileName="hao_hut_dao_cu"
        exportSheetName="HaoHutDaoCu"
        summary={summary}
      />
    </div>
  );
}