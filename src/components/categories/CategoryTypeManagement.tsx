import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Package, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Category } from '@/types/categories';
import * as XLSX from 'xlsx';

export function CategoryTypeManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    maLoai: '',
    tenLoai: '',
    donVi: '',
    gia: 0,
    minimumStock: 0,
    ghiChu: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = () => {
    try {
      const saved = localStorage.getItem('categoryTypes');
      if (saved) {
        setCategories(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const saveCategories = (updatedCategories: Category[]) => {
    setCategories(updatedCategories);
    localStorage.setItem('categoryTypes', JSON.stringify(updatedCategories));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.maLoai.trim() || !formData.tenLoai.trim()) {
      toast.error('Vui lòng điền mã loại và tên loại');
      return;
    }

    // Check for duplicate code
    const isDuplicateMa = categories.some(c => 
      c.maLoai === formData.maLoai.trim() && c.id !== editingCategory?.id
    );
    
    if (isDuplicateMa) {
      toast.error('Mã loại này đã tồn tại');
      return;
    }

    if (editingCategory) {
      const updatedCategories = categories.map(category =>
        category.id === editingCategory.id
          ? { 
              ...category, 
              maLoai: formData.maLoai.trim(),
              tenLoai: formData.tenLoai.trim(),
              donVi: formData.donVi.trim(),
              gia: formData.gia,
              minimumStock: formData.minimumStock,
              ghiChu: formData.ghiChu.trim() || undefined
            }
          : category
      );
      saveCategories(updatedCategories);
      toast.success('Đã cập nhật chủng loại thành công');
    } else {
      const newCategory: Category = {
        id: Date.now().toString(),
        maLoai: formData.maLoai.trim(),
        tenLoai: formData.tenLoai.trim(),
        donVi: formData.donVi.trim(),
        gia: formData.gia,
        minimumStock: formData.minimumStock,
        ghiChu: formData.ghiChu.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      saveCategories([...categories, newCategory]);
      toast.success('Đã thêm chủng loại mới thành công');
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      maLoai: '',
      tenLoai: '',
      donVi: '',
      gia: 0,
      minimumStock: 0,
      ghiChu: ''
    });
    setEditingCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      maLoai: category.maLoai,
      tenLoai: category.tenLoai,
      donVi: category.donVi,
      gia: category.gia ?? 0,
      minimumStock: category.minimumStock ?? 0,
      ghiChu: category.ghiChu ?? ''
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa chủng loại này?')) {
      const updatedCategories = categories.filter(category => category.id !== id);
      saveCategories(updatedCategories);
      toast.success('Đã xóa chủng loại thành công');
    }
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
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const currentCategories = [...categories];

        json.forEach(row => {
          // Normalize keys to support Vietnamese and English
          const maLoai = (row.maLoai ?? row['Mã loại'] ?? row['Mã Loại'] ?? '').toString().trim();
          const tenLoai = (row.tenLoai ?? row['Tên loại'] ?? row['Tên Loại'] ?? '').toString().trim();
          const donVi = (row.donVi ?? row['Đơn vị'] ?? row['Đơn Vị'] ?? '').toString().trim();
          
          const rawGia = row.gia ?? row['Giá'] ?? row['Đơn giá'] ?? row['Đơn Giá'];
          const gia = rawGia !== undefined ? Number(rawGia) : undefined;
          
          // Improved mapping for minimumStock with more possible column names
          const rawMinStock = row.minimumStock ?? row['Tồn tối thiểu'] ?? row['Tồn Tối Thiểu'] ?? row['Tồn kho tối thiểu'] ?? row['Tồn Kho Tối Thiểu'] ?? row['Min Stock'];
          const minimumStock = rawMinStock !== undefined ? Number(rawMinStock) : undefined;
          
          const ghiChu = (row.ghiChu ?? row['Ghi chú'] ?? row['Ghi Chú'] ?? '').toString().trim();

          if (!maLoai || !tenLoai) {
            skippedCount++;
            return;
          }

          const existingIndex = currentCategories.findIndex(c => c.maLoai === maLoai);
          
          if (existingIndex >= 0) {
            // Update existing - only update fields that are present in Excel
            currentCategories[existingIndex] = {
              ...currentCategories[existingIndex],
              tenLoai,
              donVi: donVi || currentCategories[existingIndex].donVi,
              gia: gia !== undefined ? gia : currentCategories[existingIndex].gia,
              minimumStock: minimumStock !== undefined ? minimumStock : currentCategories[existingIndex].minimumStock,
              ghiChu: ghiChu || currentCategories[existingIndex].ghiChu
            };
            updatedCount++;
          } else {
            // Add new - use nullish coalescing to properly handle 0 values
            currentCategories.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              maLoai,
              tenLoai,
              donVi: donVi || 'Cái',
              gia: gia ?? 0,
              minimumStock: minimumStock ?? 0,
              ghiChu: ghiChu || undefined,
              createdAt: new Date().toISOString()
            });
            addedCount++;
          }
        });

        saveCategories(currentCategories);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản Lý Chủng Loại</h2>
          <p className="text-gray-600 mt-1">Quản lý chủng loại sản phẩm, đơn vị và giá</p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {categories.length} chủng loại
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {editingCategory ? 'Chỉnh sửa Chủng Loại' : 'Thêm Chủng Loại Mới'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="maLoai">Mã Loại *</Label>
                  <Input
                    id="maLoai"
                    value={formData.maLoai}
                    onChange={(e) => setFormData({...formData, maLoai: e.target.value})}
                    placeholder="VD: LO001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tenLoai">Tên Loại *</Label>
                  <Input
                    id="tenLoai"
                    value={formData.tenLoai}
                    onChange={(e) => setFormData({...formData, tenLoai: e.target.value})}
                    placeholder="Nhập tên chủng loại"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="donVi">Đơn Vị *</Label>
                  <Input
                    id="donVi"
                    value={formData.donVi}
                    onChange={(e) => setFormData({...formData, donVi: e.target.value})}
                    placeholder="VD: kg, m, cái, lít..."
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="gia">Giá (VND) *</Label>
                  <Input
                    id="gia"
                    type="number"
                    value={formData.gia}
                    onChange={(e) => setFormData({...formData, gia: Number(e.target.value)})}
                    placeholder="Nhập giá"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="minimumStock">Tồn kho tối thiểu</Label>
                  <Input
                    id="minimumStock"
                    type="number"
                    value={formData.minimumStock}
                    onChange={(e) => setFormData({...formData, minimumStock: Number(e.target.value)})}
                    placeholder="Nhập số lượng tối thiểu"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="ghiChu">Ghi Chú</Label>
                  <Textarea
                    id="ghiChu"
                    value={formData.ghiChu}
                    onChange={(e) => setFormData({...formData, ghiChu: e.target.value})}
                    placeholder="Nhập ghi chú (tùy chọn)"
                    rows={3}
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  {editingCategory && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Hủy
                    </Button>
                  )}
                  <Button type="submit" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700">
                    {editingCategory ? 'Cập Nhật' : 'Thêm Chủng Loại'}
                  </Button>
                </div>
              </form>
              <div className="border-t pt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportExcel}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Import Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Danh Sách Chủng Loại</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã Loại</TableHead>
                      <TableHead>Tên Loại</TableHead>
                      <TableHead>Đơn Vị</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Tồn kho tối thiểu</TableHead>
                      <TableHead>Ghi Chú</TableHead>
                      <TableHead className="text-right">Thao Tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          Chưa có chủng loại nào. Thêm chủng loại đầu tiên để bắt đầu.
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.maLoai}</TableCell>
                          <TableCell className="font-medium">{category.tenLoai}</TableCell>
                          <TableCell>{category.donVi}</TableCell>
                          <TableCell>{formatCurrency(category.gia ?? 0)}</TableCell>
                          <TableCell>{category.minimumStock ?? 0}</TableCell>
                          <TableCell className="max-w-xs truncate">{category.ghiChu ?? ''}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(category)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(category.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}