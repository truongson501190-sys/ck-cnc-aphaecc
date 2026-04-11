import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Users, Upload } from 'lucide-react';
import { Operator } from '@/types/categories';
import * as XLSX from 'xlsx';

export function OperatorManagement() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    maNguoi: '',
    tenNguoi: '',
    ghiChu: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadOperators();
  }, []);

  const loadOperators = () => {
    try {
      const saved = localStorage.getItem('operators');
      if (saved) {
        setOperators(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading operators:', error);
    }
  };

  const saveOperators = (newOperators: Operator[]) => {
    try {
      localStorage.setItem('operators', JSON.stringify(newOperators));
      setOperators(newOperators);
    } catch (error) {
      console.error('Error saving operators:', error);
      toast.error('Lỗi khi lưu dữ liệu');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.maNguoi.trim() || !formData.tenNguoi.trim()) {
      toast.error('Vui lòng điền mã người vận hành và tên người vận hành');
      return;
    }

    // Check for duplicate code
    const isDuplicateMa = operators.some(o => 
      o.maNguoi === formData.maNguoi.trim() && o.id !== editingId
    );
    
    if (isDuplicateMa) {
      toast.error('Mã người vận hành này đã tồn tại');
      return;
    }

    if (editingId) {
      const updatedOperators = operators.map(operator =>
        operator.id === editingId
          ? { ...operator, maNguoi: formData.maNguoi.trim(), tenNguoi: formData.tenNguoi.trim(), ghiChu: formData.ghiChu.trim() }
          : operator
      );
      saveOperators(updatedOperators);
      toast.success('Đã cập nhật người vận hành thành công');
      setEditingId(null);
    } else {
      const newOperator: Operator = {
        id: Date.now().toString(),
        maNguoi: formData.maNguoi.trim(),
        tenNguoi: formData.tenNguoi.trim(),
        ghiChu: formData.ghiChu.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      saveOperators([...operators, newOperator]);
      toast.success('Đã thêm người vận hành mới thành công');
    }

    setFormData({
      maNguoi: '',
      tenNguoi: '',
      ghiChu: ''
    });
  };

  const handleEdit = (operator: Operator) => {
    setFormData({
      maNguoi: operator.maNguoi,
      tenNguoi: operator.tenNguoi,
      ghiChu: operator.ghiChu || ''
    });
    setEditingId(operator.id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người vận hành này?')) {
      const updatedOperators = operators.filter(operator => operator.id !== id);
      saveOperators(updatedOperators);
      toast.success('Đã xóa người vận hành thành công');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      maNguoi: '',
      tenNguoi: '',
      ghiChu: ''
    });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let addedCount = 0;
        let skippedCount = 0;
        const newOperators = [...operators];

        data.forEach(row => {
          const maNguoi = (row.maNguoi || '').toString().trim();
          const tenNguoi = (row.tenNguoi || '').toString().trim();
          const ghiChu = (row.ghiChu || '').toString().trim();

          // Check for empty required fields
          if (!maNguoi || !tenNguoi) {
            skippedCount++;
            return;
          }

          // Check for duplicates
          const isDuplicate = newOperators.some(o => 
            o.maNguoi === maNguoi || o.tenNguoi === tenNguoi
          );

          if (isDuplicate) {
            skippedCount++;
            return;
          }

          newOperators.push({
            id: Date.now().toString() + Math.random(),
            maNguoi,
            tenNguoi,
            ghiChu: ghiChu || undefined,
            createdAt: new Date().toISOString()
          });
          addedCount++;
        });

        saveOperators(newOperators);
        toast.success(`Đã import thành công ${addedCount} dòng. Bỏ qua ${skippedCount} dòng lỗi/trùng lặp.`);
      } catch (error) {
        console.error('Error importing Excel:', error);
        toast.error('Lỗi khi đọc file Excel');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredOperators = operators.filter(operator =>
    operator.maNguoi.toLowerCase().includes(searchTerm.toLowerCase()) ||
    operator.tenNguoi.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (operator.ghiChu && operator.ghiChu.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Người Vận Hành</h2>
          <p className="text-gray-600">Quản lý danh sách người vận hành trong hệ thống</p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          <Users className="w-4 h-4 mr-1" />
          {operators.length} người
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form thêm/sửa người vận hành */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {editingId ? 'Chỉnh sửa người vận hành' : 'Thêm người vận hành mới'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="maNguoi">Mã người vận hành *</Label>
                  <Input
                    id="maNguoi"
                    value={formData.maNguoi}
                    onChange={(e) => setFormData({ ...formData, maNguoi: e.target.value })}
                    placeholder="VD: OP001"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="tenNguoi">Tên người vận hành *</Label>
                  <Input
                    id="tenNguoi"
                    value={formData.tenNguoi}
                    onChange={(e) => setFormData({ ...formData, tenNguoi: e.target.value })}
                    placeholder="Nhập tên người vận hành"
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
                    {editingId ? 'Cập nhật' : 'Thêm người'}
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
                  File cần có cột: maNguoi, tenNguoi (tùy chọn: ghiChu)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danh sách người vận hành */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Danh sách người vận hành</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm kiếm người..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredOperators.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {operators.length === 0 ? (
                    <>
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Chưa có người vận hành nào</p>
                      <p className="text-sm">Thêm người đầu tiên để bắt đầu</p>
                    </>
                  ) : (
                    <p>Không tìm thấy người phù hợp</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOperators.map((operator) => (
                    <div
                      key={operator.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{operator.maNguoi}</Badge>
                          <h3 className="font-semibold text-gray-900">{operator.tenNguoi}</h3>
                        </div>
                        {operator.ghiChu && (
                          <p className="text-sm text-gray-500 mt-1">
                            {operator.ghiChu}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(operator)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(operator.id)}
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
