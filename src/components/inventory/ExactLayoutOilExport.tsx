import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Download } from 'lucide-react';
import { WarehouseTransaction, WarehouseTransactionItem } from '@/types/inventory';
import { useAuth } from '@/contexts/AuthContext';
import { Category, Machine, Employee } from '@/types/categories';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { getSavedCategories } from '@/lib/utils';

interface ExactLayoutOilExportProps {
  onSubmit: (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => void;
}

export function ExactLayoutOilExport({ onSubmit }: ExactLayoutOilExportProps) {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({
    tenChungLoai: '',
    donVi: 'Lít',
    gia: ''
  });
  
  const [headerData, setHeaderData] = useState({
    ngayXuat: new Date().toISOString().split('T')[0],
    mayMoc: '',
    nguoiVanHanh: '',
    trangThaiBanDau: '',
    ghiChu: ''
  });

  const [items, setItems] = useState<WarehouseTransactionItem[]>([
    {
      id: Date.now().toString(),
      itemId: '',
      itemName: '',
      quantity: 0,
      unit: '',
      price: 0,
      totalValue: 0,
      ghiChu: ''
    }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      setCategories(getSavedCategories());
      const savedMachines = localStorage.getItem('machines');
      if (savedMachines) {
        const parsed = JSON.parse(savedMachines);
        if (Array.isArray(parsed)) setMachines(parsed);
      }
      // Load employees from category management
      const savedEmployees = localStorage.getItem('employees');
      if (savedEmployees) {
        const parsed = JSON.parse(savedEmployees);
        if (Array.isArray(parsed)) setEmployees(parsed);
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
      tenChungLoai: newCategory.tenChungLoai,
      donVi: newCategory.donVi,
      gia: parseFloat(newCategory.gia) || 0,
      createdAt: new Date().toISOString()
    };
    const savedCategories = localStorage.getItem('categoryTypes');
    const allCategories: Category[] = savedCategories ? JSON.parse(savedCategories) : [];
    allCategories.push(categoryToAdd);
    localStorage.setItem('categoryTypes', JSON.stringify(allCategories));
    setCategories(prev => [...prev, categoryToAdd]);
    setIsAddCategoryOpen(false);
    setNewCategory({ tenChungLoai: '', donVi: 'Lít', gia: '' });
    toast.success('Đã thêm loại dầu mới');
  };

  const handleAddItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      itemId: '',
      itemName: '',
      quantity: 0,
      unit: '',
      price: 0,
      totalValue: 0,
      ghiChu: ''
    }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      toast.error('Phải có ít nhất một dòng vật tư');
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof WarehouseTransactionItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'itemId') {
          const selectedCategory = categories.find(cat => cat.id === value || cat.maLoai === value);
          if (selectedCategory) {
            updatedItem.itemName = selectedCategory.tenLoai || selectedCategory.tenChungLoai || selectedCategory.maLoai || selectedCategory.id;
            updatedItem.unit = selectedCategory.donVi;
            updatedItem.price = selectedCategory.gia || 0;
            updatedItem.totalValue = (updatedItem.quantity || 0) * (updatedItem.price || 0);
          }
        }
        if (field === 'itemName') {
          // When itemName is changed (from combobox), try to find and auto-fill unit and price
          const selectedCategory = categories.find(cat =>
            cat.tenLoai === value ||
            cat.tenChungLoai === value ||
            cat.maLoai === value ||
            cat.id === value
          );
          if (selectedCategory) {
            updatedItem.unit = selectedCategory.donVi;
            updatedItem.price = selectedCategory.gia || 0;
            updatedItem.totalValue = (updatedItem.quantity || 0) * (updatedItem.price || 0);
          }
          updatedItem.itemId = value; // Set itemId to the manual name for consistency
        }
        if (field === 'quantity' || field === 'price') {
          updatedItem.totalValue = (updatedItem.quantity || 0) * (updatedItem.price || 0);
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerData.mayMoc || items.some(item => !item.itemId || item.quantity <= 0)) {
      toast.error('Vui lòng chọn máy móc và vật tư');
      return;
    }

    // Validate nguoiVanHanh if provided
    if (headerData.nguoiVanHanh && !employees.find(e => e.ten_nhan_vien === headerData.nguoiVanHanh)) {
      toast.error('Vui lòng chọn người nhận từ danh sách');
      return;
    }

    const totalValue = items.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    const selectedMachine = machines.find(m => m.id === headerData.mayMoc);
    
