import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Plus, Trash2, Download } from 'lucide-react';
import { WarehouseTransaction, WarehouseTransactionItem } from '@/types/inventory';
import { useAuth } from '@/hooks/useAuth';
import { Category, Machine, User } from '@/types/categories';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ExactLayoutOilExportProps {
  onSubmit: (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => void;
}

export function ExactLayoutOilExport({ onSubmit }: ExactLayoutOilExportProps) {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [users, setUsers] = useState<User[]>([]);
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

  const [dataList, setDataList] = useState<any[]>([]);
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const savedCategories = localStorage.getItem('categoryTypes');
      if (savedCategories) {
        const parsed = JSON.parse(savedCategories);
        if (Array.isArray(parsed)) {
          setCategories(parsed.filter((cat: any) => 
            (cat.tenLoai || cat.tenChungLoai || '').toLowerCase().includes('dầu') || 
            (cat.tenLoai || cat.tenChungLoai || '').toLowerCase().includes('oil') ||
            (cat.tenLoai || cat.tenChungLoai || '').toLowerCase().includes('mỡ')
          ).map((cat: any) => ({
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
      const savedMachines = localStorage.getItem('machines');
      if (savedMachines) {
        const parsed = JSON.parse(savedMachines);
        if (Array.isArray(parsed)) setMachines(parsed);
      }
      const savedUsers = localStorage.getItem('users');
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed)) setUsers(parsed);
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
    let allCategories: Category[] = savedCategories ? JSON.parse(savedCategories) : [];
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
          const selectedCategory = categories.find(cat => cat.id === value);
          if (selectedCategory) {
            updatedItem.itemName = selectedCategory.tenChungLoai;
            updatedItem.unit = selectedCategory.donVi;
            updatedItem.price = selectedCategory.gia;
            updatedItem.totalValue = updatedItem.quantity * updatedItem.price;
          }
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

    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
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

    setDataList([newItem, ...dataList]);
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

  const handleExportExcel = () => {
    if (dataList.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const exportData = dataList.flatMap(phieu => 
      phieu.items.map((item: any, index: number) => ({
        'STT': index + 1,
        'Ngày Xuất': phieu.ngayXuat,
        'Số Phiếu': phieu.id,
        'Máy Móc': machines.find(m => m.id === phieu.mayMoc)?.tenMay || phieu.mayMoc,
        'Người Vận Hành': phieu.nguoiVanHanh,
        'Trạng Thái Ban Đầu': phieu.trangThaiBanDau || '',
        'Loại Dầu': item.itemName,
        'Số Lượng': item.quantity,
        'Đơn Vị': item.unit,
        'Đơn Giá': item.price,
        'Thành Tiền': item.totalValue,
        'Ghi Chú': phieu.ghiChu || ''
      }))
    );

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'XuatDau');
    XLSX.writeFile(wb, `Bao_Cao_Xuat_Dau_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Đã xuất file Excel thành công');
  };

  return (
    <div className="max-w-7xl mx-auto bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-400 to-yellow-500 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">🛢️ Phiếu Xuất Dầu Mỡ (Nhiều Loại)</h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleExportExcel} className="text-white hover:bg-white/20">
              <Download className="w-4 h-4 mr-1" /> Xuất Excel
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowFilter(!showFilter)} className="text-white hover:bg-white/20">
              {showFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showFilter ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filter */}
      {showFilter && (
        <div className="bg-gray-50 p-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div><Label className="text-sm font-medium">Từ ngày</Label><Input type="date" className="w-full" /></div>
            <div><Label className="text-sm font-medium">Đến ngày</Label><Input type="date" className="w-full" /></div>
            <div><Label className="text-sm font-medium">Máy móc</Label>
              <Select><SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
              <SelectContent>{machines.map(m => <SelectItem key={m.id} value={m.id}>{m.tenMay}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="flex items-end"><Button type="button" variant="outline" size="sm" className="w-full">Đặt lại</Button></div>
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 bg-gray-50 p-4 rounded-lg border">
            <div>
              <Label className="text-sm font-medium">Ngày xuất *</Label>
              <Input type="date" value={headerData.ngayXuat} onChange={(e) => setHeaderData({...headerData, ngayXuat: e.target.value})} required />
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
                        <Select value={item.itemId} onValueChange={(v) => handleItemChange(item.id, 'itemId', v)}>
                          <SelectTrigger className="h-9 border-gray-200"><SelectValue placeholder="Chọn loại dầu..." /></SelectTrigger>
                          <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.tenChungLoai}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="p-2"><Input type="number" className="h-9 border-gray-200" value={item.quantity || ''} onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))} /></td>
                      <td className="p-2"><Input className="h-9 bg-gray-50 border-gray-200" value={item.unit} readOnly /></td>
                      <td className="p-2"><Input type="number" className="h-9 border-gray-200" value={item.price || ''} onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value))} /></td>
                      <td className="p-2"><div className="font-semibold text-orange-600">{item.totalValue.toLocaleString('vi-VN')}</div></td>
                      <td className="p-2 text-center">
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-600" onClick={() => handleRemoveItem(item.id)}><Trash2 className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-orange-50 font-bold border-t border-orange-100">
                  <tr><td colSpan={5} className="p-3 text-right text-orange-800">Tổng cộng xuất dầu:</td><td className="p-3 text-orange-700 text-lg">{items.reduce((sum, i) => sum + i.totalValue, 0).toLocaleString('vi-VN')} VND</td><td></td></tr>
                </tfoot>
              </table>
            </div>
            
            {/* Moved fields: Máy móc sử dụng, Người vận hành, Ghi chú (trạng thái ban đầu) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border">
              <div>
                <Label className="text-sm font-medium">Máy móc sử dụng *</Label>
                <Select value={headerData.mayMoc} onValueChange={(v) => setHeaderData({...headerData, mayMoc: v})}>
                  <SelectTrigger><SelectValue placeholder="Chọn máy" /></SelectTrigger>
                  <SelectContent>{machines.map(m => <SelectItem key={m.id} value={m.id}>{m.tenMay}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Người vận hành</Label>
                <Select value={headerData.nguoiVanHanh} onValueChange={(v) => setHeaderData({...headerData, nguoiVanHanh: v})}>
                  <SelectTrigger><SelectValue placeholder="Chọn người" /></SelectTrigger>
                  <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.hoTen}>{u.hoTen}</SelectItem>)}</SelectContent>
                </Select>
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

        <div className="space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2 text-gray-700">Các phiếu vừa tạo</h3>
          <div className="grid grid-cols-1 gap-4">
            {dataList.map((phieu) => (
              <div key={phieu.id} className="border border-orange-100 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-orange-700">Phiếu: {phieu.id}</div>
                    <div className="text-sm text-gray-500">
                      Ngày: {phieu.ngayXuat} | Máy: {machines.find(m => m.id === phieu.mayMoc)?.tenMay || phieu.mayMoc}
                    </div>
                    {phieu.trangThaiBanDau && (
                      <div className="text-xs text-blue-600 font-medium mt-1">
                        Trạng thái ban đầu: {phieu.trangThaiBanDau}
                      </div>
                    )}
                  </div>
                  <div className="text-right"><div className="font-bold text-orange-600 text-lg">{phieu.totalValue.toLocaleString('vi-VN')} VND</div><div className="text-xs text-gray-400">{phieu.createdAt}</div></div>
                </div>
                <div className="text-sm text-gray-600 bg-orange-50/50 p-2 rounded italic">Loại: {phieu.items.map((i: any) => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
