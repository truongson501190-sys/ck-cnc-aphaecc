// src/modules/reports/machining/ProductionSummary.tsx
import { useMemo, useEffect } from 'react';
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

  useEffect(() => {
    if (reports.length > 0) {
      console.log('=== DỮ LIỆU TỪ API ===');
      console.log('Report đầu tiên:', reports[0]);
    }
  }, [reports]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  // Hàm tính TỔNG giờ gá
  const getTotalSetupHours = (report: any) => {
    if (report.setup_time_entries && Array.isArray(report.setup_time_entries)) {
      const total = report.setup_time_entries.reduce((sum: number, entry: any) => {
        return sum + (entry.soGio || 0);
      }, 0);
      console.log(`✅ Tổng giờ gá: ${total}h`);
      return total;
    }
    return 0;
  };

  // Hàm tính TỔNG giờ chạy
  const getTotalWorkHours = (report: any) => {
    if (report.work_time_entries && Array.isArray(report.work_time_entries)) {
      const total = report.work_time_entries.reduce((sum: number, entry: any) => {
        return sum + (entry.soGio || 0);
      }, 0);
      console.log(`✅ Tổng giờ chạy: ${total}h`);
      return total;
    }
    return 0;
  };

  const data: ProductionSummaryRow[] = useMemo(() => {
    console.log('=== XỬ LÝ DỮ LIỆU ===');
    return reports.map((r, index) => {
      const report = r as any;
      const setupHours = getTotalSetupHours(report);
      const workHours = getTotalWorkHours(report);
      
      console.log(`Report ${index + 1}:`, {
        id: report.id,
        'Tổng giờ gá': setupHours,
        'Tổng giờ chạy': workHours,
        'Tổng cộng': setupHours + workHours
      });
      
      return {
        id: report.id,
        ngay: formatDate(report.ngayThang || ''),
        may: report.maySanXuat || '---',
        ca: report.ca || '---',
        maDuAn: report.duAn || '---',
        tenDuAn: report.khach_hang || '---',
        soLuong: report.soLuongHoanThanh || 0,
        gioGa: setupHours,
        gioChay: workHours,
        nguoiVanHanh: report.nguoiVanHanh || '---',
        raw: report,
      };
    });
  }, [reports]);

  const columns: Column<ProductionSummaryRow>[] = [
    { key: 'ngay', header: 'Ngày' },
    { key: 'may', header: 'Máy' },
    { key: 'ca', header: 'Ca', align: 'center' },
    { key: 'maDuAn', header: 'Mã dự án', className: 'font-semibold' },
    { key: 'tenDuAn', header: 'Tên dự án' },
    { key: 'soLuong', header: 'SL', align: 'center' },
    { 
      key: 'gioGa', 
      header: 'Tổng giờ gá', 
      align: 'center', 
      render: (row) => (
        <span className="font-mono font-semibold text-blue-600">
          {row.gioGa.toFixed(1)}h
        </span>
      )
    },
    { 
      key: 'gioChay', 
      header: 'Tổng giờ chạy', 
      align: 'center', 
      render: (row) => (
        <span className="font-mono font-semibold text-green-600">
          {row.gioChay.toFixed(1)}h
        </span>
      )
    },
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

  // Tính tổng số giờ của tất cả reports
  const totalSetup = data.reduce((sum, row) => sum + row.gioGa, 0);
  const totalWork = data.reduce((sum, row) => sum + row.gioChay, 0);

  const summary = (
    <div className="flex flex-wrap gap-4 px-3 py-2 bg-blue-50 rounded-lg text-sm">
      <div>
        <span className="text-gray-600">Tổng số báo cáo:</span>
        <span className="ml-2 font-bold text-blue-700">{data.length}</span>
      </div>
      <div className="border-l border-gray-300 pl-4">
        <span className="text-gray-600">Tổng giờ gá:</span>
        <span className="ml-2 font-bold text-blue-700">{totalSetup.toFixed(1)}h</span>
      </div>
      <div className="border-l border-gray-300 pl-4">
        <span className="text-gray-600">Tổng giờ chạy:</span>
        <span className="ml-2 font-bold text-green-700">{totalWork.toFixed(1)}h</span>
      </div>
      <div className="border-l border-gray-300 pl-4">
        <span className="text-gray-600">Tổng cộng:</span>
        <span className="ml-2 font-bold text-purple-700">{(totalSetup + totalWork).toFixed(1)}h</span>
      </div>
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
                <div><span className="font-semibold">Tổng giờ gá:</span> {getTotalSetupHours(selected).toFixed(1)}h</div>
                <div><span className="font-semibold">Tổng giờ chạy:</span> {getTotalWorkHours(selected).toFixed(1)}h</div>
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