    const transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'> = {
      type: 'oil_export',
      items: items,
      totalValue: totalValue,
      machineId: headerData.mayMoc,
      reason: `Xuất dầu cho máy ${selectedMachine?.tenMay || headerData.mayMoc}`,
      referenceNumber: `DM${Date.now()}`,
      operator: user?.name || headerData.nguoiVanHanh,
      status: 'pending',
      transactionDate: headerData.ngayXuat,
      notes: headerData.ghiChu,
      trangThaiBanDau: headerData.trangThaiBanDau
    };

    const newItem = {
      id: Date.now(),
      ...headerData,
      items: [...items],
      totalValue,
      createdAt: new Date().toLocaleString('vi-VN')
    };

    onSubmit(transaction);
    setItems([{
      id: Date.now().toString(),
      itemId: '',
      itemName: '',
      quantity: 0,
      unit: '',
      price: 0,
      totalValue: 0,
      ghiChu: ''
    }]);
    setHeaderData({
      ...headerData,
      trangThaiBanDau: '',
      ghiChu: ''
    });
    toast.success('Đã thêm phiếu xuất dầu thành công!');
  };

  return (
    <div className="max-w-7xl mx-auto bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-400 to-yellow-500 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">🛢️ Phiếu Xuất Dầu Mỡ (Nhiều Loại)</h2>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 bg-gray-50 p-4 rounded-lg border">
            <div>
              <Label className="text-sm font-medium">Ngày xuất *</Label>
              <DateInput value={headerData.ngayXuat} onChange={(value: string) => setHeaderData({...headerData, ngayXuat: value})} required />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">🛢️ Danh sách dầu mỡ <Badge variant="secondary">{items.length}</Badge></h3>
              <div className="flex gap-2">
                <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                  <DialogTrigger asChild><Button type="button" variant="outline" size="sm" className="text-blue-600 border-blue-200"><Plus className="w-4 h-4 mr-1" /> Thêm loại dầu mới</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>Thêm loại dầu mỡ mới</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2"><Label>Tên loại dầu/mỡ *</Label><Input value={newCategory.tenChungLoai} onChange={(e) => setNewCategory({...newCategory, tenChungLoai: e.target.value})} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Đơn vị *</Label><Input value={newCategory.donVi} onChange={(e) => setNewCategory({...newCategory, donVi: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Đơn giá</Label><Input type="number" value={newCategory.gia} onChange={(e) => setNewCategory({...newCategory, gia: e.target.value})} /></div>
                      </div>
                      <Button className="w-full" onClick={handleAddCategory}>Lưu</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button type="button" onClick={handleAddItem} variant="default" size="sm" className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-1" /> Thêm dòng</Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="p-2 text-left w-10">STT</th>
                    <th className="p-2 text-left">Loại dầu *</th>
                    <th className="p-2 text-left w-24">Số lượng *</th>
                    <th className="p-2 text-left w-20">Đơn vị</th>
                    <th className="p-2 text-left w-32">Đơn giá</th>
                    <th className="p-2 text-left w-32">Thành tiền</th>
                    <th className="p-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-2 text-center text-gray-500">{index + 1}</td>
                      <td className="p-2">
                        <Combobox
                          value={item.itemId}
                          onValueChange={(v) => handleItemChange(item.id, 'itemId', v)}
                          placeholder="Chọn chủng loại..."
                          options={categories.map(c => ({
                            label: c.tenLoai || c.tenChungLoai || c.maLoai || c.id,
                            value: c.id
                          }))}
                          allowCustom={true}
                        />
                      </td>
                      <td className="p-2"><Input type="number" className="h-9 border-gray-200" value={item.quantity || ''} onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))} /></td>
                      <td className="p-2"><Input className="h-9 bg-gray-50 border-gray-200" value={item.unit} readOnly /></td>
                      <td className="p-2"><Input type="number" className="h-9 border-gray-200 bg-gray-50 text-gray-600" value={item.price || ''} readOnly /></td>
                      <td className="p-2"><div className="font-semibold text-orange-600">{(item.totalValue || 0).toLocaleString('vi-VN')}</div></td>
                      <td className="p-2 text-center">
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600" onClick={() => handleRemoveItem(item.id)}><Trash2 className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-orange-50 font-bold border-t border-orange-100">
                  <tr><td colSpan={5} className="p-3 text-right text-orange-800">Tổng cộng xuất dầu:</td><td className="p-3 text-orange-700 text-lg">{(totalValue || 0).toLocaleString('vi-VN')} VND</td><td></td></tr>
                </tfoot>
              </table>
            </div>
            
            {/* Moved fields: Máy móc sử dụng, Người vận hành, Ghi chú (trạng thái ban đầu) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Máy móc sử dụng *</Label>
                <Combobox
                  value={headerData.mayMoc}
                  onValueChange={(value) => setHeaderData({...headerData, mayMoc: value})}
                  placeholder="Chọn hoặc nhập máy..."
                  options={machines.map(m => ({
                    label: m.tenMay || m.maMay || m.id,
                    value: m.id
                  }))}
                  allowCustom={true}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Người nhận</Label>
                <Combobox
                  value={headerData.nguoiVanHanh}
                  onValueChange={(value) => setHeaderData({...headerData, nguoiVanHanh: value})}
                  placeholder="Tìm kiếm và chọn người nhận..."
                  options={employees.map(e => ({ label: `${e.ten_nhan_vien} - ${e.msnv}`, value: e.ten_nhan_vien }))}
                  allowCustom={false}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Ghi chú</Label>
                <Input 
                  placeholder="VD: Mức dầu thấp, máy bình thường..." 
                  value={headerData.trangThaiBanDau} 
                  onChange={(e) => setHeaderData({...headerData, trangThaiBanDau: e.target.value})} 
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-lg font-bold shadow-lg">💾 Lưu Phiếu Xuất Dầu</Button>
        </form>
      </div>
    </div>
  );
}
