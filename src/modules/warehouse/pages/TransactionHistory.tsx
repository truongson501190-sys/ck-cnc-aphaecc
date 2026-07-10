// src/modules/warehouse/pages/TransactionHistory.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, FileSpreadsheet, RefreshCw } from 'lucide-react'; // Thêm RefreshCw vào import
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const STORAGE_KEYS = {
  imports: 'warehouseImports',
  exports: 'warehouseExports',
  transfers: 'warehouseTransfers',
  consumables: 'consumableExports',
};

export function TransactionHistory() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadTransactions = () => {
    setIsLoading(true);
    try {
      const imports = JSON.parse(localStorage.getItem(STORAGE_KEYS.imports) || '[]');
      const exports = JSON.parse(localStorage.getItem(STORAGE_KEYS.exports) || '[]');
      const transfers = JSON.parse(localStorage.getItem(STORAGE_KEYS.transfers) || '[]');
      const consumables = JSON.parse(localStorage.getItem(STORAGE_KEYS.consumables) || '[]');

      const importTx = imports.map((item: any) => ({ ...item, type: 'Nhập kho', icon: '📥' }));
      const exportTx = exports.map((item: any) => ({ ...item, type: 'Xuất kho', icon: '📤' }));
      const transferTx = transfers.map((item: any) => ({ ...item, type: 'Chuyển kho', icon: '🔄' }));
      const consumableTx = consumables.map((item: any) => ({ ...item, type: 'Xuất vật tư', icon: '🔧' }));

      const all = [...importTx, ...exportTx, ...transferTx, ...consumableTx];
      
      all.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.ngayXuat || a.ngayChuyen || 0);
        const dateB = new Date(b.createdAt || b.ngayXuat || b.ngayChuyen || 0);
        return dateB.getTime() - dateA.getTime();
      });

      setTransactions(all);
      setFiltered(all);
      
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Lỗi tải dữ liệu giao dịch');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    let result = transactions;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => 
        (t.soPhieu || '').toLowerCase().includes(term) ||
        (t.duAn || '').toLowerCase().includes(term) ||
        (t.khoXuat || '').toLowerCase().includes(term) ||
        (t.khoNhap || '').toLowerCase().includes(term) ||
        (t.nguoiNhan || '').toLowerCase().includes(term)
      );
    }
    
    if (typeFilter !== 'all') {
      result = result.filter(t => t.type === typeFilter);
    }
    
    setFiltered(result);
  }, [searchTerm, typeFilter, transactions]);

  const getStatusBadge = (status: string, type: string) => {
    const statusMap: { [key: string]: { label: string; color: string } } = {
      pending: { label: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-800' },
      transferred: { label: 'Đã chuyển', color: 'bg-indigo-100 text-indigo-800' },
      received: { label: 'Đã nhận', color: 'bg-green-100 text-green-800' },
      rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-800' },
    };
    
    const info = statusMap[status] || { label: status || 'Không xác định', color: 'bg-gray-100 text-gray-800' };
    return <Badge className={info.color}>{info.label}</Badge>;
  };

  const exportExcel = () => {
    if (filtered.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const data = filtered.map((t, index) => ({
      'STT': index + 1,
      'Số phiếu': t.soPhieu || '',
      'Loại': t.type || '',
      'Ngày': t.ngayXuat || t.ngayChuyen || t.createdAt || '',
      'Dự án': t.duAn || '',
      'Kho xuất': t.khoXuat || '',
      'Kho nhập': t.khoNhap || '',
      'Người thực hiện': t.nguoiThucHien || t.nguoiXuat || '',
      'Người nhận': t.nguoiNhan || '',
      'Trạng thái': t.status || '',
      'Tổng tiền': t.tongTien || t.totalValue || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'LichSuGiaoDich');
    XLSX.writeFile(wb, `LichSuGiaoDich_${new Date().toLocaleDateString('vi-VN')}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Lịch sử giao dịch</h1>
              <p className="text-gray-600 text-sm">
                Tổng hợp từ <strong>Nhập kho, Xuất kho, Chuyển kho, Xuất vật tư</strong>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Xuất Excel
            </Button>
            <Button variant="outline" onClick={loadTransactions}>
              <RefreshCw className="w-4 h-4 mr-2" /> Làm mới
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bộ lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo số phiếu, dự án, kho..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tất cả loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="Nhập kho">📥 Nhập kho</SelectItem>
                  <SelectItem value="Xuất kho">📤 Xuất kho</SelectItem>
                  <SelectItem value="Chuyển kho">🔄 Chuyển kho</SelectItem>
                  <SelectItem value="Xuất vật tư">🔧 Xuất vật tư</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="secondary" className="text-sm px-3 py-2">
                {filtered.length} giao dịch
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>STT</TableHead>
                    <TableHead>Số phiếu</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Dự án</TableHead>
                    <TableHead>Kho xuất</TableHead>
                    <TableHead>Kho nhập</TableHead>
                    <TableHead>Người thực hiện</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">Đang tải...</TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        Không có giao dịch nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((t, index) => (
                      <TableRow key={`${t.soPhieu}-${index}`} className="hover:bg-gray-50">
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{t.soPhieu}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            {t.icon} {t.type}
                          </span>
                        </TableCell>
                        <TableCell>{t.ngayXuat || t.ngayChuyen || t.createdAt?.split('T')[0] || ''}</TableCell>
                        <TableCell>{t.duAn || '---'}</TableCell>
                        <TableCell>{t.khoXuat || '---'}</TableCell>
                        <TableCell>{t.khoNhap || '---'}</TableCell>
                        <TableCell>{t.nguoiThucHien || t.nguoiXuat || '---'}</TableCell>
                        <TableCell>{getStatusBadge(t.status, t.type)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default TransactionHistory;