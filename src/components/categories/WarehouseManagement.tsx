import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Package, Upload } from 'lucide-react';
import { Warehouse } from '@/types/categories';
import * as XLSX from 'xlsx';

export function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    maKho: '',
    tenKho: '',
    ghiChu: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadWarehouses();
    
    // Listen for sync events
    const handleSync = () => loadWarehouses();
    window.addEventListener('app-data-synced', handleSync);
    return () => window.removeEventListener('app-data-synced', handleSync);
  }, []);

  const loadWarehouses = () => {
    try {
      const saved = localStorage.getItem('warehouses');
      if (saved) {
        setWarehouses(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const saveWarehouses = (newWarehouses: Warehouse[]) => {
    try {
      localStorage.setItem('warehouses', JSON.stringify(newWarehouses));
      setWarehouses(newWarehouses);
    } catch (error) {
      console.error('Error saving warehouses:', error);
      toast.error('Lỗi khi lưu dữ liệu');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.maKho.trim() || !formData.tenKho.trim()) {
      toast.error('Vui lòng điền mã kho và tên kho');
      return;
    }

    // Check for duplicate code
    const isDuplicateMa = warehouses.some(w =>
      w.maKho === formData.maKho.trim() && w.id !== editingId
    );

    if (isDuplicateMa) {
      toast.error('Mã kho này đã tồn tại');
      return;
    }

    if (editingId) {
      const updatedWarehouses = warehouses.map(warehouse =>
        warehouse.id === editingId
          ? {
              ...warehouse,
              maKho: formData.maKho.trim(),
              tenKho: formData.tenKho.trim(),
              ghiChu: formData.ghiChu.trim()
            }
          : warehouse
      );
      saveWarehouses(updatedWarehouses);
      toast.success('Đã cập nhật kho thành công');
      setEditingId(null);
    } else {
      const newWarehouse: Warehouse = {
        id: Date.now().toString(),
        maKho: formData.maKho.trim(),
        tenKho: formData.tenKho.trim(),
        ghiChu: formData.ghiChu.trim(),
        createdAt: new Date().toISOString()
      };
      saveWarehouses([...warehouses, newWarehouse]);
      toast.success('Đã thêm kho mới thành công');
    }

    setFormData({
      maKho: '',
      tenKho: '',
      ghiChu: ''
    });
  };

  const handleEdit = (warehouse: Warehouse) => {
    setFormData({
      maKho: warehouse.maKho ?? '',
      tenKho: warehouse.tenKho,
      ghiChu: warehouse.ghiChu || ''
    });
    setEditingId(warehouse.id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa kho này?')) {
      const updatedWarehouses = warehouses.filter(warehouse => warehouse.id !== id);
      saveWarehouses(updatedWarehouses);
      toast.success('Đã xóa kho thành công');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      maKho: '',
      tenKho: '',
      ghiChu: ''
    });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet) as Record<string, unknown>[];

        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const currentWarehouses = [...warehouses];

        json.forEach(row => {
          // Normalize keys to support Vietnamese and English
          const maKho = (row.maKho || row['Mã kho'] || row['Mã Kho'] || '').toString().trim();
          const tenKho = (row.tenKho || row['Tên kho'] || row['Tên Kho'] || '').toString().trim();
          const ghiChu = (row.ghiChu || row['Ghi chú'] || row['Ghi Chú'] || '').toString().trim();

          if (!maKho || !tenKho) {
            skippedCount++;
            return;
          }

          const existingIndex = currentWarehouses.findIndex(w => w.maKho === maKho);
          
          if (existingIndex >= 0) {
            // Update existing
            currentWarehouses[existingIndex] = {
              ...currentWarehouses[existingIndex],
              tenKho,
              ghiChu: ghiChu || currentWarehouses[existingIndex].ghiChu
            };
            updatedCount++;
          } else {
            // Add new
            currentWarehouses.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              maKho,
              tenKho,
              ghiChu,
              createdAt: new Date().toISOString()
            });
            addedCount++;
          }
        });

        saveWarehouses(currentWarehouses);
        toast.success(`Đã import thành công: Thêm mới ${addedCount}, cập nhật ${updatedCount}. Bỏ qua ${skippedCount} dòng lỗi.`);
      } catch (error) {
        console.error('Error importing Excel:', error);
        toast.error('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.maKho?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warehouse.tenKho.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (warehouse.ghiChu && warehouse.ghiChu.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Kho</h2>
          <p className="text-gray-600">Quản lý thông tin các kho hàng trong hệ thống</p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          <Package className="w-4 h-4 mr-1" />
          {warehouses.length} kho
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {editingId ? 'Chỉnh sửa kho' : 'Thêm kho mới'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="maKho">Mã kho *</Label>
                  <Input
                    id="maKho"
                    value={formData.maKho}
                    onChange={(e) => setFormData({ ...formData, maKho: e.target.value })}
                    placeholder="VD: KHO001"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="tenKho">Tên kho *</Label>
                  <Input
                    id="tenKho"
                    value={formData.tenKho}
                    onChange={(e) => setFormData({ ...formData, tenKho: e.target.value })}
                    placeholder="Nhập tên kho"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="ghiChu">Ghi chú</Label>
                  <Textarea
                    id="ghiChu"
                    value={formData.ghiChu}
                    onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                    placeholder="Nhập ghi chú (tùy chọn)"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingId ? 'Cập nhật' : 'Thêm kho'}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Hủy
                    </Button>
                  )}
                </div>
              </form>

              <div className="border-t pt-4">
                <Label className="text-sm font-semibold mb-2 block">Import từ Excel</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportExcel}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Excel
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  File cần có cột: maKho, tenKho (tùy chọn: ghiChu)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Danh sách kho</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm kiếm kho..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredWarehouses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {warehouses.length === 0 ? (
                    <>
                      <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Chưa có kho nào</p>
                      <p className="text-sm">Thêm kho đầu tiên để bắt đầu</p>
                    </>
                  ) : (
                    <p>Không tìm thấy kho phù hợp</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredWarehouses.map((warehouse) => (
                    <div
                      key={warehouse.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{warehouse.maKho}</Badge>
                          <h3 className="font-semibold text-gray-900">{warehouse.tenKho}</h3>
                        </div>
                        {warehouse.ghiChu && (
                          <p className="text-sm text-gray-500 mt-1">
                            {warehouse.ghiChu}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(warehouse)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(warehouse.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
