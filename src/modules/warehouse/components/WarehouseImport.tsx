// src/modules/warehouse/components/WarehouseImport.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { WarehouseTransaction } from '@/types/inventory';
import { useAuth } from '@/contexts/AuthContext';
import { Category, Warehouse, Employee } from '@/types/categories';
import { getSavedCategories } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { getSystemUsers, type SystemUser } from '@/hooks/useSystemUsers';
import { format } from 'date-fns';

interface WarehouseImportProps {
  onSubmit?: (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => void | Promise<void>;
  onSuccess?: () => void;
}

export function WarehouseImport({ onSubmit, onSuccess }: WarehouseImportProps) {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ tenChungLoai: '', donVi: '', gia: '' });
  
  // Header fields
  const [soPhieu, setSoPhieu] = useState('');
  const [ngayNhap, setNgayNhap] = useState(new Date().toISOString().split('T')[0]);
  const [khoNhap, setKhoNhap] = useState('');
  const [nguoiNhap, setNguoiNhap] = useState('');
  const [nhaCungCap, setNhaCungCap] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  
  // Main item (dòng đầu)
  const [mainItem, setMainItem] = useState({
    chungLoai: '',
    soLuong: '',
    donVi: '',
    donGia: '',
    thanhTien: '0'
  });

  const [extraItems, setExtraItems] = useState<Array<{ id: string; chungLoai: string; soLuong: string; donVi: string; donGia: string; thanhTien: string }>>([]);

  const generatePhieuNumber = () => {
    const dateStr = format(new Date(), 'yyyyMMdd');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `NK${dateStr}${randomNum}`;
  };

  const resetForm = () => {
    setSoPhieu(generatePhieuNumber());
    setNgayNhap(new Date().toISOString().split('T')[0]);
    setKhoNhap('');
    setNguoiNhap('');
    setNhaCungCap('');
    setGhiChu('');
    setMainItem({ chungLoai: '', soLuong: '', donVi: '', donGia: '', thanhTien: '0' });
    setExtraItems([]);
  };

  useEffect(() => {
    loadData();
    setSoPhieu(generatePhieuNumber());
  }, []);

  useEffect(() => {
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadData = () => {
    try {
      setCategories(getSavedCategories());
      setSystemUsers(getSystemUsers());

      const savedWarehouses = localStorage.getItem('warehouses') || localStorage.getItem('category_warehouses');
      if (savedWarehouses) {
        const parsed = JSON.parse(savedWarehouses);
        if (Array.isArray(parsed)) {
          setWarehouses(parsed.map(w => ({
            id: w.id || `${w.maKho || w.tenKho}-${Math.random().toString(36).slice(2, 8)}`,
            tenKho: w.tenKho,
            loaiKho: w.maKho || w.loaiKho || w.tenKho,
            diaChi: w.diaChi,
            createdAt: w.createdAt || new Date().toISOString()
          })));
        }
      }

      const savedEmployees = localStorage.getItem('employees');
      if (savedEmployees) {
        const parsed = JSON.parse(savedEmployees);
        if (Array.isArray(parsed)) setEmployees(parsed);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const findCategoryByValue = (value: string) => {
    return categories.find(cat =>
      cat.maLoai === value || cat.maChungLoai === value || cat.id === value ||
      cat.tenLoai === value || cat.tenChungLoai === value
    );
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
    
    setMainItem(prev => ({ ...prev, chungLoai: categoryToAdd.maLoai || '', donVi: categoryToAdd.donVi || '', donGia: (categoryToAdd.gia || 0).toString() }));
    setIsAddCategoryOpen(false);
    setNewCategory({ tenChungLoai: '', donVi: '', gia: '' });
    toast.success('Đã thêm chủng loại mới');
  };

  const addRow = () => {
    setExtraItems([...extraItems, { id: Date.now().toString(), chungLoai: '', soLuong: '', donVi: '', donGia: '', thanhTien: '0' }]);
  };

  const removeRow = (id: string) => {
    setExtraItems(extraItems.filter(item => item.id !== id));
  };

  const updateRow = (id: string, field: string, value: string) => {
    setExtraItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'chungLoai') {
        const selected = findCategoryByValue(value);
        if (selected) {
          updated.donVi = selected.donVi;
          updated.donGia = (selected.gia || 0).toString();
        }
      }
      if (field === 'soLuong') {
        const sl = parseFloat(value) || 0;
        const dg = parseFloat(updated.donGia) || 0;
        updated.thanhTien = (sl * dg).toString();
      }
      return updated;
    }));
  };

  const handleMainItemChange = (field: string, value: string) => {
    setMainItem(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'chungLoai') {
        const selected = findCategoryByValue(value);
        if (selected) {
          updated.donVi = selected.donVi;
          updated.donGia = (selected.gia || 0).toString();
        }
      }
      if (field === 'soLuong' || field === 'donGia') {
        const sl = parseFloat(field === 'soLuong' ? value : updated.soLuong) || 0;
        const dg = parseFloat(field === 'donGia' ? value : updated.donGia) || 0;
        updated.thanhTien = (sl * dg).toString();
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mainItem.chungLoai || !mainItem.soLuong || !khoNhap) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (*)');
      return;
    }

    if (nguoiNhap && !systemUsers.find(u => u.fullName === nguoiNhap) && !employees.find(e => e.ten_nhan_vien === nguoiNhap)) {
      toast.error('Vui lòng chọn người nhập từ danh sách');
      return;
    }

    const selectedCat = findCategoryByValue(mainItem.chungLoai);
    const baseTransaction = (item: any, cat: Category | undefined, idx: number): Omit<WarehouseTransaction, 'id' | 'createdAt'> => ({
      type: 'import',
      itemId: Date.now().toString() + idx,
      itemName: cat?.tenChungLoai || item.chungLoai,
      quantity: parseFloat(item.soLuong),
      unit: item.donVi,
      price: parseFloat(item.donGia) || 0,
      totalValue: parseFloat(item.thanhTien) || 0,
      toLocation: khoNhap,
      reason: 'Nhập kho',
      referenceNumber: soPhieu,
      operator: nguoiNhap || user?.fullName || user?.ho_ten || user?.name || user?.full_name || user?.username || '',
      status: 'pending',
      transactionDate: ngayNhap,
      notes: ghiChu,
      supplier: nhaCungCap
    });

    const allItems = [
      { chungLoai: mainItem.chungLoai, soLuong: mainItem.soLuong, donVi: mainItem.donVi, donGia: mainItem.donGia, thanhTien: mainItem.thanhTien },
      ...extraItems.filter(i => i.chungLoai && i.soLuong)
    ];

    const transactions = allItems.map((item, idx) => baseTransaction(item, findCategoryByValue(item.chungLoai), idx));

    if (onSubmit) {
      try {
        for (const trans of transactions) {
          await onSubmit(trans);
        }
        toast.success(`Đã ghi sổ nhập kho (${transactions.length} mặt hàng)`);
        onSuccess?.();
        resetForm();
      } catch (error) {
        toast.error('Lỗi khi ghi sổ nhập kho');
      }
    } else {
      try {
        const existing = JSON.parse(localStorage.getItem('warehouseTransactions') || '[]');
        const newTransactions = transactions.map(t => ({ ...t, id: Date.now().toString() + Math.random(), createdAt: new Date().toISOString() }));
        localStorage.setItem('warehouseTransactions', JSON.stringify([...existing, ...newTransactions]));

        const existingImports = JSON.parse(localStorage.getItem('warehouseImports') || '[]');
        existingImports.push({
          soPhieu, ngayNhap, khoNhap, nguoiNhap, nhaCungCap, ghiChu,
          items: transactions.map(t => ({ tenChungLoai: t.itemName, soLuong: t.quantity, donVi: t.unit, donGia: t.price, thanhTien: t.totalValue })),
          tongTien: transactions.reduce((sum, t) => sum + (t.totalValue ?? 0), 0),
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('warehouseImports', JSON.stringify(existingImports));
        toast.success('Đã lưu phiếu nhập kho thành công!');
        onSuccess?.();
        resetForm();
      } catch (error) {
        toast.error('Lỗi khi lưu phiếu nhập kho');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto bg-white">
      <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-semibold">➕ Phiếu Nhập Kho</h2>
      </div>

      <div className="p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border">
            <div><Label>Số phiếu *</Label><Input value={soPhieu} readOnly className="bg-gray-100" /></div>
            <div><Label>Ngày nhập *</Label><DateInput value={ngayNhap} onChange={setNgayNhap} required /></div>
            <div><Label>Kho nhập *</Label><Select value={khoNhap || ''} onValueChange={setKhoNhap}><SelectTrigger><SelectValue placeholder="Chọn kho" /></SelectTrigger><SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={String(w.loaiKho ?? w.id ?? '')}>{w.tenKho}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Người nhập</Label><Combobox value={nguoiNhap} onValueChange={setNguoiNhap} placeholder="Chọn người nhập..." options={systemUsers.map(u => ({ label: `${u.fullName} - ${u.msnv}`, value: u.fullName }))} allowCustom={false} /></div>
            <div><Label>Nhà cung cấp</Label><Input value={nhaCungCap} onChange={e => setNhaCungCap(e.target.value)} placeholder="Tên nhà cung cấp" /></div>
            <div><Label>Ghi chú chung</Label><Textarea value={ghiChu} onChange={e => setGhiChu(e.target.value)} rows={2} placeholder="Ghi chú" /></div>
          </div>

          {/* Items Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Danh sách vật tư</h3>
              <div className="flex gap-2">
                <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                  <DialogTrigger asChild><Button type="button" variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> Thêm chủng loại</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>Thêm chủng loại</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Tên chủng loại" value={newCategory.tenChungLoai} onChange={e => setNewCategory({...newCategory, tenChungLoai: e.target.value})} /><div className="grid grid-cols-2 gap-4"><Input placeholder="Đơn vị tính" value={newCategory.donVi} onChange={e => setNewCategory({...newCategory, donVi: e.target.value})} /><Input type="number" placeholder="Đơn giá" value={newCategory.gia} onChange={e => setNewCategory({...newCategory, gia: e.target.value})} /></div><Button onClick={handleAddCategory} className="w-full">Lưu</Button></div></DialogContent>
                </Dialog>
                <Button type="button" onClick={addRow} size="sm" className="bg-green-500 hover:bg-green-600"><Plus className="w-4 h-4 mr-1" /> Thêm dòng</Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr><th className="p-2 w-10">STT</th><th>Chủng loại *</th><th className="w-24">Số lượng *</th><th className="w-20">Đơn vị</th><th className="w-32">Đơn giá</th><th className="w-32">Thành tiền</th><th className="w-10"></th></tr>
                </thead>
                <tbody className="divide-y bg-white">
                  <tr><td className="p-2 text-center">1</td>
                    <td className="p-2"><Combobox value={mainItem.chungLoai} onValueChange={v => handleMainItemChange('chungLoai', v)} placeholder="Chọn hoặc nhập" options={categories.map(c => ({ label: c.tenLoai || c.tenChungLoai || '', value: c.id }))} allowCustom /></td>
                    <td className="p-2"><Input type="number" value={mainItem.soLuong} onChange={e => handleMainItemChange('soLuong', e.target.value)} /></td>
                    <td className="p-2"><Input value={mainItem.donVi} readOnly className="bg-gray-50" /></td>
                    <td className="p-2"><Input value={mainItem.donGia} readOnly className="bg-gray-50" /></td>
                    <td className="p-2"><div className="font-semibold text-green-600">{Number(mainItem.thanhTien).toLocaleString('vi-VN')}</div></td>
                    <td className="p-2 text-center"><Button type="button" variant="ghost" size="sm" onClick={() => setMainItem({ chungLoai: '', soLuong: '', donVi: '', donGia: '', thanhTien: '0' })}>X</Button></td>
                  </tr>
                  {extraItems.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="p-2 text-center">{idx+2}</td>
                      <td className="p-2"><Combobox value={row.chungLoai} onValueChange={v => updateRow(row.id, 'chungLoai', v)} placeholder="Chọn hoặc nhập" options={categories.map(c => ({ label: c.tenLoai || c.tenChungLoai || '', value: c.id }))} allowCustom /></td>
                      <td className="p-2"><Input type="number" value={row.soLuong} onChange={e => updateRow(row.id, 'soLuong', e.target.value)} /></td>
                      <td className="p-2"><Input value={row.donVi} readOnly className="bg-gray-50" /></td>
                      <td className="p-2"><Input value={row.donGia} readOnly className="bg-gray-50" /></td>
                      <td className="p-2"><div className="font-semibold text-green-600">{Number(row.thanhTien).toLocaleString('vi-VN')}</div></td>
                      <td className="p-2 text-center"><Button type="button" variant="ghost" size="sm" onClick={() => removeRow(row.id)}><Trash2 className="w-4 h-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white">➕ Thêm Phiếu Nhập</Button>
        </form>
      </div>
    </div>
  );
}