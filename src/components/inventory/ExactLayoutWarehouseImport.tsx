import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { WarehouseTransaction } from '@/types/inventory';
import { useAuth } from '@/hooks/useAuth';
import { Category, Warehouse, User, Project, Machine } from '@/types/categories';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ExactLayoutWarehouseImportProps {
  onSubmit: (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => void;
}

export function ExactLayoutWarehouseImport({ onSubmit }: ExactLayoutWarehouseImportProps) {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<User[]>([]);
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

  const [dataList, setDataList] = useState<any[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [extraItems, setExtraItems] = useState<Array<{ id: string; chungLoai: string; soLuong: string; donVi: string; donGia: string; thanhTien: string }>>([]);

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
          setCategories(parsedCategories.map((cat: any) => ({
            id: cat.id,
            maLoai: cat.maLoai || cat.tenChungLoai,
            tenLoai: cat.tenLoai || cat.tenChungLoai,
            tenChungLoai: cat.tenChungLoai || cat.tenLoai,
            donVi: cat.donVi,
            gia: cat.gia || parseFloat(cat.donGia) || 0,
            createdAt: cat.createdAt || new Date().toISOString()
          })));
        }
      }

      // Load warehouses from localStorage
      const savedWarehouses = localStorage.getItem('category_warehouses');
      if (savedWarehouses) {
        const parsedWarehouses = JSON.parse(savedWarehouses);
        if (Array.isArray(parsedWarehouses)) {
          setWarehouses(parsedWarehouses.map(w => ({
            id: w.id,
            tenKho: w.tenKho,
            loaiKho: w.maKho,
            diaChi: w.diaChi,
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

  const updateRow = (id: string, field: keyof { chungLoai: string; soLuong: string; donVi: string; donGia: string; thanhTien: string }, value: string) => {
    setExtraItems(extraItems.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'chungLoai') {
          const selectedCategory = categories.find(cat => cat.id === value);
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
      const selectedCategory = categories.find(cat => cat.id === value);
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
    
    if (!formData.chungLoai || !formData.soLuong || !formData.khoNhap) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (*)');
      return;
    }

    const newItem = {
      id: Date.now(),
      ...formData,
      createdAt: new Date().toLocaleString('vi-VN')
    };

    setDataList([...dataList, newItem]);

    const selectedCategory = categories.find(cat => cat.id === formData.chungLoai);
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
      {/* Header Lọc Và Chỉnh Sửa */}
      <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">✅ Lọc Và Chỉnh Sửa</h2>
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium">Người dùng</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.hoTen}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Sắp xếp</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Mới nhất" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Mới nhất</SelectItem>
                  <SelectItem value="oldest">Cũ nhất</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Hiển thị</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="25 bản ghi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 bản ghi</SelectItem>
                  <SelectItem value="50">50 bản ghi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm">📋 Đặt lại</Button>
              <Button type="button" variant="outline" size="sm" className="bg-blue-50">📊 Chỉnh sửa</Button>
              <Button type="button" variant="outline" size="sm" className="bg-green-50">📤 Xuất Excel</Button>
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
                    <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Button type="button" onClick={addRow} variant="default" size="sm" className="bg-green-500 hover:bg-green-600 ml-2">
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
                      <Select value={formData.chungLoai} onValueChange={(value) => handleInputChange('chungLoai', value)}>
                        <SelectTrigger className="h-9 border-gray-200"><SelectValue placeholder="Chọn chủng loại..." /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => {
                            const currentStock = getCurrentStock(c.id);
                            const isLowStock = currentStock <= (c.minimumStock || 0);
                            return (
                              <SelectItem key={c.id} value={c.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{c.tenChungLoai}</span>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className={isLowStock ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                      Tồn: {currentStock}
                                    </span>
                                    {isLowStock && <span className="text-red-600 font-medium">⚠️ Sắp hết</span>}
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
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
                        <Select value={row.chungLoai} onValueChange={(value) => updateRow(row.id, 'chungLoai', value)}>
                          <SelectTrigger className="h-9 border-gray-200"><SelectValue placeholder="Chọn chủng loại..." /></SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => {
                              const currentStock = getCurrentStock(c.id);
                              const isLowStock = currentStock <= (c.minimumStock || 0);
                              return (
                                <SelectItem key={c.id} value={c.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{c.tenChungLoai}</span>
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className={isLowStock ? 'text-red-600 font-medium' : 'text-gray-600'}>
                                        Tồn: {currentStock}
                                      </span>
                                      {isLowStock && <span className="text-red-600 font-medium">⚠️ Sắp hết</span>}
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
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
                    {warehouses.map((w) => <SelectItem key={w.id} value={w.tenKho}>{w.tenKho} ({w.loaiKho})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Người nhập</Label>
                <Select value={formData.nguoiNhap} onValueChange={(value) => handleInputChange('nguoiNhap', value)}>
                  <SelectTrigger><SelectValue placeholder="Chọn người nhập..." /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => <SelectItem key={u.id} value={u.hoTen}>{u.hoTen} - {u.msnv}</SelectItem>)}
                  </SelectContent>
                </Select>
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
