import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { WarehouseTransaction } from '@/types/inventory';
import { useAuth } from '@/hooks/useAuth';
import { Category, Warehouse, Employee } from '@/types/categories';
import { getSavedCategories } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { getSystemUsers, type SystemUser } from '@/hooks/useSystemUsers';

type RawRecord = Record<string, unknown>;

function toString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parseJsonArray<T>(raw: string | null): T[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface ExactLayoutWarehouseImportProps {
  onSubmit: (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => void;
}

export function ExactLayoutWarehouseImport({ onSubmit }: ExactLayoutWarehouseImportProps) {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    tenChungLoai: '',
    donVi: '',
    gia: ''
  });
  
  const [formData, setFormData] = useState({
    ngayNhap: new Date().toISOString().split('T')[0],
    chungLoai: '',
    soLuong: '',
    donVi: '',
    donGia: '',
    thanhTien: '0',
    khoNhap: '',
    nguoiNhap: '',
    ghiChu: ''
  });

  const [extraItems, setExtraItems] = useState<Array<{ id: string; chungLoai: string; soLuong: string; donVi: string; donGia: string; thanhTien: string }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Add effect to reload data when component becomes visible
  useEffect(() => {
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadData = () => {
    try {
      setCategories(getSavedCategories());

      // Load system users
      const users = getSystemUsers();
      setSystemUsers(users);

      // Load warehouses from localStorage
      const savedWarehouses = localStorage.getItem('warehouses') || localStorage.getItem('category_warehouses');
      if (savedWarehouses) {
        const parsedWarehouses = JSON.parse(savedWarehouses);
        if (Array.isArray(parsedWarehouses)) {
          setWarehouses(parsedWarehouses.map(w => ({
            id: w.id || `${w.maKho || w.tenKho}-${Math.random().toString(36).slice(2, 8)}`,
            tenKho: w.tenKho,
            loaiKho: w.maKho || w.loaiKho || w.tenKho,
            diaChi: w.diaChi,
            createdAt: w.createdAt || new Date().toISOString()
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

  const handleAddCategory = () => {
    if (!newCategory.tenChungLoai || !newCategory.donVi) {
      toast.error('Vui lòng nhập tên và đơn vị');
      return;
    }

    const categoryToAdd: Category = {
      id: Date.now().toString(),
      maLoai: Date.now().toString(),
      tenLoai: newCategory.tenChungLoai,
      tenChungLoai: newCategory.tenChungLoai,
      donVi: newCategory.donVi,
      gia: parseFloat(newCategory.gia) || 0,
      createdAt: new Date().toISOString()
    };

    const updatedCategories = [...categories, categoryToAdd];
    setCategories(updatedCategories);
    localStorage.setItem('category_items', JSON.stringify(updatedCategories.map(cat => ({
      id: cat.id,
      maChungLoai: cat.maLoai,
      tenChungLoai: cat.tenLoai,
      donViTinh: cat.donVi,
      donGia: String(cat.gia ?? 0)
    }))));
    
    setFormData(prev => ({ ...prev, chungLoai: categoryToAdd.maLoai ?? categoryToAdd.id, donVi: categoryToAdd.donVi, donGia: String(categoryToAdd.gia ?? 0) }));
    setIsAddCategoryOpen(false);
    setNewCategory({ tenChungLoai: '', donVi: '', gia: '' });
    toast.success('Đã thêm chủng loại mới');
  };

  const addRow = () => {
    setExtraItems([...extraItems, { id: Date.now().toString(), chungLoai: '', soLuong: '', donVi: '', donGia: '', thanhTien: '0' }]);
  };

  const removeRow = (id: string) => {
    setExtraItems(extraItems.filter((item) => item.id !== id));
  };

  const updateRow = (id: string, field: keyof { chungLoai: string; soLuong: string; donVi: string; donGia: string; thanhTien: string }, value: string) => {
    setExtraItems(extraItems.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'chungLoai') {
          const selectedCategory = findCategoryByValue(value);
          if (selectedCategory) {
            updated.donVi = selectedCategory.donVi;
            updated.donGia = String(selectedCategory.gia ?? 0);
          }
        }
        if (field === 'soLuong') {
          const soLuong = parseFloat(value) || 0;
          const donGia = parseFloat(updated.donGia) || 0;
          updated.thanhTien = (soLuong * donGia).toString();
        }
        return updated;
      }
      return item;
    }));
  };

  const findCategoryByValue = (value: string) => {
    return categories.find(cat =>
      cat.maLoai === value ||
      cat.maChungLoai === value ||
      cat.id === value ||
      cat.tenLoai === value ||
      cat.tenChungLoai === value
    );
  };

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    
    // Auto-fill related fields when category is selected by id/code or name
    if (field === 'chungLoai') {
      const selectedCategory = findCategoryByValue(value);
      if (selectedCategory) {
        newData.donVi = selectedCategory.donVi;
        newData.donGia = String(selectedCategory.gia ?? 0);
      }
    }
    
    if (field === 'soLuong' || field === 'donGia') {
      const soLuong = parseFloat(field === 'soLuong' ? value : newData.soLuong) || 0;
      const donGia = parseFloat(field === 'donGia' ? value : newData.donGia) || 0;
      newData.thanhTien = (soLuong * donGia).toString();
    }
    
    setFormData(newData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.chungLoai || !formData.soLuong || !formData.khoNhap) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (*)');
      return;
    }

    // Validate nguoiNhap if provided
    if (formData.nguoiNhap && !employees.find(e => e.ten_nhan_vien === formData.nguoiNhap)) {
      toast.error('Vui lòng chọn người nhập từ danh sách');
      return;
    }

    const selectedCategory = findCategoryByValue(formData.chungLoai);
    const transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'> = {
      type: 'import',
      itemId: Date.now().toString(),
      itemName: selectedCategory?.tenChungLoai || formData.chungLoai,
      quantity: parseFloat(formData.soLuong),
      unit: formData.donVi,
      price: parseFloat(formData.donGia) || 0,
      totalValue: parseFloat(formData.thanhTien) || 0,
      toLocation: formData.khoNhap,
      reason: 'Nhập kho',
      referenceNumber: `NK${Date.now()}`,
      operator: user?.name || formData.nguoiNhap,
      status: 'pending',
      transactionDate: formData.ngayNhap,
      notes: formData.ghiChu
    };
    
    onSubmit(transaction);
    toast.success('Đã thêm phiếu nhập kho thành công!');
  };

  return (
    <div className="max-w-7xl mx-auto bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-semibold">➕ Phiếu Nhập Kho</h2>
      </div>

      {/* Layout dầu: Header thông tin chính, bảng giữa, các field dưới bảng */}
      <div className="p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Info: chỉ ngày */}
          <div className="grid grid-cols-1 gap-4 bg-gray-50 p-4 rounded-lg border">
            <div>
              <Label className="text-sm font-medium">Ngày nhập *</Label>
              <Input type="date" value={formData.ngayNhap} onChange={(e) => handleInputChange('ngayNhap', e.target.value)} required />
            </div>
          </div>

          {/* Items Section: bảng một dòng dùng formData */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Danh sách vật tư</h3>
              <div className="flex gap-2">
                <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="text-blue-600 border-blue-200">
                      <Plus className="w-4 h-4 mr-1" /> Thêm chủng loại
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Thêm chủng loại sản phẩm mới</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Tên chủng loại *</Label>
                        <Input value={newCategory.tenChungLoai} onChange={(e) => setNewCategory(prev => ({ ...prev, tenChungLoai: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Đơn vị tính *</Label>
                          <Input value={newCategory.donVi} onChange={(e) => setNewCategory(p => ({ ...p, donVi: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Đơn giá tham khảo (VND)</Label>
                          <Input type="number" value={newCategory.gia} onChange={(e) => setNewCategory(prev => ({ ...prev, gia: e.target.value }))} placeholder="0" />
                        </div>
                      </div>
                      <Button className="w-full" onClick={handleAddCategory}>💾 Lưu chủng loại</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button type="button" onClick={addRow} variant="default" size="sm" className="bg-green-500 hover:bg-green-600">
                  <Plus className="w-4 h-4 mr-1" /> Thêm dòng
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <table className="min-w-full w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-2 text-left w-10">STT</th>
                    <th className="p-2 text-left">Chủng loại *</th>
                    <th className="p-2 text-left w-24">Số lượng *</th>
                    <th className="p-2 text-left w-20">Đơn vị</th>
                    <th className="p-2 text-left w-32">Đơn giá</th>
                    <th className="p-2 text-left w-32">Thành tiền</th>
                    <th className="p-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="p-2 text-center text-gray-500">1</td>
                    <td className="p-2">
                      <Combobox
                        value={formData.chungLoai}
                        onValueChange={(value) => handleInputChange('chungLoai', value)}
                        placeholder="Nhập hoặc chọn chủng loại"
                        options={categories.map((c) => ({
                          label: c.tenLoai || c.tenChungLoai || c.maLoai || c.id || '',
                          value: c.id
                        }))}
                        allowCustom={true}
                      />
                    </td>
                    <td className="p-2">
                      <Input type="number" className="h-9 border-gray-200" value={formData.soLuong} onChange={(e) => handleInputChange('soLuong', e.target.value)} />
                    </td>
                    <td className="p-2">
                      <Input className="h-9 bg-gray-50 border-gray-200" value={formData.donVi} readOnly />
                    </td>
                    <td className="p-2">
                      <Input type="number" className="h-9 border-gray-200 bg-gray-50 text-gray-600" value={formData.donGia} readOnly />
                    </td>
                    <td className="p-2">
                      <div className="font-semibold text-green-600">{Number(formData.thanhTien).toLocaleString('vi-VN')}</div>
                    </td>
                    <td className="p-2 text-center">
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600" onClick={() => setFormData({ ...formData, chungLoai: '', soLuong: '', donVi: '', donGia: '', thanhTien: '0' })}>X</Button>
                    </td>
                  </tr>
                  {extraItems.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-2 text-center text-gray-500">{idx + 2}</td>
                      <td className="p-2">
                        <Combobox
                          value={row.chungLoai}
                          onValueChange={(value) => updateRow(row.id, 'chungLoai', value)}
                          placeholder="Nhập hoặc chọn chủng loại"
                          options={categories.map((c) => ({
                            label: c.tenLoai || c.tenChungLoai || c.maLoai || c.id || '',
                            value: c.id
                          }))}
                          allowCustom={true}
                        />
                      </td>
                      <td className="p-2">
                        <Input type="number" className="h-9 border-gray-200" value={row.soLuong} onChange={(e) => updateRow(row.id, 'soLuong', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input className="h-9 bg-gray-50 border-gray-200" value={row.donVi} readOnly />
                      </td>
                      <td className="p-2">
                        <Input type="number" className="h-9 border-gray-200 bg-gray-50 text-gray-600" value={row.donGia} readOnly />
                      </td>
                      <td className="p-2">
                        <div className="font-semibold text-green-600">{Number(row.thanhTien).toLocaleString('vi-VN')}</div>
                      </td>
                      <td className="p-2 text-center">
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700" onClick={() => removeRow(row.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Các field dưới bảng */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Kho nhập</Label>
                <Select value={formData.khoNhap} onValueChange={(value) => handleInputChange('khoNhap', value)}>
                  <SelectTrigger><SelectValue placeholder="Chọn kho nhập" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => <SelectItem key={w.id} value={w.loaiKho ?? w.maKho ?? w.id}>{w.tenKho}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Người nhập</Label>
                <Combobox
                  value={formData.nguoiNhap}
                  onValueChange={(value) => handleInputChange('nguoiNhap', value)}
                  placeholder="Tìm kiếm và chọn người nhập..."
                  options={systemUsers.map(u => ({ 
                    label: `${u.fullName} - ${u.msnv} (${u.department})`, 
                    value: u.fullName 
                  }))}
                  allowCustom={false}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Ghi chú</Label>
                <Textarea value={formData.ghiChu} onChange={(e) => handleInputChange('ghiChu', e.target.value)} placeholder="Ghi chú thêm (tùy chọn)" rows={2} />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white">➕ Thêm Phiếu Nhập</Button>
        </form>
      </div>
    </div>
  );
}
