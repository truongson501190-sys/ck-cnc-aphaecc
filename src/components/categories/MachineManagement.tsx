import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Zap, Upload } from 'lucide-react';
import { Machine } from '@/types/categories';
import * as XLSX from 'xlsx';

export function MachineManagement() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    maMay: '',
    tenMay: '',
    loaiMay: '',
    ghiChu: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMachines();
    
    // Listen for sync events
    const handleSync = () => loadMachines();
    window.addEventListener('app-data-synced', handleSync);
    return () => window.removeEventListener('app-data-synced', handleSync);
  }, []);

  const loadMachines = () => {
    try {
      const saved = localStorage.getItem('machines');
      if (saved) {
        setMachines(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading machines:', error);
    }
  };

  const saveMachines = (newMachines: Machine[]) => {
    try {
      localStorage.setItem('machines', JSON.stringify(newMachines));
      setMachines(newMachines);
    } catch (error) {
      console.error('Error saving machines:', error);
      toast.error('Lỗi khi lưu dữ liệu');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.maMay.trim() || !formData.tenMay.trim()) {
      toast.error('Vui lòng điền mã máy và tên máy');
      return;
    }

    // Check for duplicate code
    const isDuplicateMa = machines.some(m => 
      m.maMay === formData.maMay.trim() && m.id !== editingId
    );
    
    if (isDuplicateMa) {
      toast.error('Mã máy này đã tồn tại');
      return;
    }

    if (editingId) {
      const updatedMachines = machines.map(machine =>
        machine.id === editingId
          ? { ...machine, maMay: formData.maMay.trim(), tenMay: formData.tenMay.trim(), loaiMay: formData.loaiMay.trim(), ghiChu: formData.ghiChu.trim() }
          : machine
      );
      saveMachines(updatedMachines);
      toast.success('Đã cập nhật máy móc thành công');
      setEditingId(null);
    } else {
      const newMachine: Machine = {
        id: Date.now().toString(),
        maMay: formData.maMay.trim(),
        tenMay: formData.tenMay.trim(),
        loaiMay: formData.loaiMay.trim() || undefined,
        ghiChu: formData.ghiChu.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      saveMachines([...machines, newMachine]);
      toast.success('Đã thêm máy móc mới thành công');
    }

    setFormData({
      maMay: '',
      tenMay: '',
      loaiMay: '',
      ghiChu: ''
    });
  };

  const handleEdit = (machine: Machine) => {
    setFormData({
      maMay: machine.maMay ?? '',
      tenMay: machine.tenMay,
      loaiMay: machine.loaiMay || '',
      ghiChu: machine.ghiChu || ''
    });
    setEditingId(machine.id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa máy móc này?')) {
      const updatedMachines = machines.filter(machine => machine.id !== id);
      saveMachines(updatedMachines);
      toast.success('Đã xóa máy móc thành công');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      maMay: '',
      tenMay: '',
      loaiMay: '',
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

        // Helper to find value by flexible header names
        const getValueByHeaders = (row: Record<string, unknown>, possibleHeaders: string[]) => {
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
        const currentMachines = [...machines];

        json.forEach(row => {
          // Robust column mapping
          const maMay = (getValueByHeaders(row, ['maMay', 'Mã máy', 'Mã Máy', 'ma_may', 'Ma May', 'Mã thiết bị']) || '').toString().trim();
          const tenMay = (getValueByHeaders(row, ['tenMay', 'Tên máy', 'Tên Máy', 'ten_may', 'Ten May', 'Tên thiết bị']) || '').toString().trim();
          const loaiMay = (getValueByHeaders(row, ['loaiMay', 'Loại máy', 'Loại Máy', 'loai_may', 'Loai May']) || '').toString().trim();
          const ghiChu = (getValueByHeaders(row, ['ghiChu', 'Ghi chú', 'Ghi Chú', 'ghi_chu', 'Ghi Chu', 'Note']) || '').toString().trim();

          if (!maMay || !tenMay) {
            skippedCount++;
            return;
          }

          const existingIndex = currentMachines.findIndex(m => m.maMay === maMay);
          
          if (existingIndex >= 0) {
            // Update existing
            currentMachines[existingIndex] = {
              ...currentMachines[existingIndex],
              tenMay: tenMay || currentMachines[existingIndex].tenMay,
              loaiMay: loaiMay || currentMachines[existingIndex].loaiMay,
              ghiChu: ghiChu || currentMachines[existingIndex].ghiChu
            };
            updatedCount++;
          } else {
            // Add new
            currentMachines.push({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              maMay,
              tenMay,
              loaiMay: loaiMay || undefined,
              ghiChu: ghiChu || undefined,
              createdAt: new Date().toISOString()
            });
            addedCount++;
          }
        });

        saveMachines(currentMachines);
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

  const filteredMachines = machines.filter(machine =>
    (machine.maMay ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    machine.tenMay.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (machine.loaiMay && machine.loaiMay.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (machine.ghiChu && machine.ghiChu.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Máy Móc</h2>
          <p className="text-gray-600">Quản lý danh sách các máy móc trong hệ thống</p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          <Zap className="w-4 h-4 mr-1" />
          {machines.length} máy
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form thêm/sửa máy */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {editingId ? 'Chỉnh sửa máy móc' : 'Thêm máy móc mới'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="maMay">Mã máy *</Label>
                  <Input
                    id="maMay"
                    value={formData.maMay}
                    onChange={(e) => setFormData({ ...formData, maMay: e.target.value })}
                    placeholder="VD: MAY001"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="tenMay">Tên máy *</Label>
                  <Input
                    id="tenMay"
                    value={formData.tenMay}
                    onChange={(e) => setFormData({ ...formData, tenMay: e.target.value })}
                    placeholder="Nhập tên máy"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="loaiMay">Loại máy</Label>
                  <Input
                    id="loaiMay"
                    value={formData.loaiMay}
                    onChange={(e) => setFormData({ ...formData, loaiMay: e.target.value })}
                    placeholder="Nhập loại máy (tùy chọn)"
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
                    {editingId ? 'Cập nhật' : 'Thêm máy'}
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
                  File cần có cột: maMay, tenMay (tùy chọn: loaiMay, ghiChu)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danh sách máy */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Danh sách máy móc</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm kiếm máy..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMachines.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {machines.length === 0 ? (
                    <>
                      <Zap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Chưa có máy móc nào</p>
                      <p className="text-sm">Thêm máy đầu tiên để bắt đầu</p>
                    </>
                  ) : (
                    <p>Không tìm thấy máy phù hợp</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMachines.map((machine) => (
                    <div
                      key={machine.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{machine.maMay}</Badge>
                          <h3 className="font-semibold text-gray-900">{machine.tenMay}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {machine.loaiMay && (
                            <Badge variant="secondary" className="text-xs">
                              {machine.loaiMay}
                            </Badge>
                          )}
                        </div>
                        {machine.ghiChu && (
                          <p className="text-sm text-gray-500 mt-1">
                            {machine.ghiChu}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(machine)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(machine.id)}
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
