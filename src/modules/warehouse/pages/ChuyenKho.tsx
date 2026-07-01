// src/modules/warehouse/pages/ChuyenKho.tsx
import React, { useState, useEffect } from 'react';
import { WarehouseTransfer } from '@/modules/warehouse/components/WarehouseTransfer';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Eye, Download, Truck, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';

interface TransferRecord {
  soPhieu: string;
  ngayChuyen: string;
  duAn: string;
  khoXuat: string;
  khoNhap: string;
  nguoiThucHien: string;
  ghiChu?: string;
  status: 'pending' | 'transferred' | 'received';
  items: Array<{
    tenChungLoai: string;
    soLuong: number;
    donVi: string;
  }>;
  createdAt: string;
}

export const ChuyenKho: React.FC = () => {
  const { user } = useAuth();
  const { canEdit } = usePermission();
  const canAddOrEdit = canEdit('chuyen_kho');
  const [open, setOpen] = useState(false);
  const [transfersList, setTransfersList] = useState<TransferRecord[]>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRecord | null>(null);

  const loadTransfers = () => {
    try {
      const data = localStorage.getItem('warehouseTransfers');
      if (data) {
        const parsed = JSON.parse(data);
        const withStatus = parsed.map((t: any) => ({
          ...t,
          status: t.status || 'pending'
        }));
        setTransfersList(withStatus);
        localStorage.setItem('warehouseTransfers', JSON.stringify(withStatus));
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadTransfers();
  }, []);

  const handleSuccess = () => {
    setOpen(false);
    loadTransfers();
    toast.success('Phiếu chuyển kho đã được thêm');
  };

  const updateTransferStatus = (soPhieu: string, newStatus: 'transferred' | 'received') => {
    const updatedList = transfersList.map(t =>
      t.soPhieu === soPhieu ? { ...t, status: newStatus } : t
    );
    setTransfersList(updatedList);
    localStorage.setItem('warehouseTransfers', JSON.stringify(updatedList));
    toast.success(`Đã cập nhật trạng thái phiếu ${soPhieu}`);
  };

  const canConfirmTransfer = (t: TransferRecord) => {
    const currentUserName = user?.fullName || user?.name;
    return t.status === 'pending' && (currentUserName === t.nguoiThucHien || user?.role === 'admin');
  };

  const canConfirmReceive = (t: TransferRecord) => {
    return t.status === 'transferred' && user?.role === 'admin';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Chờ chuyển</span>;
      case 'transferred': return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Đã chuyển</span>;
      case 'received': return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Đã nhận</span>;
      default: return <span className="px-2 py-1 text-xs rounded-full bg-gray-100">Không xác định</span>;
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('phieu-chuyen-content');
    if (!printContent || !selectedTransfer) return;
    const originalTitle = document.title;
    document.title = `PhieuChuyen_${selectedTransfer.soPhieu}`;
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

  const PhieuChuyenContent = ({ data }: { data: TransferRecord }) => (
    <div id="phieu-chuyen-content">
      <h2 style={{ textAlign: 'center', marginBottom: 20 }}>PHIẾU CHUYỂN KHO</h2>
      <div style={{ marginBottom: 20 }}>
        <p><strong>Số phiếu:</strong> {data.soPhieu}</p>
        <p><strong>Ngày chuyển:</strong> {data.ngayChuyen}</p>
        <p><strong>Dự án:</strong> {data.duAn}</p>
        <p><strong>Kho xuất:</strong> {data.khoXuat}</p>
        <p><strong>Kho nhập:</strong> {data.khoNhap}</p>
        <p><strong>Người thực hiện:</strong> {data.nguoiThucHien}</p>
        <p><strong>Trạng thái:</strong> {data.status === 'pending' ? 'Chờ chuyển' : data.status === 'transferred' ? 'Đã chuyển' : 'Đã nhận'}</p>
        <p><strong>Ghi chú:</strong> {data.ghiChu || '---'}</p>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th>STT</th><th>Tên vật tư</th><th className="text-right">Số lượng</th><th>Đơn vị</th></tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx}>
              <td>{idx+1}</td>
              <td>{item.tenChungLoai}</td>
              <td className="text-right">{item.soLuong}</td>
              <td>{item.donVi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Chuyển Kho</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700" disabled={!canAddOrEdit}>
              <Plus className="w-4 h-4 mr-2" /> Thêm phiếu chuyển
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-xl">Tạo phiếu chuyển kho mới</DialogTitle></DialogHeader>
            <WarehouseTransfer onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Số phiếu</th>
                <th className="px-6 py-3 text-left">Ngày chuyển</th>
                <th className="px-6 py-3 text-left">Kho xuất</th>
                <th className="px-6 py-3 text-left">Kho nhập</th>
                <th className="px-6 py-3 text-left">Người thực hiện</th>
                <th className="px-6 py-3 text-center">Trạng thái</th>
                <th className="px-6 py-3 text-center">Hành động</th>
                <th className="px-6 py-3 text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {transfersList.map((t, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">{t.soPhieu}</td>
                  <td className="px-6 py-4 text-sm">{t.ngayChuyen}</td>
                  <td className="px-6 py-4 text-sm">{t.khoXuat}</td>
                  <td className="px-6 py-4 text-sm">{t.khoNhap}</td>
                  <td className="px-6 py-4 text-sm">{t.nguoiThucHien}</td>
                  <td className="px-6 py-4 text-center">{getStatusBadge(t.status)}</td>
                  <td className="px-6 py-4 text-center space-x-2">
                    {canConfirmTransfer(t) && (
                      <Button size="sm" variant="outline" className="text-blue-600" onClick={() => updateTransferStatus(t.soPhieu, 'transferred')} disabled={!canAddOrEdit}>
                        <Truck className="w-4 h-4 mr-1" /> Xác nhận chuyển
                      </Button>
                    )}
                    {canConfirmReceive(t) && (
                      <Button size="sm" variant="outline" className="text-green-600" onClick={() => updateTransferStatus(t.soPhieu, 'received')} disabled={!canAddOrEdit}>
                        <UserCheck className="w-4 h-4 mr-1" /> Đã nhận
                      </Button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedTransfer(t); setViewOpen(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {transfersList.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">Chưa có phiếu chuyển nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Chi tiết phiếu chuyển</DialogTitle></DialogHeader>
          {selectedTransfer && <PhieuChuyenContent data={selectedTransfer} />}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setViewOpen(false)}>Đóng</Button>
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700"><Download className="w-4 h-4 mr-2" /> In / Lưu PDF</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChuyenKho;