// src/modules/warehouse/pages/NhapKho.tsx
import React, { useState, useEffect } from 'react';
import { WarehouseImport } from '@/modules/warehouse/components/WarehouseImport';
import { toast } from 'sonner';
import { postStockDocument } from '@/api/stock';
import type { WarehouseTransaction } from '@/types/inventory';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Eye, Download } from 'lucide-react';

interface ImportRecord {
  soPhieu: string;
  ngayNhap: string;
  khoNhap: string;
  nguoiNhap: string;
  nhaCungCap?: string;
  ghiChu?: string;
  tongTien: number;
  items: Array<{
    tenChungLoai: string;
    soLuong: number;
    donVi: string;
    donGia: number;
    thanhTien: number;
  }>;
  createdAt: string;
}

export const NhapKho: React.FC = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedImport, setSelectedImport] = useState<ImportRecord | null>(null);

  const loadImports = () => {
    try {
      const data = localStorage.getItem('warehouseImports');
      if (data) setImports(JSON.parse(data));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadImports();
  }, []);

  const handleSubmitAPI = async (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => {
    const { ok } = await postStockDocument({
      ...transaction,
      status: 'approved',
    } as WarehouseTransaction);
    if (!ok) throw new Error('API error');
    await queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  const handleSuccess = () => {
    setOpen(false);
    loadImports();
    toast.success('Phiếu nhập đã được thêm');
  };

  // In / Lưu PDF (dùng window.print)
  const handlePrint = () => {
    const printContent = document.getElementById('phieu-nhap-content');
    if (!printContent || !selectedImport) return;
    const originalTitle = document.title;
    document.title = `PhieuNhap_${selectedImport.soPhieu}`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${document.title}</title>
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

  // Component nội dung phiếu (dùng để in & hiển thị)
  const PhieuNhapContent = ({ data }: { data: ImportRecord }) => (
    <div id="phieu-nhap-content">
      <h2 style={{ textAlign: 'center', marginBottom: 20 }}>PHIẾU NHẬP KHO</h2>
      <div style={{ marginBottom: 20 }}>
        <p><strong>Số phiếu:</strong> {data.soPhieu}</p>
        <p><strong>Ngày nhập:</strong> {data.ngayNhap}</p>
        <p><strong>Kho nhập:</strong> {data.khoNhap}</p>
        <p><strong>Người nhập:</strong> {data.nguoiNhap}</p>
        <p><strong>Nhà cung cấp:</strong> {data.nhaCungCap || '---'}</p>
        <p><strong>Ghi chú:</strong> {data.ghiChu || '---'}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên vật tư</th>
            <th className="text-right">Số lượng</th>
            <th>Đơn vị</th>
            <th className="text-right">Đơn giá (₫)</th>
            <th className="text-right">Thành tiền (₫)</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx}>
              <td>{idx + 1}</td>
              <td>{item.tenChungLoai}</td>
              <td className="text-right">{item.soLuong}</td>
              <td>{item.donVi}</td>
              <td className="text-right">{item.donGia.toLocaleString('vi-VN')}</td>
              <td className="text-right">{item.thanhTien.toLocaleString('vi-VN')}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 'bold', backgroundColor: '#f9fafb' }}>
            <td colSpan={5} style={{ textAlign: 'right' }}>Tổng cộng:</td>
            <td className="text-right">{data.tongTien.toLocaleString('vi-VN')} ₫</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Nhập Kho</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" /> Thêm phiếu nhập
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Tạo phiếu nhập kho mới</DialogTitle>
            </DialogHeader>
            <WarehouseImport onSubmit={handleSubmitAPI} onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Bảng danh sách phiếu nhập */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số phiếu</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày nhập</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kho</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người nhập</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {imports.map((imp, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{imp.soPhieu}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{imp.ngayNhap}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{imp.khoNhap}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{imp.nguoiNhap}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                  {imp.tongTien.toLocaleString('vi-VN')} ₫
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedImport(imp);
                      setViewOpen(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {imports.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                  Chưa có phiếu nhập nào. Nhấn "Thêm phiếu nhập" để tạo mới.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal xem chi tiết phiếu */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết phiếu nhập</DialogTitle>
          </DialogHeader>
          {selectedImport && <PhieuNhapContent data={selectedImport} />}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Đóng
            </Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2" /> In / Lưu PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NhapKho;