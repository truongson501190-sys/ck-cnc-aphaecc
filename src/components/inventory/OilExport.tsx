import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Fuel, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Category, Warehouse, User, Machine, Employee } from '@/types/categories';

interface OilExportItem {
  id: string;
  chungLoaiId: string;
  tenChungLoai: string;
  donVi: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
  maySuDung: string;
  ghiChu: string;
}

export function OilExport() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<OilExportItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formData, setFormData] = useState({
    soPhieu: '',
    nguoiXuat: '',
    khoXuat: '',
    nguoiNhan: '',
    boPhan: '',
    ghiChu: ''
  });

  useEffect(() => {
    loadData();
    generatePhieuNumber();
  }, []);

  const loadData = () => {
    try {
      // Load categories (filter for oil types)
      const savedCategories = localStorage.getItem('categoryTypes');
      if (savedCategories) {
        const allCategories = JSON.parse(savedCategories);
        // Filter for oil-related categories or show all if no specific oil categories
        setCategories(allCategories);
      }

      // Load warehouses
      const savedWarehouses = localStorage.getItem('warehouses');
      if (savedWarehouses) {
        setWarehouses(JSON.parse(savedWarehouses));
      }

      // Load users
      const savedUsers = localStorage.getItem('users');
      if (savedUsers) {
        setUsers(JSON.parse(savedUsers));
      }

      // Load machines
      const savedMachines = localStorage.getItem('machines');
      if (savedMachines) {
        setMachines(JSON.parse(savedMachines));
      }

      // Load employees
      const savedEmployees = localStorage.getItem('employees');
      if (savedEmployees) {
        setEmployees(JSON.parse(savedEmployees));
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
      soPhieu: `XD${dateStr}${randomNum}`
    }));
  };

  const addNewItem = () => {
    const newItem: OilExportItem = {
      id: Date.now().toString(),
      chungLoaiId: '',
      tenChungLoai: '',
      donVi: '',
      soLuong: 0,
      donGia: 0,
      thanhTien: 0,
      maySuDung: '',
      ghiChu: ''
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof OilExportItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // If category is selected, auto-fill related fields
        if (field === 'chungLoaiId') {
          const selectedCategory = categories.find(cat => cat.id === value);
          if (selectedCategory) {
            updatedItem.tenChungLoai = selectedCategory.tenChungLoai || selectedCategory.tenLoai || '';
            updatedItem.donVi = selectedCategory.donVi || '';
            updatedItem.donGia = selectedCategory.gia ?? 0;
          }
        }
        
        // Recalculate total when quantity or price changes
        if (field === 'soLuong' || field === 'donGia') {
          updatedItem.thanhTien = (updatedItem.soLuong || 0) * (updatedItem.donGia || 0);
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
      alert('Vui lòng thêm ít nhất một loại dầu');
      return;
    }

    const oilExportData = {
      ...formData,
      ngayXuat: selectedDate.toISOString(),
      items: items,
      tongTien: items.reduce((sum, item) => sum + item.thanhTien, 0),
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    try {
      const existingOilExports = JSON.parse(localStorage.getItem('oilExports') || '[]');
      existingOilExports.push(oilExportData);
      localStorage.setItem('oilExports', JSON.stringify(existingOilExports));
      
      alert('Lưu phiếu xuất dầu thành công!');
      
      // Reset form
      setItems([]);
      generatePhieuNumber();
      setFormData({
        soPhieu: formData.soPhieu,
        nguoiXuat: '',
        khoXuat: '',
        nguoiNhan: '',
        boPhan: '',
        ghiChu: ''
      });
    } catch (error) {
      alert('Có lỗi xảy ra khi lưu phiếu xuất dầu');
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
        <Fuel className="w-6 h-6 text-orange-600" />
        <h2 className="text-2xl font-bold text-gray-800">Phiếu Xuất Dầu</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Information */}
        <Card>
          <CardHeader>
            <CardTitle>Thông Tin Phiếu Xuất Dầu</CardTitle>
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
                      {(user.hoTen || user.fullName || user.name || user.username || user.msnv || user.employee_code || user.id)} - {user.msnv || user.employee_code || user.id}
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
                    <SelectItem key={warehouse.id} value={String(warehouse.loaiKho ?? warehouse.id ?? '')}>
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
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.ten_nhan_vien}>
                      {employee.ten_nhan_vien} - {employee.msnv}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="boPhan">Bộ Phận</Label>
              <Select
                value={formData.boPhan}
                onValueChange={(value) => setFormData({...formData, boPhan: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bộ phận" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="san-xuat">Sản xuất</SelectItem>
                  <SelectItem value="bao-tri">Bảo trì</SelectItem>
                  <SelectItem value="kiem-tra-chat-luong">Kiểm tra chất lượng</SelectItem>
                  <SelectItem value="kho-van">Kho vận</SelectItem>
                  <SelectItem value="hanh-chinh">Hành chính</SelectItem>
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
              <CardTitle>Danh Sách Dầu Xuất</CardTitle>
              <Button type="button" onClick={addNewItem} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Thêm Loại Dầu
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Chưa có loại dầu nào. Nhấn "Thêm Loại Dầu" để bắt đầu.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Loại dầu {index + 1}</h4>
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
                      <div>
                        <Label>Chủng Loại Dầu *</Label>
                        <Select
                          value={item.chungLoaiId}
                          onValueChange={(value) => updateItem(item.id, 'chungLoaiId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn loại dầu" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.tenChungLoai}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Label>Máy Sử Dụng</Label>
                        <Select
                          value={item.maySuDung}
                          onValueChange={(value) => updateItem(item.id, 'maySuDung', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn máy" />
                          </SelectTrigger>
                          <SelectContent>
                            {machines.map((machine) => (
                              <SelectItem key={machine.id} value={machine.tenMay}>
                                {machine.tenMay}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
          <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
            Lưu Phiếu Xuất Dầu
          </Button>
        </div>
      </form>
    </div>
  );
}