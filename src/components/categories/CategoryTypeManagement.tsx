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
  Upload,
  DollarSign
} from 'lucide-react';

import { Machine as SystemMachine } from '@/types/categories';
import * as XLSX from 'xlsx';

interface Machine extends Omit<SystemMachine, 'loaiMay'> {
  loaiMay?: string;
  gia8h1Ca?: string;
  gia10h1Ca?: string;
  gia8h2Ca?: string;
  gia10h2Ca?: string;
  gia12h1Ca?: string;
  gia12h2Ca?: string;
}

// CHÁU ĐÃ ĐỔI TÊN HÀM Ở ĐÂY THÀNH CategoryTypeManagement CHO KHỚP VỚI HỆ THỐNG
export function CategoryTypeManagement() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    maMay: '',
    tenMay: '',
    gia8h1Ca: '',
    gia10h1Ca: '',
    gia8h2Ca: '',
    gia10h2Ca: '',
    gia12h1Ca: '',
    gia12h2Ca: '',
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
      gia8h1Ca: '',
      gia10h1Ca: '',
      gia8h2Ca: '',
      gia10h2Ca: '',
      gia12h1Ca: '',
      gia12h2Ca: '',
      ghiChu: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tenMay.trim()) {
      toast.error('Vui lòng nhập Tên Máy');
      return;
    }

    if (editingId) {
      const updated = machines.map((machine) =>
        machine.id === editingId
          ? {
              ...machine,
              tenMay: formData.tenMay.trim(),
              gia8h1Ca: formData.gia8h1Ca.trim(),
              gia10h1Ca: formData.gia10h1Ca.trim(),
              gia8h2Ca: formData.gia8h2Ca.trim(),
              gia10h2Ca: formData.gia10h2Ca.trim(),
              gia12h1Ca: formData.gia12h1Ca.trim(),
              gia12h2Ca: formData.gia12h2Ca.trim(),
              ghiChu: formData.ghiChu.trim() || undefined
            }
          : machine
      );

      saveMachines(updated);
      toast.success('Đã cập nhật thông tin máy thành công');
      resetForm();
    } else {
      const finalMaMay = generateMachineCode(machines);
      const newMachine: Machine = {
        id: crypto.randomUUID(),
        maMay: finalMaMay,
        tenMay: formData.tenMay.trim(),
        gia8h1Ca: formData.gia8h1Ca.trim(),
        gia10h1Ca: formData.gia10h1Ca.trim(),
        gia8h2Ca: formData.gia8h2Ca.trim(),
        gia10h2Ca: formData.gia10h2Ca.trim(),
        gia12h1Ca: formData.gia12h1Ca.trim(),
        gia12h2Ca: formData.gia12h2Ca.trim(),
        ghiChu: formData.ghiChu.trim() || undefined,
        createdAt: new Date().toISOString()
      };

      saveMachines([newMachine, ...machines]);
      toast.success(`Đã thêm máy mới thành công`);
      resetForm();
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingId(machine.id);
    setFormData({
      maMay: machine.maMay || '',
      tenMay: machine.tenMay || '',
      gia8h1Ca: machine.gia8h1Ca || '',
      gia10h1Ca: machine.gia10h1Ca || '',
      gia8h2Ca: machine.gia8h2Ca || '',
      gia10h2Ca: machine.gia10h2Ca || '',
      gia12h1Ca: machine.gia12h1Ca || '',
      gia12h2Ca: machine.gia12h2Ca || '',
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
    if (!window.confirm(`Chú có chắc chắn muốn xóa ${selectedIds.length} máy đã chọn?`)) return;

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
            return keyClean.includes('tên') || keyClean.includes('ten') || keyClean.includes('máy') || keyClean.includes('may');
          });
          const tenMay = targetKeyTen ? row[targetKeyTen]?.toString().trim() : '';
          if (!tenMay) return;

          const targetKeyGhiChu = Object.keys(row).find(k => k.toLowerCase().trim().includes('ghi chú') || k.toLowerCase().trim().includes('chú'));
          const ghiChu = targetKeyGhiChu ? row[targetKeyGhiChu]?.toString().trim() : '';

          const val8h1Ca = row['Giá Giờ 8h/1Ca'] || row['8h/1Ca'] || row['8h/1ca'] || '';
          const val10h1Ca = row['Giá Giờ 10h/1Ca'] || row['10h/1Ca'] || row['10h/1ca'] || '';
          const val8h2Ca = row['Giá Giờ 8h/2Ca'] || row['8h/2Ca'] || row['8h/2ca'] || '';
          const val10h2Ca = row['Giá Giờ 10h/2Ca'] || row['10h/2Ca'] || row['10h/2ca'] || '';
          const val12h1Ca = row['Giá Giờ 12h/1Ca'] || row['12h/1Ca'] || row['12h/1ca'] || '';
          const val12h2Ca = row['Giá Giờ 12h/2Ca'] || row['12h/2Ca'] || row['12h/2ca'] || '';

          const finalMaMay = generateMachineCode(currentMachines);

          const newMachineItem: Machine = {
            id: crypto.randomUUID(),
            maMay: finalMaMay,
            tenMay: tenMay,
            gia8h1Ca: val8h1Ca.toString().trim(),
            gia10h1Ca: val10h1Ca.toString().trim(),
            gia8h2Ca: val8h2Ca.toString().trim(),
            gia10h2Ca: val10h2Ca.toString().trim(),
            gia12h1Ca: val12h1Ca.toString().trim(),
            gia12h2Ca: val12h2Ca.toString().trim(),
            ghiChu: ghiChu !== "" ? ghiChu : undefined,
            createdAt: new Date().toISOString()
          };

          currentMachines.unshift(newMachineItem);
          addedCount++;
        });

        saveMachines(currentMachines);
        toast.success(`Import thành công ${addedCount} máy kèm bảng giá`);
      } catch (error) {
        console.error(error);
        toast.error('Lỗi đọc bảng giá từ file Excel');
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
      (machine.ghiChu || '').toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">🏭 1. Quản Lý Máy Móc</h2>
          <p className="text-gray-500 text-sm">Thiết lập đơn giá chạy máy theo ca làm việc</p>
        </div>
        <Badge className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 font-bold shadow-sm">
          Tổng số: {machines.length} máy
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* KHỐI TRÁI: FORM NHẬP */}
        <div className="xl:col-span-1">
          <Card className="rounded-xl border border-slate-100 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                {editingId ? 'Cập nhật máy' : 'Thêm máy mới'}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Mã máy</Label>
                  <Input 
                    value={editingId ? formData.maMay : "Hệ thống tự động sinh"} 
                    disabled 
                    className="h-9 bg-slate-50 text-xs font-mono text-slate-500" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Tên Máy *</Label>
                  <Input
                    value={formData.tenMay}
                    onChange={(e) => setFormData({ ...formData, tenMay: e.target.value })}
                    placeholder="Nhập tên thiết bị máy móc"
                    className="h-9 text-sm border-slate-200"
                  />
                </div>

                {/* 6 Ô NHẬP TIỀN */}
                <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 space-y-2">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Điền giá theo Ca máy
                  </p>
                  
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] font-medium text-slate-600 col-span-1">Giá Giờ 8h/1Ca</Label>
                      <Input value={formData.gia8h1Ca} onChange={(e) => setFormData({ ...formData, gia8h1Ca: e.target.value })} placeholder="Đơn giá" className="h-8 text-xs bg-white col-span-2" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] font-medium text-slate-600 col-span-1">Giá Giờ 10h/1Ca</Label>
                      <Input value={formData.gia10h1Ca} onChange={(e) => setFormData({ ...formData, gia10h1Ca: e.target.value })} placeholder="Đơn giá" className="h-8 text-xs bg-white col-span-2" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] font-medium text-slate-600 col-span-1">Giá Giờ 8h/2Ca</Label>
                      <Input value={formData.gia8h2Ca} onChange={(e) => setFormData({ ...formData, gia8h2Ca: e.target.value })} placeholder="Đơn giá" className="h-8 text-xs bg-white col-span-2" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] font-medium text-slate-600 col-span-1">Giá Giờ 10h/2Ca</Label>
                      <Input value={formData.gia10h2Ca} onChange={(e) => setFormData({ ...formData, gia10h2Ca: e.target.value })} placeholder="Đơn giá" className="h-8 text-xs bg-white col-span-2" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] font-medium text-slate-600 col-span-1">Giá Giờ 12h/1Ca</Label>
                      <Input value={formData.gia12h1Ca} onChange={(e) => setFormData({ ...formData, gia12h1Ca: e.target.value })} placeholder="Đơn giá" className="h-8 text-xs bg-white col-span-2" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] font-medium text-slate-600 col-span-1">Giá Giờ 12h/2Ca</Label>
                      <Input value={formData.gia12h2Ca} onChange={(e) => setFormData({ ...formData, gia12h2Ca: e.target.value })} placeholder="Đơn giá" className="h-8 text-xs bg-white col-span-2" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Ghi Chú Máy</Label>
                  <Textarea rows={2} value={formData.ghiChu} onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })} placeholder="Điền ghi chú..." className="text-xs resize-none" />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9">
                    {editingId ? 'Cập nhật' : 'Lưu máy'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1 text-xs h-9">Hủy</Button>
                </div>
              </form>

              <div className="border-t border-slate-100 mt-4 pt-3 space-y-2">
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
                <Button variant="outline" className="w-full h-10 border-dashed border-2 text-xs text-slate-600" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5 mr-2 text-slate-400" /> Tải bảng Excel lên
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KHỐI PHẢI: BẢNG CHỐNG TRÀN */}
        <div className="xl:col-span-3 w-full overflow-hidden">
          <Card className="rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 py-3.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <CardTitle className="text-base font-bold text-slate-800">Bảng chi tiết đơn giá ca kíp</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input placeholder="Tìm nhanh tên máy..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-48 h-8 text-xs border-slate-200" />
                  </div>
                  {selectedIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="h-8 text-xs">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Xóa ({selectedIds.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto scrollbar-thin">
              <div className="min-w-[980px] w-full space-y-0">
                {/* THANH TIÊU ĐỀ */}
                <div className="grid grid-cols-[35px_80px_160px_85px_85px_85px_85px_85px_85px_1fr_75px] gap-1 px-3 py-2.5 bg-slate-50/80 border-b text-[11px] font-bold text-slate-700 items-center text-center">
                  <div className="flex justify-center"><Checkbox checked={filteredMachines.length > 0 && selectedIds.length === filteredMachines.length} onCheckedChange={toggleSelectAll} className="h-3.5 w-3.5" /></div>
                  <div className="text-left text-slate-500 font-mono">ID Máy</div>
                  <div className="text-left">Tên Máy</div>
                  <div className="bg-blue-50 text-blue-700 py-1 rounded">8h/1Ca</div>
                  <div className="bg-blue-50 text-blue-700 py-1 rounded">10h/1Ca</div>
                  <div className="bg-blue-50 text-blue-700 py-1 rounded">8h/2Ca</div>
                  <div className="bg-blue-50 text-blue-700 py-1 rounded">10h/2Ca</div>
                  <div className="bg-blue-50 text-blue-700 py-1 rounded">12h/1Ca</div>
                  <div className="bg-blue-50 text-blue-700 py-1 rounded">12h/2Ca</div>
                  <div className="text-left pl-3">Ghi Chú Máy</div>
                  <div>Thao tác</div>
                </div>

                {/* KHU VỰC HIỂN THỊ */}
                {filteredMachines.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">Chưa có máy nào trong danh sách.</div>
                ) : (
                  filteredMachines.map((machine) => (
                    <div key={machine.id} className="grid grid-cols-[35px_80px_160px_85px_85px_85px_85px_85px_85px_1fr_75px] gap-1 px-3 py-2 items-center border-b text-[11px] hover:bg-slate-50/40 text-center transition-colors">
                      <div className="flex justify-center"><Checkbox checked={selectedIds.includes(machine.id)} onCheckedChange={() => toggleSelect(machine.id)} className="h-3.5 w-3.5" /></div>
                      <div className="text-left font-mono"><Badge variant="outline" className="text-[10px] px-1 bg-slate-50 font-bold">{machine.maMay}</Badge></div>
                      <div className="text-left font-semibold text-slate-900 truncate pr-1" title={machine.tenMay}>{machine.tenMay}</div>
                      
                      <div className="font-medium text-slate-800 font-mono">{machine.gia8h1Ca || '—'}</div>
                      <div className="font-medium text-slate-800 font-mono">{machine.gia10h1Ca || '—'}</div>
                      <div className="font-medium text-slate-800 font-mono">{machine.gia8h2Ca || '—'}</div>
                      <div className="font-medium text-slate-800 font-mono">{machine.gia10h2Ca || '—'}</div>
                      <div className="font-medium text-slate-800 font-mono">{machine.gia12h1Ca || '—'}</div>
                      <div className="font-medium text-slate-800 font-mono">{machine.gia12h2Ca || '—'}</div>

                      <div className="text-left text-slate-500 truncate pl-3" title={machine.ghiChu}>{machine.ghiChu || '—'}</div>
                      
                      <div className="flex justify-center gap-0.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(machine)}><Edit2 className="w-3 h-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => handleDelete(machine.id)}><Trash2 className="w-3 h-3" /></Button>
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