// src/modules/reports/machining/ProductionSummary.tsx
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useProductionReports } from '@/hooks/useProductionReports';
import { ReportTable, Column } from '@/components/ReportTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';

interface ProductionSummaryRow {
  id: string;
  ngay: string;
  may: string;
  ca: string;
  maDuAn: string;
  tenDuAn: string;
  soLuong: number;
  gioGa: number;
  gioChay: number;
  nguoiVanHanh: string;
  raw: any;
}

export function ProductionSummary() {
  const { reports, isLoading } = useProductionReports();
  const [selected, setSelected] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const data: ProductionSummaryRow[] = useMemo(() => {
    return reports.map((r) => ({
      id: r.id,
      ngay: formatDate(r.ngayThang),
      may: r.maySanXuat || '---',
      ca: r.ca || '---',
      maDuAn: r.duAn || '---',
      tenDuAn: r.khach_hang || '---',
      soLuong: r.soLuongHoanThanh || 0,
      gioGa: r.setup_time_entries?.[0]?.hours || 0,
      gioChay: r.work_time_entries?.[0]?.hours || 0,
      nguoiVanHanh: r.nguoiVanHanh || '---',
      raw: r,
    }));
  }, [reports]);

  const columns: Column<ProductionSummaryRow>[] = [
    { key: 'ngay', header: 'Ngày' },
    { key: 'may', header: 'Máy' },
    { key: 'ca', header: 'Ca', align: 'center' },
    { key: 'maDuAn', header: 'Mã dự án', className: 'font-semibold' },
    { key: 'tenDuAn', header: 'Tên dự án' },
    { key: 'soLuong', header: 'SL', align: 'center' },
    { key: 'gioGa', header: 'Giờ gá', align: 'center', render: (row) => `${row.gioGa}h` },
    { key: 'gioChay', header: 'Giờ chạy', align: 'center', render: (row) => `${row.gioChay}h` },
    { key: 'nguoiVanHanh', header: 'NV vận hành' },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'center',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelected(row.raw);
            setDialogOpen(true);
          }}
        >
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const summary = (
    <div className="px-3 py-1 bg-blue-50 rounded-lg text-sm">
      <span className="text-gray-600">Tổng số:</span>
      <span className="ml-2 font-bold text-blue-700">{data.length}</span>
    </div>
  );

  return (
    <div className="p-6">
      <ReportTable
        data={data}
        columns={columns}
        isLoading={isLoading}
        title="📋 TỔNG HỢP SẢN XUẤT"
        description="Tổng hợp các báo cáo sản xuất đã được duyệt"
        searchPlaceholder="Tìm kiếm..."
        searchFields={['maDuAn', 'tenDuAn', 'may', 'nguoiVanHanh']}
        exportFileName="tong_hop_san_xuat"
        exportSheetName="TongHopSanXuat"
        summary={summary}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Chi tiết báo cáo sản xuất</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="font-semibold">Ngày:</span> {formatDate(selected.ngayThang)}</div>
                <div><span className="font-semibold">Máy:</span> {selected.maySanXuat}</div>
                <div><span className="font-semibold">Ca:</span> {selected.ca}</div>
                <div><span className="font-semibold">Mã dự án:</span> {selected.duAn}</div>
                <div><span className="font-semibold">Tên dự án:</span> {selected.khach_hang}</div>
                <div><span className="font-semibold">Số lượng:</span> {selected.soLuongHoanThanh}</div>
                <div><span className="font-semibold">Giờ gá:</span> {selected.setup_time_entries?.[0]?.hours || 0}h</div>
                <div><span className="font-semibold">Giờ chạy:</span> {selected.work_time_entries?.[0]?.hours || 0}h</div>
                <div><span className="font-semibold">Người vận hành:</span> {selected.nguoiVanHanh}</div>
              </div>
              <div className="border-t pt-3">
                <div><span className="font-semibold">Trạng thái:</span> <Badge className="bg-green-600">Đã duyệt</Badge></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}