// src/modules/warehouse/components/WarehouseTransfer.tsx
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { WarehouseTransaction } from '@/types/inventory';
import { useAuth } from '@/contexts/AuthContext';
import { Category, Warehouse, Employee } from '@/types/categories';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getSavedCategories } from '@/lib/utils';
import { getSystemUsers, type SystemUser } from '@/hooks/useSystemUsers';
import { useOnHandByProduct } from '@/shared/hooks/useInventory';

interface WarehouseTransferProps {
  onSubmit?: (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => void | Promise<void>;
  onSuccess?: () => void;
}

export function WarehouseTransfer({ onSubmit, onSuccess }: WarehouseTransferProps) {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ tenChungLoai: '', donVi: '', gia: '' });
  
  const [soPhieu, setSoPhieu] = useState('');
  const [ngayChuyen, setNgayChuyen] = useState(new Date().toISOString().split('T')[0]);
  const [khoXuat, setKhoXuat] = useState('');
  const [khoNhap, setKhoNhap] = useState('');
  const [nguoiThucHien, setNguoiThucHien] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  
  const [mainItem, setMainItem] = useState({
    chungLoai: '',
    soLuong: '',
    donVi: ''
  });
  const [extraItems, setExtraItems] = useState<Array<{ id: string; chungLoai: string; soLuong: string; donVi: string }>>([]);

  const { data: onHandByProduct = [] } = useOnHandByProduct();
  const stockByProductId = useMemo(() => {
    const map = new Map<string, number>();
    onHandByProduct.forEach((row) => map.set(row.productId, row.quantityOnHand));
    return map;
  }, [onHandByProduct]);

  const getCurrentStock = (categoryId: string) => {
    const cat = categories.find(
      (c) => c.id === categoryId || c.maLoai === categoryId || c.maChungLoai === categoryId
    );
    const keys = [categoryId, cat?.id, cat?.maLoai, cat?.maChungLoai].filter(Boolean) as string[];
    for (const key of keys) {
      const qty = stockByProductId.get(key);
      if (qty !== undefined) return qty;
    }
    return 0;
  };

  const generatePhieuNumber = () => {
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CK${dateStr}${randomNum}`;
  };

  useEffect(() => {
    loadData();
    setSoPhieu(generatePhieuNumber());
  }, []);

  const loadData = () => {
    try {
      setCategories(getSavedCategories());
      setSystemUsers(getSystemUsers());

      const savedWarehouses = localStorage.getItem('warehouses') || localStorage.getItem('category_warehouses');
      if (savedWarehouses) {
        const parsed = JSON.parse(savedWarehouses);
        if (Array.isArray(parsed)) {
          const uniqueMap = new Map();
          parsed.forEach((w: any) => {
            const code = w.maKho || w.loaiKho || w.tenKho;
            if (!uniqueMap.has(code)) {
              uniqueMap.set(code, {
                id: w.id,
                tenKho: w.tenKho,
                maKho: w.maKho || w.loaiKho || w.tenKho,
                loaiKho: w.maKho || w.loaiKho || w.tenKho,
                diaChi: w.diaChi,
                createdAt: w.createdAt || new Date().toISOString()
              });
            }
          });
          setWarehouses(Array.from(uniqueMap.values()));
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

  const findCategoryByValue = (value: string) => {
    return categories.find(cat =>
      cat.id === value || cat.maLoai === value || cat.maChungLoai === value ||
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
    setMainItem(prev => ({ ...prev, chungLoai: categoryToAdd.maLoai || '', donVi: categoryToAdd.donVi || '' }));
    setIsAddCategoryOpen(false);
    setNewCategory({ tenChungLoai: '', donVi: '', gia: '' });
    toast.success('Đã thêm chủng loại mới');
  };

  const addRow = () => {
    setExtraItems([...extraItems, { id: Date.now().toString(), chungLoai: '', soLuong: '', donVi: '' }]);
  };
  const removeRow = (id: string) => setExtraItems(extraItems.filter(i => i.id !== id));

  const updateRow = (id: string, field: string, value: string) => {
    setExtraItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'chungLoai') {
        const selected = findCategoryByValue(value);
        if (selected) {
          updated.donVi = selected.donVi;
        }
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
        }
      }
      return updated;
    });
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'nguoiThucHien') setNguoiThucHien(value);
    else if (field === 'khoXuat') setKhoXuat(value);
    else if (field === 'khoNhap') setKhoNhap(value);
    else if (field === 'ghiChu') setGhiChu(value);
    else if (field === 'ngayChuyen') setNgayChuyen(value);
  };

  const resetForm = () => {
    setSoPhieu(generatePhieuNumber());
    setNgayChuyen(new Date().toISOString().split('T')[0]);
    setKhoXuat('');
    setKhoNhap('');
    setNguoiThucHien('');
    setGhiChu('');
    setMainItem({ chungLoai: '', soLuong: '', donVi: '' });
    setExtraItems([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainItem.chungLoai || !mainItem.soLuong || !khoXuat || !khoNhap || !nguoiThucHien) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (*)');
      return;
    }
    if (khoXuat === khoNhap) {
      toast.error('Kho xuất và kho nhập phải khác nhau');
      return;
    }

    const baseTransaction = (item: any, cat: Category | undefined, idx: number): Omit<WarehouseTransaction, 'id' | 'createdAt'> => ({
      type: 'transfer',
      itemId: Date.now().toString() + idx,
      itemName: cat?.tenChungLoai || item.chungLoai,
      quantity: parseFloat(item.soLuong),
      unit: item.donVi,
      price: 0,
      totalValue: 0,
      fromLocation: khoXuat,
      toLocation: khoNhap,
      reason: 'Chuyển kho',
      referenceNumber: soPhieu,
      operator: nguoiThucHien,
      status: 'pending',
      transactionDate: ngayChuyen,
      notes: ghiChu
    });

    const allItems = [
      { chungLoai: mainItem.chungLoai, soLuong: mainItem.soLuong, donVi: mainItem.donVi },
      ...extraItems.filter(i => i.chungLoai && i.soLuong)
    ];
    const transactions = allItems.map((item, idx) => baseTransaction(item, findCategoryByValue(item.chungLoai), idx));

    if (onSubmit) {
      try {
        for (const trans of transactions) await onSubmit(trans);
        toast.success(`Đã ghi sổ chuyển kho (${transactions.length} mặt hàng)`);
        onSuccess?.();
        resetForm();
      } catch (error) {
        toast.error('Lỗi khi ghi sổ chuyển kho');
      }
    } else {
      try {
        const existing = JSON.parse(localStorage.getItem('warehouseTransactions') || '[]');
        const newTransactions = transactions.map(t => ({ ...t, id: Date.now().toString() + Math.random(), createdAt: new Date().toISOString() }));
        localStorage.setItem('warehouseTransactions', JSON.stringify([...existing, ...newTransactions]));
        const existingTransfers = JSON.parse(localStorage.getItem('warehouseTransfers') || '[]');
        existingTransfers.push({
          soPhieu, ngayChuyen, khoXuat, khoNhap, nguoiThucHien, ghiChu,
          items: transactions.map(t => ({ tenChungLoai: t.itemName, soLuong: t.quantity, donVi: t.unit })),
          createdAt: new Date().toISOString(),
          status: 'pending'
        });
        localStorage.setItem('warehouseTransfers', JSON.stringify(existingTransfers));
        toast.success('Đã lưu phiếu chuyển kho thành công!');
        onSuccess?.();
        resetForm();
      } catch (error) {
        toast.error('Lỗi khi lưu phiếu chuyển kho');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto bg-white">
      <div className="bg-gradient-to-r from-purple-400 to-indigo-500 text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-semibold">🔄 Phiếu Chuyển Kho</h2>
      </div>
      <div className="p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
            <div><Label>Số phiếu *</Label><Input value={soPhieu} readOnly className="bg-gray-100" /></div>
            <div><Label>Ngày chuyển *</Label><DateInput value={ngayChuyen} onChange={setNgayChuyen} required /></div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Danh sách vật tư</h3>
              <div className="flex gap-2">
                <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                  <DialogTrigger asChild><Button type="button" variant="outline" size="sm"><Plus className="w-4 h-4 mr-1" /> Thêm chủng loại</Button></DialogTrigger>
                  <DialogContent><DialogHeader><DialogTitle>Thêm chủng loại</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Tên chủng loại" value={newCategory.tenChungLoai} onChange={e => setNewCategory({...newCategory, tenChungLoai: e.target.value})} /><div className="grid grid-cols-2 gap-4"><Input placeholder="Đơn vị tính" value={newCategory.donVi} onChange={e => setNewCategory({...newCategory, donVi: e.target.value})} /><Input type="number" placeholder="Đơn giá" value={newCategory.gia} onChange={e => setNewCategory({...newCategory, gia: e.target.value})} /></div><Button onClick={handleAddCategory} className="w-full">Lưu</Button></div></DialogContent>
                </Dialog>
                <Button type="button" onClick={addRow} size="sm" className="bg-purple-500 hover:bg-purple-600"><Plus className="w-4 h-4 mr-1" /> Thêm dòng</Button>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 w-10">STT</th>
                    <th className="p-2">Chủng loại *</th>
                    <th className="p-2 w-24">Số lượng *</th>
                    <th className="p-2 w-20">Đơn vị</th>
                    <th className="p-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  <tr className="hover:bg-gray-50">
                    <td className="p-2 text-center">1</td>
                    <td className="p-2">
                      <Combobox
                        value={mainItem.chungLoai}
                        onValueChange={v => handleMainItemChange('chungLoai', v)}
                        placeholder="Chọn hoặc nhập"
                        options={categories.map(c => ({ label: `${c.tenLoai || c.tenChungLoai} `, value: c.id }))}
                        allowCustom={false}
                      />
                    </td>
                    <td className="p-2">
                      <Input type="number" value={mainItem.soLuong} onChange={e => handleMainItemChange('soLuong', e.target.value)} />
                    </td>
                    <td className="p-2">
                      <Input value={mainItem.donVi} readOnly className="bg-gray-50" />
                    </td>
                    <td className="p-2 text-center">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setMainItem({ chungLoai: '', soLuong: '', donVi: '' })}>X</Button>
                    </td>
                  </tr>
                  {extraItems.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="p-2 text-center">{idx+2}</td>
                      <td className="p-2">
                        <Combobox
                          value={row.chungLoai}
                          onValueChange={v => updateRow(row.id, 'chungLoai', v)}
                          placeholder="Chọn"
                          options={categories.map(c => ({ label: `${c.tenLoai || c.tenChungLoai} `, value: c.id }))}
                          allowCustom={false}
                        />
                      </td>
                      <td className="p-2">
                        <Input type="number" value={row.soLuong} onChange={e => updateRow(row.id, 'soLuong', e.target.value)} />
                      </td>
                      <td className="p-2">
                        <Input value={row.donVi} readOnly className="bg-gray-50" />
                      </td>
                      <td className="p-2 text-center">
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(row.id)}><Trash2 className="w-4 h-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border">
              <div><Label>Kho xuất *</Label>
                <Select value={khoXuat} onValueChange={v => handleInputChange('khoXuat', v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn kho xuất" /></SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(warehouses.map(w => w.loaiKho))).map((code, idx) => (
                      <SelectItem key={`${code}-${idx}`} value={code || ''}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Kho nhập *</Label>
                <Select value={khoNhap} onValueChange={v => handleInputChange('khoNhap', v)}>
                  <SelectTrigger><SelectValue placeholder="Chọn kho nhập" /></SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(warehouses.map(w => w.loaiKho))).map((code, idx) => (
                      <SelectItem key={`${code}-${idx}`} value={code || ''}>{code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Người thực hiện *</Label>
                <Combobox 
                  value={nguoiThucHien} 
                  onValueChange={v => handleInputChange('nguoiThucHien', v)} 
                  placeholder="Nhập hoặc chọn người thực hiện..." 
                  options={systemUsers.map(u => ({ label: `${u.fullName} - ${u.msnv} (${u.department})`, value: u.fullName }))} 
                  allowCustom={true}
                />
              </div>
            </div>
            <div><Label>Ghi chú</Label><Textarea value={ghiChu} onChange={e => setGhiChu(e.target.value)} rows={2} placeholder="Ghi chú" /></div>
          </div>
          <Button type="submit" className="w-full bg-purple-500 hover:bg-purple-600 text-white">🔄 Thêm Phiếu Chuyển</Button>
        </form>
      </div>
    </div>
  );
}