import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { WarehouseTransaction } from '@/types/inventory';
import { useAuth } from '@/hooks/useAuth';
import { Category, Warehouse, User, Project } from '@/types/categories';
import { Employee } from '@/types/categories';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getSavedCategories } from '@/lib/utils';

interface ExactLayoutWarehouseExportProps {
  onSubmit: (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => void;
}

export function ExactLayoutWarehouseExport({ onSubmit }: ExactLayoutWarehouseExportProps) {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    tenChungLoai: '',
    donVi: '',
    gia: ''
  });
  
  const [formData, setFormData] = useState({
    ngayXuat: new Date().toISOString().split('T')[0],
    duAn: '',
    chungLoai: '',
    soLuong: '',
    donVi: '',
    donGia: '',
    thanhTien: '0',
    khoXuat: '',
    nguoiXuat: '',
    nguoiNhan: '',
    ghiChu: ''
  });

  const [dataList, setDataList] = useState<any[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [extraItems, setExtraItems] = useState<Array<{ id: string; chungLoai: string; soLuong: string; donVi: string; donGia: string; thanhTien: string }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      setCategories(getSavedCategories());

      // Load warehouses from localStorage
      const savedWarehouses = localStorage.getItem('warehouses') || localStorage.getItem('category_warehouses');
      if (savedWarehouses) {
        const parsedWarehouses = JSON.parse(savedWarehouses);
        if (Array.isArray(parsedWarehouses)) {
          setWarehouses(parsedWarehouses.map(w => ({
            id: w.id,
            tenKho: w.tenKho,
            maKho: w.maKho || w.loaiKho || w.maKho || w.tenKho,
            loaiKho: w.maKho || w.loaiKho || w.maKho || w.tenKho,
            diaChi: w.diaChi,
            createdAt: w.createdAt || new Date().toISOString()
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

      // Load employees
      const savedEmployees = localStorage.getItem('employees');
      if (savedEmployees) {
        const parsedEmployees = JSON.parse(savedEmployees);
        if (Array.isArray(parsedEmployees)) {
          setEmployees(parsedEmployees);
        }
      }

      // Load projects from localStorage
      const savedProjects = localStorage.getItem('category_projects');
      if (savedProjects) {
        const parsedProjects = JSON.parse(savedProjects);
        if (Array.isArray(parsedProjects)) {
          setProjects(parsedProjects.map(p => ({
            id: p.id,
            tenKhachHang: p.tenDuAn,
            maDuAn: p.maDuAn,
            status: 'active' as const,
            createdAt: new Date().toISOString()
          })));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getCurrentStock = (categoryId: string) => {
    try {
      const transactions = JSON.parse(localStorage.getItem('warehouseTransactions') || '[]');
      
      // Load categories from both possible sources
      let allCategories: any[] = [];
      try {
        const categoryTypes = JSON.parse(localStorage.getItem('categoryTypes') || '[]');
        const categoryItems = JSON.parse(localStorage.getItem('category_items') || '[]');
        
        allCategories = [...categoryTypes, ...categoryItems.map((cat: any) => ({
          id: cat.id,
          maLoai: cat.maLoai || cat.tenChungLoai,
          tenLoai: cat.tenLoai || cat.tenChungLoai,
          tenChungLoai: cat.tenChungLoai || cat.tenLoai,
          donVi: cat.donVi || cat.donViTinh,
          minimumStock: cat.minimumStock || 0
        }))];
        
        // Remove duplicates
        allCategories = allCategories.filter((cat, index, self) => 
          index === self.findIndex(c => c.id === cat.id)
        );
      } catch (error) {
        console.error('Error loading categories for stock calculation:', error);
      }
      
      let currentStock = 0;

      transactions.forEach((transaction: any) => {
        if (transaction.items) {
          transaction.items.forEach((item: any) => {
            const category = allCategories.find(c => 
              c.tenLoai === item.itemName || 
              c.maLoai === item.itemName ||
              c.tenChungLoai === item.itemName
            );
            if (category && category.id === categoryId) {
              if (transaction.type === 'import') {
                currentStock += item.quantity;
              } else if (transaction.type === 'export' || transaction.type === 'oil_export') {
                currentStock -= item.quantity;
              }
            }
          });
        } else {
          // Handle old format
          const category = allCategories.find(c => 
            c.tenLoai === transaction.itemName ||
            c.tenChungLoai === transaction.itemName
          );
          if (category && category.id === categoryId) {
            if (transaction.type === 'import') {
              currentStock += transaction.quantity;
            } else if (transaction.type === 'export' || transaction.type === 'oil_export') {
              currentStock -= transaction.quantity;
            }
          }
        }
      });

      return currentStock;
    } catch (error) {
      console.error('Error calculating stock:', error);
      return 0;
    }
  };

  const handleAddCategory = () => {
    if (!newCategory.tenChungLoai || !newCategory.donVi) {
      toast.error('Vui lòng nhập tên và đơn vị');
      return;
    }

    const categoryToAdd: Category = {
      id: Date.now().toString(),
      tenChungLoai: newCategory.tenChungLoai,
      donVi: newCategory.donVi,
      gia: parseFloat(newCategory.gia) || 0,
      createdAt: new Date().toISOString()
    };

    const updatedCategories = [...categories, categoryToAdd];
    setCategories(updatedCategories);
    localStorage.setItem('categoryTypes', JSON.stringify(updatedCategories));
    
    setFormData(prev => ({ ...prev, chungLoai: categoryToAdd.id, donVi: categoryToAdd.donVi, donGia: categoryToAdd.gia.toString() }));
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

  const findCategoryByValue = (value: string) => {
    return categories.find(cat =>
      cat.id === value ||
      cat.maLoai === value ||
      cat.maChungLoai === value ||
      cat.tenLoai === value ||
      cat.tenChungLoai === value
    );
  };

  const updateRow = (id: string, field: keyof { chungLoai: string; soLuong: string; donVi: string; donGia: string; thanhTien: string }, value: string) => {
    setExtraItems(extraItems.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'chungLoai') {
          const selectedCategory = findCategoryByValue(value);
          if (selectedCategory) {
            updated.donVi = selectedCategory.donVi;
            updated.donGia = selectedCategory.gia.toString();
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

  const handleInputChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    
    // Auto-fill related fields when category is selected
    if (field === 'chungLoai') {
      const selectedCategory = findCategoryByValue(value);
      if (selectedCategory) {
        newData.donVi = selectedCategory.donVi;
        newData.donGia = selectedCategory.gia.toString();
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
    
    if (!formData.chungLoai || !formData.soLuong || !formData.khoXuat || !formData.duAn || !formData.nguoiNhan) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (*)');
      return;
    }

    // Validate nguoiNhan is valid employee
    const validEmployee = employees.find(e => e.msnv === formData.nguoiNhan);
    if (!validEmployee) {
      toast.error('Vui lòng chọn người nhận từ danh sách');
      return;
    }

    const newItem = {
      id: Date.now(),
      ...formData,
      createdAt: new Date().toLocaleString('vi-VN')
    };

    setDataList([...dataList, newItem]);

    const selectedCategory = findCategoryByValue(formData.chungLoai);
    const transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'> = {
      type: 'export',
      itemId: Date.now().toString(),
      itemName: selectedCategory?.tenChungLoai || formData.chungLoai,
      quantity: parseFloat(formData.soLuong),
      unit: formData.donVi,
      price: parseFloat(formData.donGia) || 0,
      totalValue: parseFloat(formData.thanhTien) || 0,
      fromLocation: formData.khoXuat,
      reason: formData.duAn ? `Xuất kho cho dự án ${formData.duAn}` : 'Xuất kho',
      referenceNumber: `XK${Date.now()}`,
      operator: user?.name || formData.nguoiXuat,
      recipient: formData.nguoiNhan,
      status: 'pending',
      transactionDate: formData.ngayXuat,
      notes: formData.ghiChu,
      projectId: formData.duAn
    };
    
    onSubmit(transaction);
    toast.success('Đã thêm phiếu xuất kho thành công!');
  };

  return (
    <div className="max-w-7xl mx-auto bg-white">
      {/* Header Lọc Và Chỉnh Sửa */}
      <div className="bg-gradient-to-r from-red-400 to-orange-500 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">📤 Phiếu Xuất Kho</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowFilter(!showFilter)}
            className="text-white hover:bg-white/20"
          >
            {showFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showFilter ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
          </Button>
        </div>
      </div>

      {/* Phần Filter - Có thể ẩn/hiện */}
      {showFilter && (
        <div className="bg-gray-50 p-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label className="text-sm font-medium">Từ ngày</Label>
              <Input type="date" className="w-full" />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Đến ngày</Label>
              <Input type="date" className="w-full" />
            </div>

            <div>
              <Label className="text-sm font-medium">Chủng loại</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.tenChungLoai}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Kho</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.tenKho}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-sm text-gray-600 mt-2">
            Hiển thị {dataList.length} bản ghi
          </div>
        </div>
      )}

      {/* Layout dầu: Header thông tin chính, bảng giữa, các field dưới bảng */}
      <div className="p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Info: chỉ ngày, Dự án */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
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
              <Label className="text-sm font-medium">Dự án *</Label>
              <Select value={formData.duAn} onValueChange={(value) => handleInputChange('duAn', value)}>
                <SelectTrigger className="bg-white border-gray-200">
                  <SelectValue placeholder="Chọn dự án..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.maDuAn}>
                      {p.maDuAn} - {p.tenKhachHang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items Section: bảng một dòng dùng formData */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Danh sách vật tư</h3>
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
                      <Input 
                        value={newCategory.tenChungLoai}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, tenChungLoai: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Đơn vị tính *</Label>
                        <Input 
                          value={newCategory.donVi}
                          onChange={(e) => setNewCategory(p => ({ ...p, donVi: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Đơn giá tham khảo (VND)</Label>
                        <Input 
                          type="number"
                          value={newCategory.gia}
                          onChange={(e) => setNewCategory(prev => ({ ...prev, gia: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <Button className="w-full" onClick={handleAddCategory}>💾 Lưu chủng loại</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <div>
                <Button type="button" onClick={addRow} variant="default" size="sm" className="bg-red-500 hover:bg-red-600 ml-2">
                  <Plus className="w-4 h-4 mr-1" /> Thêm dòng
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
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
                        placeholder="Tìm kiếm và chọn chủng loại..."
                        options={categories.map((c) => {
                          const currentStock = getCurrentStock(c.id);
                          const stockLabel = `Tồn: ${currentStock.toLocaleString('vi-VN')}`;
                          const lowStockLabel = currentStock <= (c.minimumStock || 0) ? ' - Sắp hết' : '';
                          return {
                            label: `${c.tenLoai || c.tenChungLoai || c.maLoai}${c.maLoai ? ` (${c.maLoai})` : ''} - ${stockLabel}${lowStockLabel}`,
                            value: c.id
                          };
                        })}
                        allowCustom={false}
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
                      <div className="font-semibold text-red-600">{Number(formData.thanhTien).toLocaleString('vi-VN')}</div>
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
                          placeholder="Tìm kiếm và chọn chủng loại..."
                          options={categories.map((c) => {
                            const currentStock = getCurrentStock(c.id);
                            const stockLabel = `Tồn: ${currentStock.toLocaleString('vi-VN')}`;
                            const lowStockLabel = currentStock <= (c.minimumStock || 0) ? ' - Sắp hết' : '';
                            return {
                              label: `${c.tenLoai || c.tenChungLoai || c.maLoai}${c.maLoai ? ` (${c.maLoai})` : ''} - ${stockLabel}${lowStockLabel}`,
                              value: c.id
                            };
                          })}
                          allowCustom={false}
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
                        <div className="font-semibold text-red-600">{Number(row.thanhTien).toLocaleString('vi-VN')}</div>
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
                <Label className="text-sm font-medium">Kho xuất *</Label>
                <Select value={formData.khoXuat} onValueChange={(value) => handleInputChange('khoXuat', value)}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Chọn kho xuất" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => <SelectItem key={w.id} value={w.tenKho}>{w.tenKho}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Người xuất *</Label>
                <Select value={formData.nguoiXuat} onValueChange={(value) => handleInputChange('nguoiXuat', value)}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Chọn người xuất..." /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => <SelectItem key={u.id} value={u.hoTen}>{u.hoTen} - {u.msnv}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Người nhận *</Label>
                <Combobox
                  value={formData.nguoiNhan}
                  onValueChange={(value) => handleInputChange('nguoiNhan', value)}
                  placeholder="Tìm kiếm và chọn người nhận..."
                  options={employees.map(e => ({ label: `${e.ten_nhan_vien} - ${e.msnv}`, value: e.msnv }))}
                  allowCustom={false}
                />
              </div>
            </div>

            {/* Ghi chú riêng biệt */}
            <div className="mt-4">
              <Label className="text-sm font-medium">Ghi chú</Label>
              <Textarea value={formData.ghiChu} onChange={(e) => handleInputChange('ghiChu', e.target.value)} placeholder="Ghi chú thêm (tùy chọn)" rows={2} className="bg-white" />
            </div>
          </div>

          <Button type="submit" className="w-full bg-red-500 hover:bg-red-600 text-white">📤 Thêm Phiếu Xuất</Button>
        </form>
      </div>
    </div>
  );
}
