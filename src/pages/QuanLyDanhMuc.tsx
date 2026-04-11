import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, FileUp, Settings, Package, Warehouse, HardHat, Truck, User } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface CategoryItem {
  id: string;
  [key: string]: string;
}

export const QuanLyDanhMuc: React.FC = () => {
  const [categories, setCategories] = useState<{
    items: CategoryItem[];
    warehouses: CategoryItem[];
    projects: CategoryItem[];
    machines: CategoryItem[];
    operators: CategoryItem[];
  }>({
    items: [],
    warehouses: [],
    projects: [],
    machines: [],
    operators: []
  });

  const [activeTab, setActiveTab] = useState('items');
  const [newItem, setNewItem] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load data from localStorage
    const savedItems = JSON.parse(localStorage.getItem('category_items') || '[]');
    const savedWarehouses = JSON.parse(localStorage.getItem('category_warehouses') || '[]');
    const savedProjects = JSON.parse(localStorage.getItem('category_projects') || '[]');
    const savedMachines = JSON.parse(localStorage.getItem('category_machines') || '[]');
    const savedOperators = JSON.parse(localStorage.getItem('category_operators') || '[]');

    setCategories({
      items: savedItems,
      warehouses: savedWarehouses,
      projects: savedProjects,
      machines: savedMachines,
      operators: savedOperators
    });
  }, []);

  const saveToStorage = (type: string, data: CategoryItem[]) => {
    localStorage.setItem(`category_${type}`, JSON.stringify(data));
    setCategories(prev => ({ ...prev, [type]: data }));
  };

  const handleAddItem = (type: keyof typeof categories) => {
    const items = [...categories[type]];
    const id = Math.random().toString(36).substr(2, 9);
    items.push({ id, ...newItem });
    saveToStorage(type, items);
    setNewItem({});
    toast.success('Đã thêm thành công');
  };

  const handleDeleteItem = (type: keyof typeof categories, id: string) => {
    const items = categories[type].filter(item => item.id !== id);
    saveToStorage(type, items);
    toast.success('Đã xóa thành công');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>, type: keyof typeof categories) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      const currentItems = [...categories[type]];
      let addedCount = 0;
      let skippedCount = 0;

      data.forEach(row => {
        let mappedRow: Record<string, string> = {};
        let duplicate = false;

        if (type === 'items') {
          mappedRow = {
            maChungLoai: row.maChungLoai || '',
            tenChungLoai: row.tenChungLoai || '',
            donViTinh: row.donViTinh || '',
            donGia: String(row.donGia || '0')
          };
          duplicate = currentItems.some(i => i.maChungLoai === mappedRow.maChungLoai);
        } else if (type === 'warehouses') {
          mappedRow = {
            maKho: row.maKho || '',
            tenKho: row.tenKho || '',
            diaChi: row.diaChi || ''
          };
          duplicate = currentItems.some(i => i.maKho === mappedRow.maKho);
        } else if (type === 'projects') {
          mappedRow = {
            maDuAn: row.maDuAn || '',
            tenDuAn: row.tenDuAn || ''
          };
          duplicate = currentItems.some(i => i.maDuAn === mappedRow.maDuAn);
        } else if (type === 'machines') {
          mappedRow = {
            maMayMoc: row.maMayMoc || '',
            tenMayMoc: row.tenMayMoc || ''
          };
          duplicate = currentItems.some(i => i.maMayMoc === mappedRow.maMayMoc);
        } else if (type === 'operators') {
          mappedRow = {
            maNguoiVanHanh: row.maNguoiVanHanh || '',
            tenNguoiVanHanh: row.tenNguoiVanHanh || ''
          };
          duplicate = currentItems.some(i => i.maNguoiVanHanh === mappedRow.maNguoiVanHanh);
        }

        if (!duplicate && Object.values(mappedRow).some(v => v !== '')) {
          currentItems.push({ id: Math.random().toString(36).substr(2, 9), ...mappedRow });
          addedCount++;
        } else {
          skippedCount++;
        }
      });

      saveToStorage(type, currentItems);
      toast.success(`Đã import thành công ${addedCount} dòng. Bỏ qua ${skippedCount} dòng trùng lặp.`);
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Danh Mục Hệ Thống</h1>
      </div>

      <div className="w-full">
        <div className="flex w-full gap-2 p-2 bg-gray-100 rounded-lg border-0 h-auto flex-nowrap overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('items')}
            className={`inline-flex items-center gap-2 px-4 py-3 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 flex-shrink-0 whitespace-nowrap text-sm ${
              activeTab === 'items' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700'
            }`}
          >
            <Package className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Chủng Loại</span>
            <span className="sm:hidden">CL</span>
          </button>
          <button
            onClick={() => setActiveTab('warehouses')}
            className={`inline-flex items-center gap-2 px-4 py-3 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 flex-shrink-0 whitespace-nowrap text-sm ${
              activeTab === 'warehouses' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700'
            }`}
          >
            <Warehouse className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Kho</span>
            <span className="sm:hidden">Kho</span>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`inline-flex items-center gap-2 px-4 py-3 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 flex-shrink-0 whitespace-nowrap text-sm ${
              activeTab === 'projects' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700'
            }`}
          >
            <HardHat className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Dự Án</span>
            <span className="sm:hidden">DA</span>
          </button>
          <button
            onClick={() => setActiveTab('machines')}
            className={`inline-flex items-center gap-2 px-4 py-3 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 flex-shrink-0 whitespace-nowrap text-sm ${
              activeTab === 'machines' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700'
            }`}
          >
            <Truck className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Máy Móc</span>
            <span className="sm:hidden">MM</span>
          </button>
          <button
            onClick={() => setActiveTab('operators')}
            className={`inline-flex items-center gap-2 px-4 py-3 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 flex-shrink-0 whitespace-nowrap text-sm ${
              activeTab === 'operators' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700'
            }`}
          >
            <User className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Người Vận Hành</span>
            <span className="sm:hidden">NVH</span>
          </button>
        </div>

        {/* Tab: Chủng Loại */}
        {activeTab === 'items' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Danh Mục Chủng Loại</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  id="import-items"
                  onChange={(e) => handleImportExcel(e, 'items')}
                />
                <Button variant="outline" onClick={() => document.getElementById('import-items')?.click()}>
                  <FileUp className="w-4 h-4 mr-2" /> Import Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 mb-6 items-end bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <Label>Mã chủng loại</Label>
                  <Input value={newItem.maChungLoai || ''} onChange={e => setNewItem({ ...newItem, maChungLoai: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tên chủng loại</Label>
                  <Input value={newItem.tenChungLoai || ''} onChange={e => setNewItem({ ...newItem, tenChungLoai: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Đơn vị tính</Label>
                  <Input value={newItem.donViTinh || ''} onChange={e => setNewItem({ ...newItem, donViTinh: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Đơn giá</Label>
                  <Input type="number" value={newItem.donGia || ''} onChange={e => setNewItem({ ...newItem, donGia: e.target.value })} />
                </div>
                <Button onClick={() => handleAddItem('items')} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" /> Thêm mới
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã</TableHead>
                    <TableHead>Tên chủng loại</TableHead>
                    <TableHead>ĐVT</TableHead>
                    <TableHead>Đơn giá</TableHead>
                    <TableHead className="w-[100px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.maChungLoai}</TableCell>
                      <TableCell>{item.tenChungLoai}</TableCell>
                      <TableCell>{item.donViTinh}</TableCell>
                      <TableCell>{Number(item.donGia).toLocaleString()} đ</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem('items', item.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tab: Kho */}
        {activeTab === 'warehouses' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Danh Mục Kho</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  id="import-warehouses"
                  onChange={(e) => handleImportExcel(e, 'warehouses')}
                />
                <Button variant="outline" onClick={() => document.getElementById('import-warehouses')?.click()}>
                  <FileUp className="w-4 h-4 mr-2" /> Import Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-6 items-end bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <Label>Mã kho</Label>
                  <Input value={newItem.maKho || ''} onChange={e => setNewItem({ ...newItem, maKho: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tên kho</Label>
                  <Input value={newItem.tenKho || ''} onChange={e => setNewItem({ ...newItem, tenKho: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Địa chỉ</Label>
                  <Input value={newItem.diaChi || ''} onChange={e => setNewItem({ ...newItem, diaChi: e.target.value })} />
                </div>
                <Button onClick={() => handleAddItem('warehouses')} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" /> Thêm mới
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã</TableHead>
                    <TableHead>Tên kho</TableHead>
                    <TableHead>Địa chỉ</TableHead>
                    <TableHead className="w-[100px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.warehouses.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.maKho}</TableCell>
                      <TableCell>{item.tenKho}</TableCell>
                      <TableCell>{item.diaChi}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem('warehouses', item.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tab: Dự Án */}
        {activeTab === 'projects' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Danh Mục Dự Án</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  id="import-projects"
                  onChange={(e) => handleImportExcel(e, 'projects')}
                />
                <Button variant="outline" onClick={() => document.getElementById('import-projects')?.click()}>
                  <FileUp className="w-4 h-4 mr-2" /> Import Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6 items-end bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <Label>Mã dự án</Label>
                  <Input value={newItem.maDuAn || ''} onChange={e => setNewItem({ ...newItem, maDuAn: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tên dự án</Label>
                  <Input value={newItem.tenDuAn || ''} onChange={e => setNewItem({ ...newItem, tenDuAn: e.target.value })} />
                </div>
                <Button onClick={() => handleAddItem('projects')} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" /> Thêm mới
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã dự án</TableHead>
                    <TableHead>Tên dự án</TableHead>
                    <TableHead className="w-[100px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.projects.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.maDuAn}</TableCell>
                      <TableCell>{item.tenDuAn}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem('projects', item.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tab: Máy Móc */}
        {activeTab === 'machines' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Danh Mục Máy Móc</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  id="import-machines"
                  onChange={(e) => handleImportExcel(e, 'machines')}
                />
                <Button variant="outline" onClick={() => document.getElementById('import-machines')?.click()}>
                  <FileUp className="w-4 h-4 mr-2" /> Import Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6 items-end bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <Label>Mã máy móc</Label>
                  <Input value={newItem.maMayMoc || ''} onChange={e => setNewItem({ ...newItem, maMayMoc: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tên máy móc</Label>
                  <Input value={newItem.tenMayMoc || ''} onChange={e => setNewItem({ ...newItem, tenMayMoc: e.target.value })} />
                </div>
                <Button onClick={() => handleAddItem('machines')} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" /> Thêm mới
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã máy móc</TableHead>
                    <TableHead>Tên máy móc</TableHead>
                    <TableHead className="w-[100px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.machines.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.maMayMoc}</TableCell>
                      <TableCell>{item.tenMayMoc}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem('machines', item.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tab: Người Vận Hành */}
        {activeTab === 'operators' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Danh Mục Người Vận Hành</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  id="import-operators"
                  onChange={(e) => handleImportExcel(e, 'operators')}
                />
                <Button variant="outline" onClick={() => document.getElementById('import-operators')?.click()}>
                  <FileUp className="w-4 h-4 mr-2" /> Import Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6 items-end bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <Label>Mã người vận hành</Label>
                  <Input value={newItem.maNguoiVanHanh || ''} onChange={e => setNewItem({ ...newItem, maNguoiVanHanh: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tên người vận hành</Label>
                  <Input value={newItem.tenNguoiVanHanh || ''} onChange={e => setNewItem({ ...newItem, tenNguoiVanHanh: e.target.value })} />
                </div>
                <Button onClick={() => handleAddItem('operators')} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" /> Thêm mới
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã người vận hành</TableHead>
                    <TableHead>Tên người vận hành</TableHead>
                    <TableHead className="w-[100px]">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.operators.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.maNguoiVanHanh}</TableCell>
                      <TableCell>{item.tenNguoiVanHanh}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem('operators', item.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
