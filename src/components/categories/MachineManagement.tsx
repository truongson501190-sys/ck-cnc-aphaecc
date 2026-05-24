import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Search,
  Edit2,
  Trash2,
  Zap,
  Upload
} from 'lucide-react';

import { Machine } from '@/types/categories';
import * as XLSX from 'xlsx';

// Danh sách các ca làm việc chú Sơn yêu cầu
const SHIFT_OPTIONS = [
  '8h/1Ca',
  '10h/1Ca',
  '8h/2Ca',
  '10h/2Ca',
  '12h/1Ca',
  '12h/2Ca'
];

export function MachineManagement() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    maMay: '',
    tenMay: '',
    loaiMay: '8h/1Ca', // Đặt mặc định ca đầu tiên
    ghiChu: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = () => {
    try {
      const saved = localStorage.getItem('machines');
      if (saved) {
        setMachines(JSON.parse(saved));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const saveMachines = (data: Machine[]) => {
    localStorage.setItem('machines', JSON.stringify(data));
    setMachines(data);
    setSelectedIds([]);
  };

  const generateMachineCode = (currentList: Machine[]) => {
    let maxNum = 0;
    currentList.forEach(item => {
      if (item.maMay && item.maMay.startsWith('MAY')) {
        const num = parseInt(item.maMay.replace('MAY', ''), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `MAY${String(maxNum + 1).padStart(3, '0')}`;
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      maMay: '',
      tenMay: '',
      loaiMay: '8h/1Ca',
      ghiChu: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tenMay.trim()) {
      toast.error('Vui lòng nhập tên máy');
      return;
    }

    if (editingId) {
      const updated = machines.map((machine) =>
        machine.id === editingId
          ? {
              ...machine,
              tenMay: formData.tenMay.trim(),
              loaiMay: formData.loaiMay, // Lưu ca làm việc đã chọn
              ghiChu: formData.ghiChu.trim() || undefined
            }
          : machine
      );

      saveMachines(updated);
      toast.success('Đã cập nhật máy thành công');
      resetForm();
    } else {
      const finalMaMay = generateMachineCode(machines);
      const newMachine: Machine = {
        id: crypto.randomUUID(),
        maMay: finalMaMay,
        tenMay: formData.tenMay.trim(),
        loaiMay: formData.loaiMay || undefined,
        ghiChu: formData.ghiChu.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      saveMachines([newMachine, ...machines]);
      toast.success(`Đã thêm máy mới ${finalMaMay}`);
      resetForm();
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingId(machine.id);
    setFormData({
      maMay: machine.maMay,
      tenMay: machine.tenMay,
      loaiMay: machine.loaiMay || '8h/1Ca',
      ghiChu: machine.ghiChu || ''
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Chú có chắc muốn xóa máy này không?')) return;
    const updated = machines.filter((m) => m.id !== id);
    saveMachines(updated);
    toast.success('Đã xóa máy thành công');
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      toast.error('Chú chưa chọn máy nào để xóa');
      return;
    }

    if (!window.confirm(`Chú có chắc chắn muốn xóa ${selectedIds.length} máy đã chọn?`)) {
      return;
    }

    const updated = machines.filter((machine) => !selectedIds.includes(machine.id));
    saveMachines(updated);
    toast.success(`Đã xóa thành công ${selectedIds.length} máy`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredMachines.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMachines.map((m) => m.id));
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
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        if (!json || json.length === 0) {
          toast.error('File Excel không có dữ liệu');
          return;
        }

        const currentMachines = [...machines];
        let addedCount = 0;

        json.forEach((row: any) => {
          const targetKeyTen = Object.keys(row).find(k => {
            const keyClean = k.toLowerCase().trim();
            return keyClean.includes('tên') || keyClean.includes('ten') || keyClean.includes('máy') || keyClean.includes('may') || keyClean.includes('machine');
          });
          const tenMay = targetKeyTen ? row[targetKeyTen]?.toString().trim() : '';
          
          if (!tenMay) return;

          // Đọc thông tin ca làm việc từ cột Loại máy trong Excel
          const targetKeyLoai = Object.keys(row).find(k => {
            const keyClean = k.toLowerCase().trim();
            return keyClean.includes('loại') || keyClean.includes('loai') || keyClean.includes('ca') || keyClean.includes('type');
          });
          let loaiMay = targetKeyLoai ? row[targetKeyLoai]?.toString().trim() : '8h/1Ca';

          // Nếu trong file excel gõ lệch ca, tự động chuẩn hóa về ca hợp lệ hoặc giữ nguyên
          const matchedShift = SHIFT_OPTIONS.find(s => s.toLowerCase() === loaiMay.toLowerCase());
          if (matchedShift) loaiMay = matchedShift;

          const targetKeyGhiChu = Object.keys(row).find(k => {
            const keyClean = k.toLowerCase().trim();
            return keyClean.includes('chú') || keyClean.includes('chu') || keyClean.includes('note') || keyClean.includes('description');
          });
          const ghiChu = targetKeyGhiChu ? row[targetKeyGhiChu]?.toString().trim() : '';

          const finalMaMay = generateMachineCode(currentMachines);

          const newMachineItem: Machine = {
            id: crypto.randomUUID(),
            maMay: finalMaMay,
            tenMay: tenMay,
            loaiMay: loaiMay !== "" ? loaiMay : undefined,
            ghiChu: ghiChu !== "" ? ghiChu : undefined,
            createdAt: new Date().toISOString()
          };

          currentMachines.unshift(newMachineItem);
          addedCount++;
        });

        saveMachines(currentMachines);
        toast.success(`Import thành công ${addedCount} máy vào danh sách`);
      } catch (error) {
        console.error(error);
        toast.error('Lỗi đọc file Excel, chú kiểm tra lại cấu trúc file nhé');
      }
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredMachines = machines.filter((machine) => {
    const keyword = searchTerm.toLowerCase().trim();
    return (
      (machine.maMay || '').toLowerCase().includes(keyword) ||
      (machine.tenMay || '').toLowerCase().includes(keyword) ||
      (machine.loaiMay || '').toLowerCase().includes(keyword) ||
      (machine.ghiChu || '').toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quản lý Máy Móc</h2>
          <p className="text-gray-500">Danh sách máy và chế độ ca làm việc</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 font-bold shadow-sm">
            <Zap className="w-4 h-4 mr-1 text-blue-500" />
            Tổng: {machines.length} máy
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KHỐI TRÁI: FORM NHẬP & LỰA CHỌN CA */}
        <div>
          <Card className="rounded-xl border border-slate-100 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">
                {editingId ? 'Chỉnh sửa thông tin máy' : 'Thêm máy mới'}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Mã máy</Label>
                  <Input
                    value={editingId ? formData.maMay : ""}
                    disabled
                    placeholder="Hệ thống tự động sinh mã"
                    className="bg-slate-50 text-slate-500 placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Tên máy *</Label>
                  <Input
                    value={formData.tenMay}
                    onChange={(e) => setFormData({ ...formData, tenMay: e.target.value })}
                    placeholder="Nhập tên thiết bị máy móc"
                    className="border-slate-200"
                  />
                </div>

                {/* THAY Ô NHẬP CHỮ THÀNH Ô CHỌN CA LÀM VIỆC THEO Ý CHÚ SƠN */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Thời gian / Ca làm việc</Label>
                  <select
                    value={formData.loaiMay}
                    onChange={(e) => setFormData({ ...formData, loaiMay: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {SHIFT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Ghi chú</Label>
                  <Textarea
                    rows={3}
                    value={formData.ghiChu}
                    onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                    placeholder="Thông tin bổ sung"
                    className="border-slate-200 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium">
                    {editingId ? 'Cập nhật' : 'Thêm máy'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </Button>
                </div>
              </form>

              <div className="border-t border-slate-100 mt-6 pt-4 space-y-2">
                <p className="text-xs text-slate-400">File Excel gồm các cột: **Tên máy**, **Loại máy** (gõ ca làm việc), **Ghi chú**</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportExcel}
                />
                <Button
                  variant="outline"
                  className="w-full h-12 border-dashed border-2 border-slate-200 text-slate-600 hover:bg-slate-50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2 text-slate-400" />
                  Tải lên File Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KHỐI PHẢI: BẢNG DANH SÁCH MÁY MÓC */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 py-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <CardTitle className="text-lg font-bold text-slate-800">Danh sách máy móc</CardTitle>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Tìm máy..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-full sm:w-64 border-slate-200 h-9"
                    />
                  </div>

                  {selectedIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                      className="h-9 font-medium"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Xóa ({selectedIds.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="space-y-0">
                <div className="grid grid-cols-[40px_110px_1fr_160px_90px] gap-2 px-4 py-2.5 bg-slate-50/70 border-b text-sm font-semibold text-slate-700 items-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={
                        filteredMachines.length > 0 &&
                        selectedIds.length === filteredMachines.length
                      }
                      onCheckedChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded-sm border-slate-300 data-[state=checked]:bg-blue-600"
                    />
                  </div>
                  <div>Mã máy</div>
                  <div>Tên máy / Ghi chú</div>
                  <div>Thời gian / Ca</div>
                  <div className="text-center">Thao tác</div>
                </div>

                {filteredMachines.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-sm">
                    Không tìm thấy dữ liệu máy móc nào.
                  </div>
                ) : (
                  filteredMachines.map((machine) => (
                    <div
                      key={machine.id}
                      className="grid grid-cols-[40px_110px_1fr_160px_90px] gap-2 px-4 py-3 items-center border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40 transition-colors"
                    >
                      <div className="flex justify-center">
                        <Checkbox
                          checked={selectedIds.includes(machine.id)}
                          onCheckedChange={() => toggleSelect(machine.id)}
                          className="h-3.5 w-3.5 rounded-sm border-slate-300 data-[state=checked]:bg-blue-600"
                        />
                      </div>

                      <div>
                        <Badge variant="outline" className="font-mono border-slate-200 text-slate-600 bg-slate-50">
                          {machine.maMay}
                        </Badge>
                      </div>

                      <div className="pr-2">
                        <p className="font-semibold text-slate-900 text-sm">{machine.tenMay}</p>
                        {machine.ghiChu && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs" title={machine.ghiChu}>
                            {machine.ghiChu}
                          </p>
                        )}
                      </div>

                      {/* HIỂN THỊ CA LÀM VIỆC CỦA MÁY DƯỚI DẠNG BADGE CHO ĐẸP MẮT */}
                      <div>
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 font-medium">
                          {machine.loaiMay || '—'}
                        </Badge>
                      </div>

                      <div className="flex justify-center gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          onClick={() => handleEdit(machine)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => handleDelete(machine.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}