import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { toast } from 'sonner';
import { WarehouseTransaction } from '@/types/inventory';
import { useAuth } from '@/hooks/useAuth';
import { Category, Machine, Employee } from '@/types/categories';
import { getSavedCategories } from '@/lib/utils';

interface SimpleOilExportProps {
  onSubmit: (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => void;
}

export function SimpleOilExport({ onSubmit }: SimpleOilExportProps) {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
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
      setCategories(getSavedCategories());

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

      // Load employees
      const savedEmployees = localStorage.getItem('employees');
      if (savedEmployees) {
        const parsedEmployees = JSON.parse(savedEmployees);
        if (Array.isArray(parsedEmployees)) {
          setEmployees(parsedEmployees);
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
      const selectedCategory = categories.find(cat => cat.id === value || cat.maLoai === value);
      if (selectedCategory) {
        newData.donVi = selectedCategory.donVi;
        newData.donGia = String(selectedCategory.gia ?? 0);
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

    // Validate nguoiVanHanh if provided
    if (formData.nguoiVanHanh && !employees.some(emp => emp.ten_nhan_vien === formData.nguoiVanHanh)) {
      toast.error('Vui lòng chọn người nhận từ danh sách');
      return;
    }

    const selectedCategory = categories.find(cat => cat.id === formData.loaiDau || cat.maLoai === formData.loaiDau);
    const selectedMachine = machines.find(machine => machine.id === formData.mayMoc);
    
    const transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'> = {
      type: 'oil_export',
      itemId: Date.now().toString(),
      itemName: selectedCategory?.tenLoai || selectedCategory?.tenChungLoai || formData.loaiDau,
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
              <Combobox
                value={formData.loaiDau}
                onValueChange={(value) => handleInputChange('loaiDau', value)}
                placeholder="Nhập hoặc chọn loại dầu..."
                options={categories.map((c) => ({
                  label: c.tenLoai || c.tenChungLoai || c.maLoai || c.id,
                  value: c.id
                }))}
                allowCustom={true}
              />
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
              <Label className="text-sm font-medium">Người nhận</Label>
              <Combobox
                value={formData.nguoiVanHanh}
                onValueChange={(value) => handleInputChange('nguoiVanHanh', value)}
                placeholder="Tìm kiếm và chọn người nhận..."
                options={employees.map(e => ({ label: `${e.ten_nhan_vien} - ${e.msnv}`, value: e.ten_nhan_vien }))}
                allowCustom={false}
              />
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
