// src/modules/reports/machining/ProductionSummary.tsx
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useProductionReports } from '@/hooks/useProductionReports';
import { ReportTable, Column } from '@/components/ReportTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
  };

  // Hàm tính giờ từ start và end
  const calcHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    try {
      const s = new Date(`2000-01-01T${start}`);
      let e = new Date(`2000-01-01T${end}`);
      if (e < s) e.setDate(e.getDate() + 1);
      return Math.max(0, (e.getTime() - s.getTime()) / (1000 * 60 * 60));
    } catch { return 0; }
  };

  // Format time
  const fmtTime = (val: any) => {
    if (!val) return '';
    if (typeof val === 'number') {
      const totalMin = val * 24 * 60;
      let h = Math.floor(totalMin / 60) % 24;
      let m = Math.round(totalMin % 60);
      if (m === 60) { m = 0; h++; }
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    const str = String(val).trim();
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(str)) return str;
    const match = str.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      let h = Math.min(23, parseInt(match[1]));
      let m = Math.min(59, parseInt(match[2]));
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return '';
  };

  // Lấy tổng giờ gá
  const getSetupHours = (report: any) => {
    const numFields = ['gio_ga', 'gioGa', 'soGioGia', 'so_gio_ga'];
    for (const f of numFields) {
      if (report[f] && typeof report[f] === 'number') return report[f];
    }

    const start = fmtTime(report.tgGia_BatDau || report.tgGiaBatDau);
    const end = fmtTime(report.tgGia_KetThuc || report.tgGiaKetThuc);
    if (start && end) return calcHours(start, end);

    const entries = report.setup_time_entries || report.setupTimeEntries || [];
    if (Array.isArray(entries) && entries.length) {
      return entries.reduce((sum: number, e: any) => {
        let h = e.soGio || e.hours || 0;
        if (!h) {
          const s = fmtTime(e.thoiGianBatDau || e.start);
          const ed = fmtTime(e.thoiGianKetThuc || e.end);
          h = calcHours(s, ed);
        }
        return sum + (typeof h === 'number' ? h : parseFloat(h) || 0);
      }, 0);
    }
    return 0;
  };

  // Lấy tổng giờ chạy
  const getWorkHours = (report: any) => {
    const numFields = ['gio_chay', 'gioChay', 'soGioChay', 'so_gio_chay'];
    for (const f of numFields) {
      if (report[f] && typeof report[f] === 'number') return report[f];
    }

    const start = fmtTime(report.tgChay_BatDau || report.tgChayBatDau);
    const end = fmtTime(report.tgChay_KetThuc || report.tgChayKetThuc);
    if (start && end) return calcHours(start, end);

    const entries = report.work_time_entries || report.workTimeEntries || [];
    if (Array.isArray(entries) && entries.length) {
      return entries.reduce((sum: number, e: any) => {
        let h = e.soGio || e.hours || 0;
        if (!h) {
          const s = fmtTime(e.thoiGianBatDau || e.start);
          const ed = fmtTime(e.thoiGianKetThuc || e.end);
          h = calcHours(s, ed);
        }
        return sum + (typeof h === 'number' ? h : parseFloat(h) || 0);
      }, 0);
    }
    return 0;
  };

  // ========== XỬ LÝ DỮ LIỆU - GỘP THEO MÁY + DỰ ÁN + CA ==========
  const data: ProductionSummaryRow[] = useMemo(() => {
    // Group theo ngày + máy + dự án + ca
    const groups: Record<string, any> = {};
    
    reports.forEach((r) => {
      const report = r as any;
      const key = `${report.ngayThang}_${report.maySanXuat}_${report.duAn}_${report.ca}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: report.id,
          ngay: formatDate(report.ngayThang),
          may: report.maySanXuat || '---',
          ca: report.ca || '---',
          maDuAn: report.duAn || '---',
          tenDuAn: report.khach_hang || '---',
          soLuong: 0,
          gioGa: 0,
          gioChay: 0,
          nguoiVanHanh: [],
          raw: null,
          reports: [],
        };
      }
      
      // Cộng dồn
      groups[key].soLuong += (report.soLuongHoanThanh || 0);
      groups[key].gioGa += getSetupHours(report);
      groups[key].gioChay += getWorkHours(report);
      
      // Thêm người vận hành (nếu chưa có)
      if (report.nguoiVanHanh) {
        const nv = report.nguoiVanHanh.trim();
        if (nv && !groups[key].nguoiVanHanh.includes(nv)) {
          groups[key].nguoiVanHanh.push(nv);
        }
      }
      
      // Lưu report gốc để xem chi tiết
      groups[key].reports.push(report);
      groups[key].raw = report; // Lưu report cuối để hiển thị dialog
    });

    // Chuyển thành array và sắp xếp
    const result: ProductionSummaryRow[] = [];
    Object.values(groups).forEach((group) => {
      result.push({
        id: group.id,
        ngay: group.ngay,
        may: group.may,
        ca: group.ca,
        maDuAn: group.maDuAn,
        tenDuAn: group.tenDuAn,
        soLuong: group.soLuong,
        gioGa: group.gioGa,
        gioChay: group.gioChay,
        nguoiVanHanh: group.nguoiVanHanh.join(', ') || '---',
        raw: group.raw,
      });
    });

    // Sắp xếp: ngày mới nhất lên đầu, cùng ngày sắp xếp theo máy
    result.sort((a, b) => {
      const dateA = new Date(a.ngay.split('/').reverse().join('/'));
      const dateB = new Date(b.ngay.split('/').reverse().join('/'));
      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;
      return a.may.localeCompare(b.may);
    });

    console.log(`📊 Số dòng sau khi gộp: ${result.length}`);
    return result;
  }, [reports]);

  // Columns
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
      render: (row) => <span className="font-mono font-semibold text-blue-600">{row.gioGa.toFixed(1)}h</span>
    },
    { 
      key: 'gioChay', 
      header: 'Tổng giờ chạy', 
      align: 'center', 
      render: (row) => <span className="font-mono font-semibold text-green-600">{row.gioChay.toFixed(1)}h</span>
    },
    { key: 'nguoiVanHanh', header: 'NV vận hành' },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'center',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => { setSelected(row.raw); setDialogOpen(true); }}>
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  // Tổng hợp
  const totalSetup = data.reduce((s, row) => s + row.gioGa, 0);
  const totalWork = data.reduce((s, row) => s + row.gioChay, 0);

  const summary = (
    <div className="flex flex-wrap gap-4 px-3 py-2 bg-blue-50 rounded-lg text-sm">
      <div><span className="text-gray-600">Tổng số báo cáo:</span><span className="ml-2 font-bold text-blue-700">{data.length}</span></div>
      <div className="border-l border-gray-300 pl-4"><span className="text-gray-600">Tổng giờ gá:</span><span className="ml-2 font-bold text-blue-700">{totalSetup.toFixed(1)}h</span></div>
      <div className="border-l border-gray-300 pl-4"><span className="text-gray-600">Tổng giờ chạy:</span><span className="ml-2 font-bold text-green-700">{totalWork.toFixed(1)}h</span></div>
      <div className="border-l border-gray-300 pl-4"><span className="text-gray-600">Tổng cộng:</span><span className="ml-2 font-bold text-purple-700">{(totalSetup + totalWork).toFixed(1)}h</span></div>
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
                <div><span className="font-semibold">Tổng giờ gá:</span> {getSetupHours(selected).toFixed(1)}h</div>
                <div><span className="font-semibold">Tổng giờ chạy:</span> {getWorkHours(selected).toFixed(1)}h</div>
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