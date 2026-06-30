import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { WarehouseTransaction, WarehouseTransactionItem } from '@/types/inventory';
import { useAuth } from '@/contexts/AuthContext';
import { Category, Machine, Employee } from '@/types/categories';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getSavedCategories } from '@/lib/utils';
import { getSystemUsers, type SystemUser } from '@/hooks/useSystemUsers';

interface ConsumableExportProps {
  onSubmit?: (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => void | Promise<void>;
  onSuccess?: () => void;
}

export function ConsumableExport({ onSubmit, onSuccess }: ConsumableExportProps) {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ tenChungLoai: '', donVi: '', gia: '' });
  
  // Header fields
  const [soPhieu, setSoPhieu] = useState('');
  const [ngayXuat, setNgayXuat] = useState(new Date().toISOString().split('T')[0]);
  const [mayMoc, setMayMoc] = useState('');
  const [nguoiNhan, setNguoiNhan] = useState('');
  const [lyDo, setLyDo] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  
  // Items (có thể nhiều dòng vật tư)
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

  const generatePhieuNumber = () => {
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `VTTH${dateStr}${randomNum}`;
  };

  useEffect(() => {
    loadData();
    setSoPhieu(generatePhieuNumber());
  }, []);

  const loadData = () => {
    try {
      setCategories(getSavedCategories());
      setSystemUsers(getSystemUsers());

      const savedMachines = localStorage.getItem('machines') || localStorage.getItem('category_machines');
      if (savedMachines) {
        const parsed = JSON.parse(savedMachines);
        if (Array.isArray(parsed)) {
          setMachines(parsed.map(m => ({
            id: m.id,
            tenMay: m.tenMay || m.tenMayMoc || '',
            maMay: m.maMay || m.maMayMoc || '',
            status: m.status || 'active',
            createdAt: m.createdAt || new Date().toISOString()
          })));
        }
      }

      const savedEmployees = localStorage.getItem('employees');
      if (savedEmployees) {
        const parsed = JSON.parse(savedEmployees);
        if (Array.isArray(parsed)) setEmployees(parsed);
      }
    } catch (error) {
      console.error(error);
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
    const updated = [...categories, categoryToAdd];
    setCategories(updated);
    localStorage.setItem('category_items', JSON.stringify(updated.map(cat => ({
      id: cat.id,
      maChungLoai: cat.maLoai,
      tenChungLoai: cat.tenLoai,
      donViTinh: cat.donVi,
      donGia: cat.gia || '0'
    }))));
    setIsAddCategoryOpen(false);
    setNewCategory({ tenChungLoai: '', donVi: '', gia: '' });
    toast.success('Đã thêm vật tư tiêu hao mới');
  };

  const addItem = () => {
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

  const removeItem = (id: string) => {
    if (items.length === 1) {
      toast.error('Phải có ít nhất một loại vật tư');
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof WarehouseTransactionItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'itemId') {
        const selected = categories.find(cat => cat.id === value || cat.maLoai === value);
        if (selected) {
          updated.itemName = selected.tenLoai || selected.tenChungLoai || '';
          updated.unit = selected.donVi || '';
          updated.price = selected.gia || 0;
          updated.totalValue = (updated.quantity || 0) * (updated.price || 0);
        }
      }
      if (field === 'quantity' || field === 'price') {
        updated.totalValue = (updated.quantity || 0) * (updated.price || 0);
      }
      return updated;
    }));
  };

  const resetForm = () => {
    setSoPhieu(generatePhieuNumber());
    setNgayXuat(new Date().toISOString().split('T')[0]);
    setMayMoc('');
    setNguoiNhan('');
    setLyDo('');
    setGhiChu('');
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mayMoc) {
      toast.error('Vui lòng chọn máy móc hoặc bộ phận sử dụng');
      return;
    }
    if (items.some(item => !item.itemId || (item.quantity || 0) <= 0)) {
      toast.error('Vui lòng điền đầy đủ vật tư và số lượng');
      return;
    }

    const totalValue = items.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    // Sử dụng type 'export' nhưng lưu thêm thông tin là vật tư tiêu hao
    const baseTransaction: Omit<WarehouseTransaction, 'id' | 'createdAt'> = {
      type: 'export',
      itemId: Date.now().toString(),
      itemName: items.map(i => i.itemName).join(', '),
      quantity: items.reduce((sum, i) => sum + (i.quantity || 0), 0),
      unit: items[0]?.unit || '',
      price: totalValue / (items.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1),
      totalValue: totalValue,
      fromLocation: mayMoc,
      reason: lyDo || 'Xuất vật tư tiêu hao',
      referenceNumber: soPhieu,
      operator: nguoiNhan || user?.name || '',
      status: 'pending',
      transactionDate: ngayXuat,
      notes: `[VẬT TƯ TIÊU HAO] ${ghiChu} - Chi tiết: ${items.map(i => `${i.itemName} (${i.quantity} ${i.unit})`).join('; ')}`,
    };

    if (onSubmit) {
      try {
        await onSubmit(baseTransaction);
        toast.success(`Đã ghi sổ xuất vật tư tiêu hao (${items.length} loại)`);
        onSuccess?.();
        resetForm();
      } catch (error) {
        toast.error('Lỗi khi ghi sổ xuất vật tư');
      }
    } else {
      try {
        const existing = JSON.parse(localStorage.getItem('warehouseTransactions') || '[]');
        const newTransaction = { ...baseTransaction, id: Date.now().toString() + Math.random(), createdAt: new Date().toISOString() };
        localStorage.setItem('warehouseTransactions', JSON.stringify([...existing, newTransaction]));
        const existingConsumable = JSON.parse(localStorage.getItem('consumableExports') || '[]');
        existingConsumable.push({
          soPhieu, ngayXuat, mayMoc, nguoiNhan, lyDo, ghiChu,
          items: items,
          totalValue,
          createdAt: new Date().toISOString(),
          status: 'pending'
        });
        localStorage.setItem('consumableExports', JSON.stringify(existingConsumable));
        toast.success('Đã lưu phiếu xuất vật tư tiêu hao thành công!');
        onSuccess?.();
        resetForm();
      } catch (error) {
        toast.error('Lỗi khi lưu phiếu xuất vật tư');
      }
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.totalValue || 0), 0);

  return (
    <div className="max-w-7xl mx-auto bg-white">
      <div className="bg-gradient-to-r from-teal-400 to-green-500 text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-semibold">📦 Phiếu Xuất Vật Tư Tiêu Hao</h2>
      </div>
      <div className="p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
            <div><Label>Số phiếu *</Label><Input value={soPhieu} readOnly className="bg-gray-100" /></div>
            <div><Label>Ngày xuất *</Label><DateInput value={ngayXuat} onChange={setNgayXuat} required /></div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Danh sách vật tư</h3>
              <div className="flex gap-2">
                <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                  <DialogTrigger asChild><Button type="button" variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> Thêm vật tư</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>Thêm vật tư tiêu hao mới</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Tên vật tư" value={newCategory.tenChungLoai} onChange={e => setNewCategory({...newCategory, tenChungLoai: e.target.value})} /><div className="grid grid-cols-2 gap-4"><Input placeholder="Đơn vị tính" value={newCategory.donVi} onChange={e => setNewCategory({...newCategory, donVi: e.target.value})} /><Input type="number" placeholder="Đơn giá" value={newCategory.gia} onChange={e => setNewCategory({...newCategory, gia: e.target.value})} /></div><Button onClick={handleAddCategory} className="w-full">Lưu</Button></div></DialogContent>
                </Dialog>
                <Button type="button" onClick={addItem} size="sm" className="bg-teal-500 hover:bg-teal-600"><Plus className="w-4 h-4 mr-1" /> Thêm dòng</Button>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr><th className="p-2 w-10">STT</th><th>Vật tư *</th><th className="w-24">Số lượng *</th><th className="w-20">Đơn vị</th><th className="w-32">Đơn giá</th><th className="w-32">Thành tiền</th><th className="w-10"></th></tr></thead>
                <tbody className="divide-y bg-white">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-2 text-center">{idx+1}</td>
                      <td className="p-2"><Combobox value={item.itemId} onValueChange={v => updateItem(item.id, 'itemId', v)} placeholder="Chọn vật tư" options={categories.map(c => ({ label: c.tenLoai || c.tenChungLoai || '', value: c.id })).filter(opt => opt.label)} allowCustom={true} /></td>
                      <td className="p-2"><Input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))} /></td>
                      <td className="p-2"><Input value={item.unit} readOnly className="bg-gray-50" /></td>
                      <td className="p-2"><Input value={item.price} readOnly className="bg-gray-50" /></td>
                      <td className="p-2"><div className="font-semibold text-teal-600">{item.totalValue?.toLocaleString('vi-VN')}</div></td>
                      <td className="p-2 text-center"><Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)}><Trash2 className="w-4 h-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-teal-50">
                  <tr><td colSpan={5} className="p-2 text-right font-semibold">Tổng cộng:</td><td className="p-2 font-bold text-teal-700">{totalAmount.toLocaleString('vi-VN')} VND</td><td></td></tr>
                </tfoot>
              </table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border">
              <div><Label>Máy móc / Bộ phận sử dụng *</Label><Combobox value={mayMoc} onValueChange={setMayMoc} placeholder="Chọn máy hoặc nhập tên" options={machines.map(m => ({ label: `${m.tenMay || ''} ${m.maMay ? `(${m.maMay})` : ''}`, value: m.id })).filter(opt => opt.label.trim())} allowCustom={true} /></div>
              <div><Label>Người nhận</Label><Combobox value={nguoiNhan} onValueChange={setNguoiNhan} placeholder="Chọn người nhận" options={systemUsers.map(u => ({ label: u.fullName || '', value: u.fullName || '' })).filter(opt => opt.label)} allowCustom={true} /></div>
              <div><Label>Lý do xuất</Label><Input value={lyDo} onChange={e => setLyDo(e.target.value)} placeholder="Sản xuất, bảo trì, ..." /></div>
            </div>
            <div><Label>Ghi chú</Label><Textarea value={ghiChu} onChange={e => setGhiChu(e.target.value)} rows={2} /></div>
          </div>
          <Button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white">📦 Thêm Phiếu Xuất Vật Tư</Button>
        </form>
      </div>
    </div>
  );
}