// src/modules/warehouse/components/WarehouseExport.tsx
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
import { WarehouseTransaction, WarehouseTransactionItem } from '@/types/inventory';
import { useAuth } from '@/contexts/AuthContext';
import { Category, Warehouse, Project, Employee } from '@/types/categories';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getSystemUsers, type SystemUser } from '@/hooks/useSystemUsers';
import {
  getAllowedWarehousesByDepartment,
  getWarehouseDisplayName,
  validateWarehouseSelection,
} from '@/lib/warehousePermissions';
import { useOnHandByProduct } from '@/shared/hooks/useInventory';
import { getWarehouses, getProducts } from '@/api/warehouse';
import { getSupabase } from '@/supabase';

interface WarehouseExportProps {
  onSubmit?: (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => void | Promise<void>;
  onSuccess?: () => void;
}

export function WarehouseExport({ onSubmit, onSuccess }: WarehouseExportProps) {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [selectedUserDepartment, setSelectedUserDepartment] = useState<string>('');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ tenChungLoai: '', donVi: '', gia: '' });
  
  const [soPhieu, setSoPhieu] = useState('');
  const [ngayXuat, setNgayXuat] = useState(new Date().toISOString().split('T')[0]);
  const [duAn, setDuAn] = useState('');
  const [khoXuat, setKhoXuat] = useState('');
  const [nguoiXuat, setNguoiXuat] = useState('');
  const [nguoiNhan, setNguoiNhan] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  
  const [mainItem, setMainItem] = useState({ chungLoai: '', soLuong: '', donVi: '' });
  const [extraItems, setExtraItems] = useState<Array<{ id: string; chungLoai: string; soLuong: string; donVi: string }>>([]);

  const { data: onHandByProduct = [] } = useOnHandByProduct();
  const stockByProductId = useMemo(() => {
    const map = new Map<string, number>();
    onHandByProduct.forEach((row) => map.set(row.productId, row.quantityOnHand));
    return map;
  }, [onHandByProduct]);

  const generatePhieuNumber = () => {
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `XK${dateStr}${randomNum}`;
  };

  useEffect(() => {
    setSoPhieu(generatePhieuNumber());
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      setSystemUsers(getSystemUsers());
      const whResult = await getWarehouses();
      if (whResult.ok) {
        setWarehouses(whResult.data.map(w => ({ id: w.id, tenKho: w.tenKho, maKho: w.maKho, loaiKho: w.maKho, diaChi: '', createdAt: '' })));
      }
      const toolsResult = await getProducts();
      if (toolsResult.ok) {
        setCategories(toolsResult.data.map(t => ({ id: t.id, maLoai: t.ma_dao || t.id, tenLoai: t.ten_dao, tenChungLoai: t.ten_dao, donVi: t.don_vi || '', gia: t.gia || 0, createdAt: '' })));
      }
      const client = getSupabase();
      if (client) {
        const { data: projData } = await client.from('projects').select('*');
        if (projData) {
          setProjects(projData.map((p: any) => ({ id: p.id, maDuAn: p.maDuAn, tenDuAn: p.tenDuAn, tenKhachHang: p.khach_hang, ghiChu: p.ghiChu, createdAt: p.createdAt })));
        }
      }
      const savedEmployees = localStorage.getItem('employees');
      if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
    } catch (error) { console.error(error); }
  };

  const findCategoryByValue = (value: string) => {
    return categories.find(cat => cat.id === value || cat.maLoai === value || cat.maChungLoai === value || cat.tenLoai === value || cat.tenChungLoai === value);
  };

  const handleAddCategory = () => {
    if (!newCategory.tenChungLoai || !newCategory.donVi) { toast.error('Vui lòng nhập tên và đơn vị'); return; }
    const categoryToAdd: Category = {
      id: Date.now().toString(), maLoai: Date.now().toString(), tenLoai: newCategory.tenChungLoai,
      tenChungLoai: newCategory.tenChungLoai, donVi: newCategory.donVi, gia: parseFloat(newCategory.gia) || 0, createdAt: new Date().toISOString()
    };
    setCategories([...categories, categoryToAdd]);
    setMainItem(prev => ({ ...prev, chungLoai: categoryToAdd.maLoai || '', donVi: categoryToAdd.donVi || '' }));
    setIsAddCategoryOpen(false); setNewCategory({ tenChungLoai: '', donVi: '', gia: '' });
    toast.success('Đã thêm chủng loại mới');
  };

  const addRow = () => setExtraItems([...extraItems, { id: Date.now().toString(), chungLoai: '', soLuong: '', donVi: '' }]);
  const removeRow = (id: string) => setExtraItems(extraItems.filter(i => i.id !== id));

  const updateRow = (id: string, field: string, value: string) => {
    setExtraItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'chungLoai') {
        const selected = findCategoryByValue(value);
        if (selected) updated.donVi = selected.donVi;
      }
      return updated;
    }));
  };

  const handleMainItemChange = (field: string, value: string) => {
    setMainItem(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'chungLoai') {
        const selected = findCategoryByValue(value);
        if (selected) updated.donVi = selected.donVi;
      }
      return updated;
    });
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'nguoiXuat') {
      const selectedUser = systemUsers.find(u => u.fullName === value || u.msnv === value);
      if (selectedUser) { setSelectedUserDepartment(selectedUser.department); setKhoXuat(''); }
      else { setSelectedUserDepartment(''); setKhoXuat(''); }
      setNguoiXuat(value);
    } else if (field === 'duAn') setDuAn(value);
    else if (field === 'khoXuat') setKhoXuat(value);
    else if (field === 'nguoiNhan') setNguoiNhan(value);
    else if (field === 'ghiChu') setGhiChu(value);
    else if (field === 'ngayXuat') setNgayXuat(value);
  };

  const resetForm = () => {
    setSoPhieu(generatePhieuNumber()); setNgayXuat(new Date().toISOString().split('T')[0]);
    setDuAn(''); setKhoXuat(''); setNguoiXuat(''); setNguoiNhan(''); setGhiChu('');
    setSelectedUserDepartment(''); setMainItem({ chungLoai: '', soLuong: '', donVi: '' }); setExtraItems([]);
  };

  const projectOptions = useMemo(() => {
    const uniqueMap = new Map();
    projects.forEach(p => {
      const val = p.maDuAn || p.id;
      if (!uniqueMap.has(val)) uniqueMap.set(val, { label: `${p.maDuAn || p.id} - ${p.tenKhachHang || p.tenDuAn}`, value: val });
    });
    return Array.from(uniqueMap.values());
  }, [projects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainItem.chungLoai || !mainItem.soLuong || !khoXuat || !duAn || !nguoiNhan || !nguoiXuat) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (*)'); return;
    }
    if (selectedUserDepartment) {
      const validation = validateWarehouseSelection(selectedUserDepartment, khoXuat);
      if (!validation.valid) { toast.error(validation.message); return; }
    }

    const allItemsRaw = [{ ...mainItem }, ...extraItems.filter(i => i.chungLoai && i.soLuong)];
    const items: WarehouseTransactionItem[] = allItemsRaw.map((item, idx) => {
      const cat = findCategoryByValue(item.chungLoai);
      const qty = parseFloat(item.soLuong) || 0;
      return {
        id: `item-${Date.now()}-${idx}`, category_id: cat?.maLoai || cat?.id || item.chungLoai,
        itemId: cat?.maLoai || cat?.id || item.chungLoai, itemName: cat?.tenChungLoai || cat?.tenLoai || item.chungLoai,
        quantity: qty, unit: item.donVi, price: 0, totalValue: 0, ghiChu: '',
      };
    }).filter(i => i.quantity > 0);

    if (items.length === 0) { toast.error('Cần ít nhất 1 mặt hàng có số lượng > 0'); return; }

    const transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'> = {
      type: 'export', referenceNumber: soPhieu, transactionDate: ngayXuat, warehouse_id: khoXuat, project_id: duAn, recipient: nguoiNhan, operator: nguoiXuat, created_by: nguoiXuat, status: 'pending', notes: ghiChu, items
    };

    if (!onSubmit) return;
    try {
      await onSubmit(transaction);
      toast.success(`Đã tạo phiếu xuất (${items.length} mặt hàng)`);
      onSuccess?.(); resetForm();
    } catch (error) { toast.error('Lỗi khi tạo phiếu xuất kho'); }
  };

  return (
    <div className="max-w-7xl mx-auto bg-white">
      <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-semibold">➖ Phiếu Xuất Kho</h2>
      </div>
      <div className="p-6 space-y-6 bg-white">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div><Label className="font-semibold text-gray-800">Số phiếu *</Label><Input value={soPhieu} readOnly className="bg-gray-200 text-black font-bold border-gray-300" /></div>
            <div><Label className="font-semibold text-gray-800">Ngày xuất *</Label><DateInput value={ngayXuat} onChange={setNgayXuat} required className="bg-white text-black border-gray-300" /></div>
            <div className="md:col-span-2"><Label className="font-semibold text-gray-800">Dự án *</Label>
              <Combobox value={duAn} onValueChange={v => handleInputChange('duAn', v)} placeholder="Nhập hoặc chọn mã dự án..." options={projectOptions} allowCustom={true} />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Danh sách vật tư</h3>
              <div className="flex gap-2">
                <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                  <DialogTrigger asChild><Button type="button" variant="outline" size="sm" className="border-gray-300 text-gray-700"><Plus className="w-4 h-4 mr-1" /> Thêm chủng loại</Button></DialogTrigger>
                  <DialogContent className="bg-white text-black"><DialogHeader><DialogTitle>Thêm chủng loại</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Tên chủng loại" value={newCategory.tenChungLoai} onChange={e => setNewCategory({...newCategory, tenChungLoai: e.target.value})} className="bg-white border-gray-300 text-black" /><div className="grid grid-cols-2 gap-4"><Input placeholder="Đơn vị tính" value={newCategory.donVi} onChange={e => setNewCategory({...newCategory, donVi: e.target.value})} className="bg-white border-gray-300 text-black" /><Input type="number" placeholder="Đơn giá" value={newCategory.gia} onChange={e => setNewCategory({...newCategory, gia: e.target.value})} className="bg-white border-gray-300 text-black" /></div><Button onClick={handleAddCategory} className="w-full bg-blue-600 text-white">Lưu</Button></div></DialogContent>
                </Dialog>
                <Button type="button" onClick={addRow} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white"><Plus className="w-4 h-4 mr-1" /> Thêm dòng</Button>
              </div>
            </div>
            
            {/* BỎ OVERFLOW-HIDDEN ĐỂ DROPDOWN KHÔNG BỊ CẮT */}
            <div className="border rounded-lg border-gray-300 relative">
              <table className="w-full text-sm">
                <thead className="bg-gray-200 text-gray-800">
                  <tr>
                    <th className="p-3 w-10 text-center">STT</th>
                    <th className="p-3 text-left">Chủng loại *</th>
                    <th className="p-3 w-24 text-center">Số lượng *</th>
                    <th className="p-3 w-20 text-center">Đơn vị</th>
                    <th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  <tr className="hover:bg-gray-50">
                    <td className="p-2 text-center text-black font-medium">1</td>
                    <td className="p-2"><Combobox value={mainItem.chungLoai} onValueChange={v => handleMainItemChange('chungLoai', v)} placeholder="Chọn hoặc nhập" options={categories.map(c => ({ label: `${c.tenLoai || c.tenChungLoai} `, value: c.id }))} allowCustom={false} /></td>
                    <td className="p-2"><Input type="number" value={mainItem.soLuong} onChange={e => handleMainItemChange('soLuong', e.target.value)} className="bg-white text-black border-gray-300 text-center" /></td>
                    <td className="p-2"><Input value={mainItem.donVi} readOnly className="bg-gray-100 text-black border-gray-300 text-center" /></td>
                    <td className="p-2 text-center"><Button type="button" variant="ghost" size="sm" onClick={() => setMainItem({ chungLoai: '', soLuong: '', donVi: '' })}><span className="text-red-500 font-bold">X</span></Button></td>
                  </tr>
                  {extraItems.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="p-2 text-center text-black font-medium">{idx+2}</td>
                      <td className="p-2"><Combobox value={row.chungLoai} onValueChange={v => updateRow(row.id, 'chungLoai', v)} placeholder="Chọn" options={categories.map(c => ({ label: `${c.tenLoai || c.tenChungLoai} `, value: c.id }))} allowCustom={false} /></td>
                      <td className="p-2"><Input type="number" value={row.soLuong} onChange={e => updateRow(row.id, 'soLuong', e.target.value)} className="bg-white text-black border-gray-300 text-center" /></td>
                      <td className="p-2"><Input value={row.donVi} readOnly className="bg-gray-100 text-black border-gray-300 text-center" /></td>
                      <td className="p-2 text-center"><Button type="button" variant="ghost" size="sm" onClick={() => removeRow(row.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div><Label className="font-semibold text-gray-800">Người xuất *</Label>
                <Combobox value={nguoiXuat} onValueChange={v => handleInputChange('nguoiXuat', v)} placeholder="Chọn người xuất..." options={systemUsers.map(u => ({ label: `${u.fullName} - ${u.msnv} (${u.department})`, value: u.fullName }))} allowCustom={true} />
              </div>
              <div><Label className="font-semibold text-gray-800">Kho xuất *{selectedUserDepartment && <span className="text-xs ml-2 text-orange-600">BP: {selectedUserDepartment}</span>}</Label>
                <Select value={khoXuat} onValueChange={v => handleInputChange('khoXuat', v)}>
                  <SelectTrigger className="bg-white text-black border-gray-300"><SelectValue placeholder="Chọn kho xuất" /></SelectTrigger>
                  <SelectContent className="bg-white text-black z-[9999]">
                    {(selectedUserDepartment ? getAllowedWarehousesByDepartment(selectedUserDepartment) : Array.from(new Set(warehouses.map(w => w.loaiKho)))).map((code, idx) => (
                      <SelectItem key={`${code}-${idx}`} value={code || ''} className="text-black">{getWarehouseDisplayName(code)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="font-semibold text-gray-800">Người nhận *</Label>
                <Input type="text" value={nguoiNhan} onChange={(e) => handleInputChange('nguoiNhan', e.target.value)} placeholder="Tên người nhận" className="bg-white text-black border-gray-300" list="nguoiNhanList" />
                <datalist id="nguoiNhanList">{employees.map((e, idx) => <option key={idx} value={e.ten_nhan_vien} />)}</datalist>
              </div>
            </div>
            <div><Label className="font-semibold text-gray-800">Ghi chú</Label><Textarea value={ghiChu} onChange={e => setGhiChu(e.target.value)} rows={2} placeholder="Ghi chú" className="bg-white text-black border-gray-300" /></div>
          </div>
          <Button type="submit" className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-6 text-lg shadow-md">📤 Tạo Phiếu Xuất</Button>
        </form>
      </div>
    </div>
  );
}