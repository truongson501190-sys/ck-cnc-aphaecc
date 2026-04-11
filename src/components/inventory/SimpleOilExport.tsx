import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { WarehouseTransaction } from '@/types/inventory';
import { useAuth } from '@/hooks/useAuth';
import { Category, Machine, User, Project } from '@/types/categories';

interface SimpleOilExportProps {
  onSubmit: (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => void;
}

export function SimpleOilExport({ onSubmit }: SimpleOilExportProps) {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [formData, setFormData] = useState({
    ngayXuat: new Date().toISOString().split('T')[0],
    loaiDau: '',
    soLuong: '',
    donVi: '',
    donGia: '',
    thanhTien: '0',
    mayMoc: '',
    nguoiVanHanh: '',
    ghiChu: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      // Load categories from localStorage
      const savedCategories = localStorage.getItem('category_items');
      if (savedCategories) {
        const parsedCategories = JSON.parse(savedCategories);
        if (Array.isArray(parsedCategories)) {
          // Filter only oil-related categories
          setCategories(parsedCategories
            .filter((cat: any) => 
              (cat.tenLoai || cat.tenChungLoai || '').toLowerCase().includes('dầu') || 
              (cat.tenLoai || cat.tenChungLoai || '').toLowerCase().includes('oil')
            )
            .map((cat: any) => ({
              id: cat.id,
              maLoai: cat.maLoai || cat.tenChungLoai,
              tenLoai: cat.tenLoai || cat.tenChungLoai,
              tenChungLoai: cat.tenChungLoai || cat.tenLoai,
              donVi: cat.donVi || cat.donViTinh,
              gia: cat.gia || parseFloat(cat.donGia) || 0,
              createdAt: cat.createdAt || new Date().toISOString()
            })));
        }
      }

      // Load machines from localStorage
      const savedMachines = localStorage.getItem('category_machines');
      if (savedMachines) {
        const parsedMachines = JSON.parse(savedMachines);
        if (Array.isArray(parsedMachines)) {
          setMachines(parsedMachines.map(m => ({
            id: m.id,
            tenMay: m.tenMayMoc,
            maMay: m.maMayMoc,
            createdAt: new Date().toISOString()
          })));
        }
      }

      // Load users
      const savedUsers = localStorage.getItem('users');
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        if (Array.isArray(parsedUsers)) {
          setUsers(parsedUsers);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    
    // Auto-fill related fields when category is selected
    if (field === 'loaiDau') {
      const selectedCategory = categories.find(cat => cat.id === value);
      if (selectedCategory) {
        newData.donVi = selectedCategory.donVi;
        newData.donGia = selectedCategory.gia.toString();
      }
    }
    
    // Tự động tính thành tiền
    if (field === 'soLuong' || field === 'donGia') {
      const soLuong = parseFloat(field === 'soLuong' ? value : newData.soLuong) || 0;
      const donGia = parseFloat(field === 'donGia' ? value : newData.donGia) || 0;
      newData.thanhTien = (soLuong * donGia).toString();
    }
    
    setFormData(newData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.loaiDau || !formData.soLuong || !formData.mayMoc) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (*)');
      return;
    }

    const selectedCategory = categories.find(cat => cat.id === formData.loaiDau);
    const selectedMachine = machines.find(machine => machine.id === formData.mayMoc);
    
    const transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'> = {
      type: 'oil_export',
      itemId: Date.now().toString(),
      itemName: selectedCategory?.tenChungLoai || formData.loaiDau,
      quantity: parseFloat(formData.soLuong),
      unit: formData.donVi,
      price: parseFloat(formData.donGia) || 0,
      totalValue: parseFloat(formData.thanhTien) || 0,
      reason: `Xuất dầu cho máy ${selectedMachine?.tenMay || formData.mayMoc}`,
      referenceNumber: `DM${Date.now()}`,
      operator: user?.name || formData.nguoiVanHanh,
      status: 'pending',
      transactionDate: formData.ngayXuat,
      notes: formData.ghiChu,
      machineId: formData.mayMoc
    };
    
    onSubmit(transaction);
    
    // Reset form
    setFormData({
      ngayXuat: new Date().toISOString().split('T')[0],
      loaiDau: '', soLuong: '', donVi: '', donGia: '', thanhTien: '0',
      mayMoc: '', nguoiVanHanh: '', ghiChu: ''
    });

    toast.success('Đã tạo phiếu xuất dầu thành công!');
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          🛢️ Phiếu Xuất Dầu Mỡ
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Ngày xuất *</Label>
              <Input
                type="date"
                value={formData.ngayXuat}
                onChange={(e) => handleInputChange('ngayXuat', e.target.value)}
                required
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Loại dầu *</Label>
              <Select value={formData.loaiDau} onValueChange={(value) => handleInputChange('loaiDau', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại dầu..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">Chưa có loại dầu nào. Vui lòng thêm trong Quản lý danh mục.</div>
                  ) : (
                    categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.tenChungLoai}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Số lượng *</Label>
              <Input
                type="number"
                value={formData.soLuong}
                onChange={(e) => handleInputChange('soLuong', e.target.value)}
                placeholder="Nhập số lượng"
                min="0"
                step="0.01"
                required
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Đơn vị *</Label>
              <Input
                value={formData.donVi}
                onChange={(e) => handleInputChange('donVi', e.target.value)}
                placeholder="Tự động điền khi chọn loại dầu"
                readOnly
                className="bg-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Đơn giá (VND) *</Label>
              <Input
                type="number"
                value={formData.donGia}
                onChange={(e) => handleInputChange('donGia', e.target.value)}
                placeholder="Tự động điền khi chọn loại dầu"
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Thành tiền (VND)</Label>
              <Input
                value={formData.thanhTien}
                readOnly
                className="bg-gray-100"
                placeholder="0 VND"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Máy móc *</Label>
              <Select value={formData.mayMoc} onValueChange={(value) => handleInputChange('mayMoc', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn máy móc..." />
                </SelectTrigger>
                <SelectContent>
                  {machines.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">Chưa có máy móc nào. Vui lòng thêm trong Quản lý danh mục.</div>
                  ) : (
                    machines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.tenMay} ({machine.maMay})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Người vận hành</Label>
              <Select value={formData.nguoiVanHanh} onValueChange={(value) => handleInputChange('nguoiVanHanh', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người vận hành..." />
                </SelectTrigger>
                <SelectContent>
                  {users.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">Chưa có người dùng nào. Vui lòng thêm trong Quản lý danh mục.</div>
                  ) : (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.hoTen}>
                        {user.hoTen} - {user.msnv}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Ghi chú</Label>
            <Textarea
              value={formData.ghiChu}
              onChange={(e) => handleInputChange('ghiChu', e.target.value)}
              placeholder="Ghi chú thêm (tùy chọn)"
              rows={3}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button 
            type="submit" 
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2 rounded-md"
          >
            🛢️ Thêm Phiếu Xuất Dầu
          </Button>
        </div>
      </form>
    </div>
  );
}
