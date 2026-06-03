import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, PackageOpen, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn, getSavedCategories } from '@/lib/utils';
import { Category, Warehouse, User } from '@/types/categories';
import { Combobox } from '@/components/ui/combobox';

interface ExportItem {
  id: string;
  chungLoaiId: string;
  tenChungLoai: string;
  donVi: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  ghiChu: string;
}

export function WarehouseExport() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<ExportItem[]>([]);
  const [exportsList, setExportsList] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    soPhieu: '',
    nguoiXuat: '',
    khoXuat: '',
    nguoiNhan: '',
    lyDoXuat: '',
    ghiChu: ''
  });

  useEffect(() => {
    loadData();
    generatePhieuNumber();
  }, []);

  const loadData = () => {
    try {
      // Load categories using the shared utility
      setCategories(getSavedCategories());

      // Load warehouses from multiple possible sources
      const savedWarehouses = localStorage.getItem('warehouses') || localStorage.getItem('category_warehouses');
      if (savedWarehouses) {
        const parsed = JSON.parse(savedWarehouses);
        if (Array.isArray(parsed)) {
          setWarehouses(parsed.map((w: any) => ({
            id: w.id || w.maKho || w.tenKho,
            tenKho: w.tenKho,
            maKho: w.maKho || w.loaiKho || w.maKho || w.tenKho,
            loaiKho: w.maKho || w.loaiKho || w.maKho || w.tenKho,
            diaChi: w.diaChi || '',
            createdAt: w.createdAt || new Date().toISOString()
          })));
        }
      }

      // Load users
      const savedUsers = localStorage.getItem('users');
      if (savedUsers) {
        setUsers(JSON.parse(savedUsers));
      }

      // Load existing exports
      const savedExports = localStorage.getItem('warehouseExports');
      if (savedExports) {
        setExportsList(JSON.parse(savedExports));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const generatePhieuNumber = () => {
    const today = new Date();
    const dateStr = format(today, 'yyyyMMdd');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setFormData(prev => ({
      ...prev,
      soPhieu: `XK${dateStr}${randomNum}`
    }));
  };

  const addNewItem = () => {
    const newItem: ExportItem = {
      id: Date.now().toString(),
      chungLoaiId: '',
      tenChungLoai: '',
      donVi: '',
      soLuong: 0,
      donGia: 0,
      thanhTien: 0,
      ghiChu: ''
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof ExportItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // If category is selected or typed, auto-fill related fields
        if (field === 'chungLoaiId') {
          const selectedCategory = categories.find(cat => 
            cat.id === value || 
            cat.tenChungLoai === value || 
            cat.tenLoai === value ||
            cat.maLoai === value
          );
          if (selectedCategory) {
            updatedItem.tenChungLoai = selectedCategory.tenChungLoai || selectedCategory.tenLoai || '';
            updatedItem.donVi = selectedCategory.donVi || '';
            updatedItem.donGia = selectedCategory.gia || 0;
            updatedItem.chungLoaiId = selectedCategory.id || ''; // Set to id for consistency
          } else {
            // Custom input
            updatedItem.tenChungLoai = value;
            updatedItem.chungLoaiId = value; // Keep as name for custom
          }
        }
        
        // Recalculate total when quantity or price changes
        if (field === 'soLuong' || field === 'donGia') {
          updatedItem.thanhTien = updatedItem.soLuong * updatedItem.donGia;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      alert('Vui lòng thêm ít nhất một mặt hàng');
      return;
    }

    const exportData = {
      ...formData,
      ngayXuat: selectedDate.toISOString(),
      items: items,
      tongTien: items.reduce((sum, item) => sum + item.thanhTien, 0),
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    try {
      const existingExports = JSON.parse(localStorage.getItem('warehouseExports') || '[]');
      existingExports.push(exportData);
      localStorage.setItem('warehouseExports', JSON.stringify(existingExports));
      // update local list state
      setExportsList(existingExports);

      alert('Lưu phiếu xuất kho thành công!');

      // Reset form
      setItems([]);
      generatePhieuNumber();
      setFormData({
        soPhieu: formData.soPhieu,
        nguoiXuat: '',
        khoXuat: '',
        nguoiNhan: '',
        lyDoXuat: '',
        ghiChu: ''
      });
    } catch (error) {
      alert('Có lỗi xảy ra khi lưu phiếu xuất kho');
    }
  };

  // Export helpers (CSV)
  const toCsv = (rows: any[], columns: string[]) => {
    const header = columns.join(',') + '\n';
    const body = rows
      .map(r => columns.map(c => {
        const v = r[c] ?? '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      }).join(',')).join('\n');
    return header + body;
  };

  const exportAllExports = () => {
    if (!exportsList || exportsList.length === 0) {
      alert('Không có phiếu xuất để xuất');
      return;
    }
    const columns = ['soPhieu','ngayXuat','nguoiXuat','khoXuat','nguoiNhan','lyDoXuat','tongTien','createdAt'];
    const csv = toCsv(exportsList, columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phieu-xuat-kho_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportSingleExport = (t: any) => {
    const columns = ['soPhieu','ngayXuat','nguoiXuat','khoXuat','nguoiNhan','lyDoXuat','tongTien','createdAt'];
    const csv = toCsv([t], columns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t.soPhieu || 'phieu-xuat'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Excel (.xlsx) export using SheetJS
  const exportAllExcel = () => {
    if (!exportsList || exportsList.length === 0) {
      alert('Không có phiếu xuất để xuất');
      return;
    }
    const wb = XLSX.utils.book_new();
    exportsList.forEach((exp, idx) => {
      const wsData = [
        ['Phiếu Xuất Kho', exp.soPhieu],
        ['Ngày:', new Date(exp.ngayXuat).toLocaleDateString('vi-VN')],
        ['Người Xuất:', exp.nguoiXuat],
        ['Kho Xuất:', exp.khoXuat],
        ['Người Nhận:', exp.nguoiNhan],
        [''],
        ['Tên', 'ĐVT', 'Số Lượng', 'Đơn Giá', 'Thành Tiền']
      ];
      (exp.items || []).forEach((item: any) => {
        wsData.push([item.tenChungLoai, item.donVi, item.soLuong, item.donGia, item.thanhTien]);
      });
      wsData.push(['', '', '', 'Tổng:', exp.tongTien]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, `Phiếu ${idx + 1}`);
    });

    XLSX.writeFile(wb, `phieu-xuat-kho_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportSingleExcel = (t: any) => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Phiếu Xuất Kho', t.soPhieu],
      ['Ngày:', new Date(t.ngayXuat).toLocaleDateString('vi-VN')],
      ['Người Xuất:', t.nguoiXuat],
      ['Kho Xuất:', t.khoXuat],
      ['Người Nhận:', t.nguoiNhan],
      [''],
      ['Tên', 'ĐVT', 'Số Lượng', 'Đơn Giá', 'Thành Tiền']
    ];
    (t.items || []).forEach((item: any) => {
      wsData.push([item.tenChungLoai, item.donVi, item.soLuong, item.donGia, item.thanhTien]);
    });
    wsData.push(['', '', '', 'Tổng:', t.tongTien]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Phiếu');

    XLSX.writeFile(wb, `${t.soPhieu || 'phieu-xuat'}.xlsx`);
  };

  const printExport = (t: any) => {
    const w = window.open('', '_blank', 'noopener');
    if (!w) return;
    const rows = (t.items || []).map((it: any) => `
      <tr>
        <td>${it.tenChungLoai}</td>
        <td>${it.donVi}</td>
        <td style="text-align:right">${it.soLuong}</td>
        <td style="text-align:right">${it.donGia}</td>
        <td style="text-align:right">${it.thanhTien}</td>
      </tr>
    `).join('\n');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Phiếu Xuất ${t.soPhieu}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px}</style>
      </head><body>
      <h2>Phiếu Xuất Kho - ${t.soPhieu}</h2>
      <p>Ngày: ${t.ngayXuat}</p>
      <p>Người xuất: ${t.nguoiXuat}</p>
      <p>Kho xuất: ${t.khoXuat}</p>
      <table>
        <thead><tr><th>Tên</th><th>ĐVT</th><th>Số Lượng</th><th>Đơn Giá</th><th>Thành Tiền</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="text-align:right"><strong>Tổng: ${formatCurrency(t.tongTien || 0)}</strong></p>
      <script>window.print();</script>
      </body></html>`;

    w.document.write(html);
    w.document.close();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.thanhTien, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <PackageOpen className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Phiếu Xuất Kho</h2>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Danh Sách Phiếu Xuất</CardTitle>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={exportAllExports}>
                Xuất All CSV
              </Button>
              <Button type="button" variant="outline" onClick={exportAllExcel}>
                Xuất All Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(!exportsList || exportsList.length === 0) ? (
            <div className="text-sm text-gray-500">Chưa có phiếu xuất nào.</div>
          ) : (
            <div className="space-y-2">
              {exportsList.map((t) => (
                <div key={t.soPhieu + t.createdAt} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{t.soPhieu}</div>
                    <div className="text-sm text-muted-foreground">{format(new Date(t.ngayXuat), 'dd/MM/yyyy', { locale: vi })} — {t.nguoiXuat}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => exportSingleExport(t)}>Xuất CSV</Button>
                    <Button size="sm" variant="outline" onClick={() => exportSingleExcel(t)}>Xuất Excel</Button>
                    <Button size="sm" onClick={() => printExport(t)}>In</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle>Thông Tin Phiếu Xuất</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="soPhieu">Số Phiếu *</Label>
              <Input
                id="soPhieu"
                value={formData.soPhieu}
                onChange={(e) => setFormData({...formData, soPhieu: e.target.value})}
                required
                readOnly
              />
            </div>
            
            <div>
              <Label>Ngày Xuất *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: vi }) : "Chọn ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label htmlFor="nguoiXuat">Người Xuất *</Label>
              <Select
                value={formData.nguoiXuat}
                onValueChange={(value) => setFormData({...formData, nguoiXuat: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người xuất" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter((user) => {
                    const normalizedRole = `${user.vaiTro || user.role || ''}`.toString().trim().toLowerCase().replace(/\s+/g, '');
                    return ['nguoixuat', 'xuat'].includes(normalizedRole);
                  }).map((user) => (
                    <SelectItem key={user.msnv || user.employee_code || user.id} value={user.msnv || user.employee_code || user.id}>
                      {(user.hoTen || user.full_name || user.name || user.username || user.msnv || user.employee_code || user.id)} - {user.msnv || user.employee_code || user.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="khoXuat">Kho Xuất *</Label>
              <Select
                value={formData.khoXuat}
                onValueChange={(value) => setFormData({...formData, khoXuat: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn kho xuất" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.loaiKho}>
                      {warehouse.tenKho}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="nguoiNhan">Người Nhận *</Label>
              <Select
                value={formData.nguoiNhan}
                onValueChange={(value) => setFormData({...formData, nguoiNhan: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người nhận" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter((user) => {
                    const normalizedRole = `${user.vaiTro || user.role || ''}`.toString().trim().toLowerCase().replace(/\s+/g, '');
                    return ['nguoinhan', 'nhan'].includes(normalizedRole);
                  }).map((user) => (
                    <SelectItem key={user.msnv || user.employee_code || user.id} value={user.msnv || user.employee_code || user.id}>
                      {(user.hoTen || user.full_name || user.name || user.username || user.msnv || user.employee_code || user.id)} - {user.msnv || user.employee_code || user.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="lyDoXuat">Lý Do Xuất</Label>
              <Select
                value={formData.lyDoXuat}
                onValueChange={(value) => setFormData({...formData, lyDoXuat: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn lý do xuất" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="san-xuat">Sản xuất</SelectItem>
                  <SelectItem value="bao-tri">Bảo trì</SelectItem>
                  <SelectItem value="sua-chua">Sửa chữa</SelectItem>
                  <SelectItem value="thu-nghiem">Thử nghiệm</SelectItem>
                  <SelectItem value="khac">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="ghiChu">Ghi Chú</Label>
              <Textarea
                id="ghiChu"
                value={formData.ghiChu}
                onChange={(e) => setFormData({...formData, ghiChu: e.target.value})}
                placeholder="Nhập ghi chú"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Danh Sách Mặt Hàng</CardTitle>
              <Button type="button" onClick={addNewItem} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Thêm Mặt Hàng
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Chưa có mặt hàng nào. Nhấn "Thêm Mặt Hàng" để bắt đầu.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Mặt hàng {index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Xóa
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div>
                        <Label>Chủng Loại *</Label>
                        <Combobox
                          value={item.tenChungLoai}
                          onValueChange={(value) => updateItem(item.id, 'chungLoaiId', value)}
                          placeholder="Chọn hoặc nhập chủng loại"
                          options={categories.map((category) => ({
                            label: category.tenLoai || category.tenChungLoai || category.maLoai || '',
                            value: category.tenLoai || category.tenChungLoai || category.maLoai || '' || ''
                            }))}
                          allowCustom={true}
                        />
                      </div>
                      
                      <div>
                        <Label>Đơn Vị</Label>
                        <Input
                          value={item.donVi}
                          readOnly
                          className="bg-gray-100"
                        />
                      </div>
                      
                      <div>
                        <Label>Số Lượng *</Label>
                        <Input
                          type="number"
                          value={item.soLuong}
                          onChange={(e) => updateItem(item.id, 'soLuong', Number(e.target.value))}
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      <div>
                        <Label>Đơn Giá (VND)</Label>
                        <Input
                          type="number"
                          value={item.donGia}
                          onChange={(e) => updateItem(item.id, 'donGia', Number(e.target.value))}
                          placeholder="0"
                          min="0"
                        />
                      </div>
                      
                      <div>
                        <Label>Thành Tiền</Label>
                        <Input
                          value={formatCurrency(item.thanhTien)}
                          readOnly
                          className="bg-gray-100"
                        />
                      </div>
                      
                      <div>
                        <Label>Ghi Chú</Label>
                        <Input
                          value={item.ghiChu}
                          onChange={(e) => updateItem(item.id, 'ghiChu', e.target.value)}
                          placeholder="Ghi chú"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-end">
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        Tổng tiền: {formatCurrency(totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline">
            Hủy
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            Lưu Phiếu Xuất Kho
          </Button>
        </div>
      </form>
    </div>
  );
}