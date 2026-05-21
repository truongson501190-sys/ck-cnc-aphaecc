import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Package, Plus } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn, getSavedCategories } from '@/lib/utils';
import { Category, Warehouse, User } from '@/types/categories';

interface ImportItem {
  id: string;
  chungLoaiId: string;
  tenChungLoai: string;
  donVi: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  ghiChu: string;
}

export function WarehouseImport() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    soPhieu: '',
    nguoiNhap: '',
    khoNhap: '',
    nhaCungCap: '',
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
    } catch (error) {
      console.error('Error loading data:', error);
      setCategories([]);
      setWarehouses([]);
      setUsers([]);
    }
  };

  const generatePhieuNumber = () => {
    const today = new Date();
    const dateStr = format(today, 'yyyyMMdd');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    setFormData(prev => ({
      ...prev,
      soPhieu: `NK${dateStr}${randomNum}`
    }));
  };

  const addNewItem = () => {
    const newItem: ImportItem = {
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

  const updateItem = (id: string, field: keyof ImportItem, value: any) => {
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
            updatedItem.tenChungLoai = selectedCategory.tenChungLoai || selectedCategory.tenLoai;
            updatedItem.donVi = selectedCategory.donVi;
            updatedItem.donGia = selectedCategory.gia;
            updatedItem.chungLoaiId = selectedCategory.id; // Set to id for consistency
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

    const importData = {
      ...formData,
      ngayNhap: selectedDate.toISOString(),
      items: items,
      tongTien: items.reduce((sum, item) => sum + item.thanhTien, 0),
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    try {
      const existingImports = JSON.parse(localStorage.getItem('warehouseImports') || '[]');
      existingImports.push(importData);
      localStorage.setItem('warehouseImports', JSON.stringify(existingImports));
      
      alert('Lưu phiếu nhập kho thành công!');
      
      // Reset form
      setItems([]);
      generatePhieuNumber();
      setFormData({
        soPhieu: formData.soPhieu,
        nguoiNhap: '',
        khoNhap: '',
        nhaCungCap: '',
        ghiChu: ''
      });
    } catch (error) {
      alert('Có lỗi xảy ra khi lưu phiếu nhập kho');
    }
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
        <Package className="w-6 h-6 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-800">Phiếu Nhập Kho</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle>Thông Tin Phiếu Nhập</CardTitle>
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
              <Label>Ngày Nhập *</Label>
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
              <Label htmlFor="nguoiNhap">Người Nhập *</Label>
              <Select
                value={formData.nguoiNhap}
                onValueChange={(value) => setFormData({...formData, nguoiNhap: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người nhập" />
                </SelectTrigger>
                <SelectContent>
                  {users.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">Chưa có người dùng nào. Vui lòng thêm trong Quản lý danh mục.</div>
                  ) : (
                    users.filter((user) => {
                      const normalizedRole = `${user.vaiTro || user.role || ''}`.toString().trim().toLowerCase().replace(/\s+/g, '');
                      return ['nguoinhap', 'nhap'].includes(normalizedRole);
                    }).map((user) => (
                      <SelectItem key={user.msnv || user.employee_code || user.id} value={user.msnv || user.employee_code || user.id}>
                        {(user.hoTen || user.fullName || user.name || user.username || user.msnv || user.employee_code || user.id)} - {user.msnv || user.employee_code || user.id}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="khoNhap">Kho Nhập *</Label>
              <Select
                value={formData.khoNhap}
                onValueChange={(value) => setFormData({...formData, khoNhap: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn kho nhập" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">Chưa có kho nào. Vui lòng thêm trong Quản lý danh mục.</div>
                  ) : (
                    warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.loaiKho}>
                        {warehouse.tenKho}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="nhaCungCap">Nhà Cung Cấp</Label>
              <Input
                id="nhaCungCap"
                value={formData.nhaCungCap}
                onChange={(e) => setFormData({...formData, nhaCungCap: e.target.value})}
                placeholder="Nhập tên nhà cung cấp"
              />
            </div>
            
            <div>
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
                            label: category.tenLoai || category.tenChungLoai || category.maLoai,
                            value: category.tenLoai || category.tenChungLoai || category.maLoai
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
                          placeholder="Tự động điền"
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
          <Button type="submit" className="bg-green-600 hover:bg-green-700">
            Lưu Phiếu Nhập Kho
          </Button>
        </div>
      </form>
    </div>
  );
}