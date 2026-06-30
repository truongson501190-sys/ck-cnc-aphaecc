// src/modules/warehouse/pages/XuatKho.tsx
import React, { useState, useEffect } from 'react';
import { WarehouseExport } from '@/modules/warehouse/components/WarehouseExport';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Eye, Download, Truck, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ExportRecord {
  soPhieu: string;
  ngayXuat: string;
  duAn: string;
  khoXuat: string;
  nguoiXuat: string;
  nguoiNhan: string;
  ghiChu?: string;
  tongTien: number;
  status: 'pending' | 'approved' | 'received';
  items: Array<{
    tenChungLoai: string;
    soLuong: number;
    donVi: string;
    donGia: number;
    thanhTien: number;
  }>;
  createdAt: string;
}

export const XuatKho: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [exportsList, setExportsList] = useState<ExportRecord[]>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedExport, setSelectedExport] = useState<ExportRecord | null>(null);

  const loadExports = () => {
    try {
      const data = localStorage.getItem('warehouseExports');
      if (data) {
        const parsed = JSON.parse(data);
        // Đảm bảo mỗi phiếu có trường status
        const withStatus = parsed.map((exp: any) => ({
          ...exp,
          status: exp.status || 'pending'
        }));
        setExportsList(withStatus);
        localStorage.setItem('warehouseExports', JSON.stringify(withStatus));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadExports();
  }, []);

  const handleSuccess = () => {
    setOpen(false);
    loadExports();
    toast.success('Phiếu xuất đã được thêm');
  };

  const updateExportStatus = (soPhieu: string, newStatus: 'approved' | 'received') => {
    const updatedList = exportsList.map(exp => {
      if (exp.soPhieu === soPhieu) {
        return { ...exp, status: newStatus };
      }
      return exp;
    });
    setExportsList(updatedList);
    localStorage.setItem('warehouseExports', JSON.stringify(updatedList));
    toast.success(`Đã cập nhật trạng thái phiếu ${soPhieu}`);
  };

  const canApproveExport = (exp: ExportRecord) => {
    const currentUserName = user?.fullName || user?.name;
    return exp.status === 'pending' && (currentUserName === exp.nguoiXuat || user?.role === 'admin');
  };

  const canConfirmReceive = (exp: ExportRecord) => {
    const currentUserName = user?.fullName || user?.name;
    return exp.status === 'approved' && (currentUserName === exp.nguoiNhan || user?.role === 'admin');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Chờ xuất</span>;
      case 'approved':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Đã xuất</span>;
      case 'received':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Đã nhận</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100">Không xác định</span>;
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('phieu-xuat-content');
    if (!printContent || !selectedExport) return;
    const originalTitle = document.title;
    document.title = `PhieuXuat_${selectedExport.soPhieu}`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>${document.title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .text-right { text-align: right; }
          </style>
          </head>
          <body>${printContent.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
    document.title = originalTitle;
  };

  const PhieuXuatContent = ({ data }: { data: ExportRecord }) => (
    <div id="phieu-xuat-content">
      <h2 style={{ textAlign: 'center', marginBottom: 20 }}>PHIẾU XUẤT KHO</h2>
      <div style={{ marginBottom: 20 }}>
        <p><strong>Số phiếu:</strong> {data.soPhieu}</p>
        <p><strong>Ngày xuất:</strong> {data.ngayXuat}</p>
        <p><strong>Dự án:</strong> {data.duAn}</p>
        <p><strong>Kho xuất:</strong> {data.khoXuat}</p>
        <p><strong>Người xuất:</strong> {data.nguoiXuat}</p>
        <p><strong>Người nhận:</strong> {data.nguoiNhan}</p>
        <p><strong>Trạng thái:</strong> {data.status === 'pending' ? 'Chờ xuất' : data.status === 'approved' ? 'Đã xuất' : 'Đã nhận'}</p>
        <p><strong>Ghi chú:</strong> {data.ghiChu || '---'}</p>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>STT</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>Tên vật tư</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Số lượng</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>Đơn vị</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Đơn giá (₫)</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Thành tiền (₫)</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{idx+1}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{item.tenChungLoai}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{item.soLuong}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{item.donVi}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{item.donGia.toLocaleString('vi-VN')}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{item.thanhTien.toLocaleString('vi-VN')}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 'bold', backgroundColor: '#f9fafb' }}>
            <td colSpan={5} style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>Tổng cộng:</td>
            <td style={{ border: '1px solid #ddd', padding: 8, textAlign: 'right' }}>{data.tongTien.toLocaleString('vi-VN')} ₫</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Xuất Kho</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" /> Thêm phiếu xuất
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Tạo phiếu xuất kho mới</DialogTitle>
            </DialogHeader>
            <WarehouseExport onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số phiếu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày xuất</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kho</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người xuất</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người nhận</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exportsList.map((exp, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exp.soPhieu}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.ngayXuat}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.khoXuat}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.nguoiXuat}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.nguoiNhan}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">{getStatusBadge(exp.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center space-x-2">
                    {canApproveExport(exp) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        onClick={() => updateExportStatus(exp.soPhieu, 'approved')}
                      >
                        <Truck className="w-4 h-4 mr-1" /> Xác nhận xuất
                      </Button>
                    )}
                    {canConfirmReceive(exp) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => updateExportStatus(exp.soPhieu, 'received')}
                      >
                        <UserCheck className="w-4 h-4 mr-1" /> Đã nhận
                      </Button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedExport(exp); setViewOpen(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {exportsList.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                    Chưa có phiếu xuất nào. Nhấn "Thêm phiếu xuất" để tạo mới.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Chi tiết phiếu xuất</DialogTitle></DialogHeader>
          {selectedExport && <PhieuXuatContent data={selectedExport} />}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setViewOpen(false)}>Đóng</Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" /> In / Lưu PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default XuatKho;