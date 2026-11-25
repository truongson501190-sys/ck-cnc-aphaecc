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
import { WarehouseTransaction, WarehouseTransactionItem } from '@/types/inventory';
import { useAuth } from '@/contexts/AuthContext';
import { Category } from '@/types/categories';
import { Combobox } from '@/components/ui/combobox';
import { getSystemUsers, type SystemUser } from '@/hooks/useSystemUsers';
import { getWarehouses, getProducts } from '@/api/warehouse';
import { format } from 'date-fns';

interface WarehouseImportProps {
  onSubmit?: (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => void | Promise<void>;
  onSuccess?: () => void;
}

export function WarehouseImport({ onSubmit, onSuccess }: WarehouseImportProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; tenKho: string; maKho: string }>>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);

  const [soPhieu, setSoPhieu] = useState('');
  const [ngayNhap, setNgayNhap] = useState(new Date().toISOString().split('T')[0]);
  const [khoNhap, setKhoNhap] = useState('');
  const [nguoiNhap, setNguoiNhap] = useState('');
  const [nhaCungCap, setNhaCungCap] = useState('');
  const [ghiChu, setGhiChu] = useState('');

  const [mainItem, setMainItem] = useState({
    chungLoai: '',
    soLuong: '',
    donVi: '',
    donGia: '',
    thanhTien: '0',
  });

  const [extraItems, setExtraItems] = useState<Array<{
    id: string;
    chungLoai: string;
    soLuong: string;
    donVi: string;
    donGia: string;
    thanhTien: string;
  }>>([]);

  const generatePhieuNumber = () => {
    const dateStr = format(new Date(), 'yyyyMMdd');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `NK${dateStr}${randomNum}`;
  };

  useEffect(() => {
    setSoPhieu(generatePhieuNumber());
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      setSystemUsers(getSystemUsers());

      const [whResult, toolsResult] = await Promise.all([
        getWarehouses(),
        getProducts(),
      ]);

      if (whResult.ok) {
        setWarehouses(
          whResult.data.map((w) => ({
            id: w.id,
            tenKho: w.tenKho,
            maKho: w.maKho,
          }))
        );
      } else {
        console.warn('loadData: warehouses failed', whResult.error);
      }

      if (toolsResult.ok) {
        const mapped: Category[] = toolsResult.data.map((t) => ({
          id: t.id,
          maLoai: t.ma_dao || t.id,
          tenLoai: t.ten_dao,
          tenChungLoai: t.ten_dao,
          donVi: t.don_vi || '',
          gia: t.gia || 0,
          createdAt: '',
        }));
        setCategories(mapped);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const findCategoryByValue = (value: string) => {
    return categories.find(
      (cat) =>
        cat.maLoai === value ||
        cat.id === value ||
        cat.tenLoai === value ||
        cat.tenChungLoai === value
    );
  };

  const addRow = () => {
    setExtraItems([
      ...extraItems,
      {
        id: Date.now().toString(),
        chungLoai: '',
        soLuong: '',
        donVi: '',
        donGia: '',
        thanhTien: '0',
      },
    ]);
  };

  const removeRow = (id: string) => {
    setExtraItems(extraItems.filter((item) => item.id !== id));
  };

  const updateRow = (id: string, field: string, value: string) => {
    setExtraItems((prev) =>
      prev.map((item) => {
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
      })
    );
  };

  const handleMainItemChange = (field: string, value: string) => {
    setMainItem((prev) => {
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

    const allItemsRaw = [
      {
        chungLoai: mainItem.chungLoai,
        soLuong: mainItem.soLuong,
        donVi: mainItem.donVi,
        donGia: mainItem.donGia,
        thanhTien: mainItem.thanhTien,
      },
      ...extraItems.filter((i) => i.chungLoai && i.soLuong),
    ];

    const items: WarehouseTransactionItem[] = allItemsRaw
      .map((item, idx) => {
        const cat = findCategoryByValue(item.chungLoai);
        const qty = parseFloat(item.soLuong) || 0;
        const price = parseFloat(item.donGia) || 0;
        return {
          id: `item-${Date.now()}-${idx}`,
          category_id: cat?.maLoai || cat?.id || item.chungLoai,
          itemId: cat?.maLoai || cat?.id || item.chungLoai,
          itemName: cat?.tenChungLoai || cat?.tenLoai || item.chungLoai,
          quantity: qty,
          unit: item.donVi,
          price,
          totalValue: qty * price,
          ghiChu: '',
        };
      })
      .filter((it) => it.quantity > 0);

    if (items.length === 0) {
      toast.error('Cần ít nhất 1 mặt hàng có số lượng > 0');
      return;
    }

    const operator =
      nguoiNhap ||
      user?.fullName ||
      user?.ho_ten ||
      user?.name ||
      user?.username ||
      '';

    const transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'> = {
      type: 'import',
      referenceNumber: soPhieu,
      transactionDate: ngayNhap,
      warehouse_id: khoNhap,
      supplier: nhaCungCap,
      notes: ghiChu,
      status: 'approved',
      created_by: operator,
      operator,
      items,
      reason: 'Nhập kho',
    };

    if (!onSubmit) {
      toast.error('onSubmit chưa được cấu hình');
      return;
    }

    try {
      await onSubmit(transaction);
      toast.success(`Đã ghi sổ nhập kho (${items.length} mặt hàng)`);
      onSuccess?.();

      setSoPhieu(generatePhieuNumber());
      setNgayNhap(new Date().toISOString().split('T')[0]);
      setKhoNhap('');
      setNguoiNhap('');
      setNhaCungCap('');
      setGhiChu('');
      setMainItem({ chungLoai: '', soLuong: '', donVi: '', donGia: '', thanhTien: '0' });
      setExtraItems([]);
    } catch (error) {
      console.error('submit error', error);
      toast.error('Lỗi khi ghi sổ nhập kho');
    }
  };

  return (
    <div className="max-w-7xl mx-auto bg-white">
      <div className="bg-gradient-to-r from-green-400 to-blue-500 text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-semibold">➕ Phiếu Nhập Kho</h2>
      </div>

      <div className="p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border">
            <div>
              <Label>Số phiếu *</Label>
              <Input value={soPhieu} readOnly className="bg-gray-100" />
            </div>
            <div>
              <Label>Ngày nhập *</Label>
              <DateInput value={ngayNhap} onChange={setNgayNhap} required />
            </div>
            <div>
              <Label>Kho nhập *</Label>
              <Select value={khoNhap || ''} onValueChange={setKhoNhap}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn kho" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.tenKho}>
                      {w.tenKho}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Người nhập</Label>
              <Combobox
                value={nguoiNhap}
                onValueChange={setNguoiNhap}
                placeholder="Chọn người nhập..."
                options={systemUsers.map((u) => ({
                  label: `${u.fullName} - ${u.msnv}`,
                  value: u.fullName,
                }))}
                allowCustom={false}
              />
            </div>
            <div>
              <Label>Nhà cung cấp</Label>
              <Input
                value={nhaCungCap}
                onChange={(e) => setNhaCungCap(e.target.value)}
                placeholder="Tên nhà cung cấp"
              />
            </div>
            <div>
              <Label>Ghi chú chung</Label>
              <Textarea
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                rows={2}
                placeholder="Ghi chú"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Danh sách vật tư</h3>
              <Button
                type="button"
                onClick={addRow}
                size="sm"
                className="bg-green-500 hover:bg-green-600"
              >
                <Plus className="w-4 h-4 mr-1" /> Thêm dòng
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 w-10">STT</th>
                    <th>Chủng loại *</th>
                    <th className="w-24">Số lượng *</th>
                    <th className="w-20">Đơn vị</th>
                    <th className="w-32">Đơn giá</th>
                    <th className="w-32">Thành tiền</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  <tr>
                    <td className="p-2 text-center">1</td>
                    <td>
                      <Combobox
                        value={mainItem.chungLoai}
                        onValueChange={(v) => handleMainItemChange('chungLoai', v)}
                        placeholder="Chọn hoặc nhập"
                        options={categories.map((c) => ({
                          label: c.tenLoai || c.tenChungLoai || '',
                          value: c.id,
                        }))}
                        allowCustom
                      />
                    </td>
                    <td>
                      <Input
                        type="number"
                        value={mainItem.soLuong}
                        onChange={(e) => handleMainItemChange('soLuong', e.target.value)}
                      />
                    </td>
                    <td>
                      <Input value={mainItem.donVi} readOnly className="bg-gray-50" />
                    </td>
                    <td>
                      <Input value={mainItem.donGia} readOnly className="bg-gray-50" />
                    </td>
                    <td className="font-semibold text-green-600">
                      {Number(mainItem.thanhTien).toLocaleString('vi-VN')}
                    </td>
                    <td>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setMainItem({ chungLoai: '', soLuong: '', donVi: '', donGia: '', thanhTien: '0' })
                        }
                      >
                        X
                      </Button>
                    </td>
                  </tr>
                  {extraItems.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="p-2 text-center">{idx + 2}</td>
                      <td>
                        <Combobox
                          value={row.chungLoai}
                          onValueChange={(v) => updateRow(row.id, 'chungLoai', v)}
                          placeholder="Chọn hoặc nhập"
                          options={categories.map((c) => ({
                            label: c.tenLoai || c.tenChungLoai || '',
                            value: c.id,
                          }))}
                          allowCustom
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          value={row.soLuong}
                          onChange={(e) => updateRow(row.id, 'soLuong', e.target.value)}
                        />
                      </td>
                      <td>
                        <Input value={row.donVi} readOnly className="bg-gray-50" />
                      </td>
                      <td>
                        <Input value={row.donGia} readOnly className="bg-gray-50" />
                      </td>
                      <td className="font-semibold text-green-600">
                        {Number(row.thanhTien).toLocaleString('vi-VN')}
                      </td>
                      <td>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(row.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white"
          >
            ➕ Thêm Phiếu Nhập
          </Button>
        </form>
      </div>
    </div>
  );
}