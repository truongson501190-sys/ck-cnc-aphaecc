import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Users, Upload } from 'lucide-react';
import { Employee } from '@/types/categories';
import * as XLSX from 'xlsx';

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    msnv: '',
    ten_nhan_vien: '',
    ghiChu: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = () => {
    try {
      const saved = localStorage.getItem('employees');
      if (saved) {
        setEmployees(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const saveEmployees = (newEmployees: Employee[]) => {
    try {
      localStorage.setItem('employees', JSON.stringify(newEmployees));
      setEmployees(newEmployees);
    } catch (error) {
      console.error('Error saving employees:', error);
      toast.error('Lỗi khi lưu dữ liệu');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.msnv.trim() || !formData.ten_nhan_vien.trim()) {
      toast.error('Vui lòng điền MSNV và tên nhân viên');
      return;
    }

    // Check for duplicate code
    const isDuplicateMa = employees.some(e => 
      e.msnv === formData.msnv.trim() && e.id !== editingId
    );
    
    if (isDuplicateMa) {
      toast.error('MSNV này đã tồn tại');
      return;
    }

    if (editingId) {
      const updatedEmployees = employees.map(employee =>
        employee.id === editingId
          ? { ...employee, msnv: formData.msnv.trim(), ten_nhan_vien: formData.ten_nhan_vien.trim(), ghiChu: formData.ghiChu.trim() }
          : employee
      );
      saveEmployees(updatedEmployees);
      toast.success('Đã cập nhật nhân viên thành công');
      setEditingId(null);
    } else {
      const newEmployee: Employee = {
        id: Date.now().toString(),
        msnv: formData.msnv.trim(),
        ten_nhan_vien: formData.ten_nhan_vien.trim(),
        ghiChu: formData.ghiChu.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      saveEmployees([...employees, newEmployee]);
      toast.success('Đã thêm nhân viên mới thành công');
    }

    setFormData({
      msnv: '',
      ten_nhan_vien: '',
      ghiChu: ''
    });
  };

  const handleEdit = (employee: Employee) => {
    setFormData({
      msnv: employee.msnv,
      ten_nhan_vien: employee.ten_nhan_vien,
      ghiChu: employee.ghiChu || ''
    });
    setEditingId(employee.id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
      const updatedEmployees = employees.filter(employee => employee.id !== id);
      saveEmployees(updatedEmployees);
      toast.success('Đã xóa nhân viên thành công');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      msnv: '',
      ten_nhan_vien: '',
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
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Helper to find value by flexible header names
        const getValueByHeaders = (row: any, possibleHeaders: string[]) => {
          const rowKeys = Object.keys(row);
          
          // Helper to normalize string for comparison
          const normalize = (str: string) => 
            str.toLowerCase()
               .normalize('NFD')
               .replace(/[\u0300-\u036f]/g, '') // remove accents
               .replace(/\s+/g, '') // remove spaces
               .replace(/[^a-z0-9]/g, ''); // keep only alphanumeric

          const normalizedHeaders = possibleHeaders.map(normalize);
          
          const foundKey = rowKeys.find(key => {
            const normalizedKey = normalize(key);
            return normalizedHeaders.some(nh => normalizedKey === nh || normalizedKey.includes(nh));
          });
          
          return foundKey ? row[foundKey] : undefined;
        };

        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const currentEmployees = [...employees];

        json.forEach(row => {
          // Robust column mapping
          const msnv = (getValueByHeaders(row, ['msnv', 'MSNV', 'Mã NV', 'Mã nhân viên', 'maNguoi', 'Mã người', 'Mã Người', 'ma_nguoi', 'Ma Nguoi']) || '').toString().trim();
          const ten_nhan_vien = (getValueByHeaders(row, ['ten_nhan_vien', 'Tên nhân viên', 'Tên NV', 'tenNguoi', 'Tên người', 'Tên Người', 'ten_nguoi', 'Ten Nguoi', 'Họ tên', 'Họ và tên']) || '').toString().trim();
          const ghiChu = (getValueByHeaders(row, ['ghiChu', 'Ghi chú', 'Ghi Chú', 'ghi_chu', 'Ghi Chu', 'Note']) || '').toString().trim();

          if (!msnv || !ten_nhan_vien) {
            skippedCount++;
            return;
          }

          const existingIndex = currentEmployees.findIndex(e => e.msnv === msnv);
          
          if (existingIndex >= 0) {
            // Update existing
            currentEmployees[existingIndex] = {
              ...currentEmployees[existingIndex],
              ten_nhan_vien: ten_nhan_vien || currentEmployees[existingIndex].ten_nhan_vien,
              ghiChu: ghiChu || currentEmployees[existingIndex].ghiChu
            };
            updatedCount++;
          } else {
            // Add new
            currentEmployees.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              msnv,
              ten_nhan_vien,
              ghiChu: ghiChu || undefined,
              createdAt: new Date().toISOString()
            });
            addedCount++;
          }
        });

        saveEmployees(currentEmployees);
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

  const filteredEmployees = employees.filter(employee =>
    employee.msnv.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.ten_nhan_vien.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.ghiChu && employee.ghiChu.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Nhân Viên</h2>
          <p className="text-gray-600">Quản lý danh sách nhân viên trong hệ thống</p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          <Users className="w-4 h-4 mr-1" />
          {employees.length} nhân viên
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form thêm/sửa nhân viên */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {editingId ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="msnv">MSNV *</Label>
                  <Input
                    id="msnv"
                    value={formData.msnv}
                    onChange={(e) => setFormData({ ...formData, msnv: e.target.value })}
                    placeholder="VD: NV001"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="ten_nhan_vien">Tên nhân viên *</Label>
                  <Input
                    id="ten_nhan_vien"
                    value={formData.ten_nhan_vien}
                    onChange={(e) => setFormData({ ...formData, ten_nhan_vien: e.target.value })}
                    placeholder="Nhập tên nhân viên"
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
                    {editingId ? 'Cập nhật' : 'Thêm nhân viên'}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Hủy
                    </Button>
                  )}
                </div>
              </form>

              {/* Import Excel */}
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
                  File cần có cột: msnv, ten_nhan_vien (tùy chọn: ghiChu)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danh sách nhân viên */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Danh sách nhân viên</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm kiếm nhân viên..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {employees.length === 0 ? (
                    <>
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Chưa có nhân viên nào</p>
                      <p className="text-sm">Thêm nhân viên đầu tiên để bắt đầu</p>
                    </>
                  ) : (
                    <p>Không tìm thấy nhân viên phù hợp</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{employee.msnv}</Badge>
                          <h3 className="font-semibold text-gray-900">{employee.ten_nhan_vien}</h3>
                        </div>
                        {employee.ghiChu && (
                          <p className="text-sm text-gray-500 mt-1">
                            {employee.ghiChu}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(employee)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(employee.id)}
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
