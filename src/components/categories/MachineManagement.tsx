// MachineManagement.tsx - Quản lý Máy móc (bỏ cột ghi_chu)
import { useState, useEffect, useRef, useCallback } from 'react';
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
  DollarSign,
  Loader2,
  Download
} from 'lucide-react';
import { supabase } from '@/supabase';
import * as XLSX from 'xlsx';

// Cấu trúc máy móc (không có ghi_chu)
interface Machine {
  id: string;
  ma_may: string;
  ten_may: string;
  gia_8h_1ca: number;
  gia_10h_1ca: number;
  gia_8h_2ca: number;
  gia_10h_2ca: number;
  gia_12h_1ca: number;
  gia_12h_2ca: number;
  created_at?: string;
  updated_at?: string;
}

const STORAGE_KEY = 'machines_data';
const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

// Hàm format số
const formatNumber = (value: number | undefined): string => {
  if (!value && value !== 0) return '—';
  return Math.round(value).toLocaleString('vi-VN');
};

export function MachineManagement() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [formData, setFormData] = useState({
    ma_may: '',
    ten_may: '',
    gia_8h_1ca: 0,
    gia_10h_1ca: 0,
    gia_8h_2ca: 0,
    gia_10h_2ca: 0,
    gia_12h_1ca: 0,
    gia_12h_2ca: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hàm load từ localStorage
  const loadFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMachines(Array.isArray(parsed) ? parsed : []);
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
  };

  // Hàm lưu vào localStorage
  const saveToLocalStorage = (data: Machine[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  };

  // Hàm tải dữ liệu
  const loadMachines = useCallback(async () => {
    setIsLoading(true);
    try {
      if (SUPABASE_CONFIGURED) {
        const { data, error } = await supabase
          .from('machines')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMachines(data || []);
      } else {
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error loading machines:', error);
      // Fallback to localStorage
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Lắng nghe Realtime (chỉ khi có Supabase)
  useEffect(() => {
    loadMachines();

    if (!SUPABASE_CONFIGURED) return;

    const channel = supabase
      .channel('machines-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'machines',
        },
        (payload) => {
          console.log('📡 Realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setMachines((prev) => [payload.new as Machine, ...prev]);
            toast.success(`Đã thêm máy mới: ${(payload.new as Machine).ten_may}`);
          } 
          else if (payload.eventType === 'UPDATE') {
            setMachines((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as Machine) : item
              )
            );
            toast.info(`Đã cập nhật máy: ${(payload.new as Machine).ten_may}`);
          } 
          else if (payload.eventType === 'DELETE') {
            setMachines((prev) =>
              prev.filter((item) => item.id !== payload.old.id)
            );
            toast.warning('Đã xóa một máy khỏi danh sách');
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connected for machines');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMachines]);

  // Tạo mã máy tự động
  const generateMachineCode = async (): Promise<string> => {
    if (SUPABASE_CONFIGURED) {
      try {
        const { data, error } = await supabase
          .from('machines')
          .select('ma_may')
          .order('ma_may', { ascending: false })
          .limit(1);
        
        if (error || !data || data.length === 0) {
          return 'MAY001';
        }
        
        const lastCode = data[0].ma_may;
        const num = parseInt(lastCode.replace('MAY', ''), 10);
        const nextNum = (isNaN(num) ? 0 : num) + 1;
        return `MAY${String(nextNum).padStart(3, '0')}`;
      } catch (e) {
        // Fallback to localStorage
      }
    }
    
    // LocalStorage fallback
    const sortedMachines = [...machines].sort((a, b) => {
      const numA = parseInt(a.ma_may.replace('MAY', ''), 10);
      const numB = parseInt(b.ma_may.replace('MAY', ''), 10);
      return numB - numA;
    });
    
    if (sortedMachines.length === 0) return 'MAY001';
    const lastCode = sortedMachines[0].ma_may;
    const num = parseInt(lastCode.replace('MAY', ''), 10);
    const nextNum = (isNaN(num) ? 0 : num) + 1;
    return `MAY${String(nextNum).padStart(3, '0')}`;
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      ma_may: '',
      ten_may: '',
      gia_8h_1ca: 0,
      gia_10h_1ca: 0,
      gia_8h_2ca: 0,
      gia_10h_2ca: 0,
      gia_12h_1ca: 0,
      gia_12h_2ca: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.ten_may.trim()) {
      toast.error('Vui lòng nhập Tên Máy');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingId) {
        const updatedMachine = {
          id: editingId,
          ma_may: formData.ma_may,
          ten_may: formData.ten_may.trim(),
          gia_8h_1ca: formData.gia_8h_1ca,
          gia_10h_1ca: formData.gia_10h_1ca,
          gia_8h_2ca: formData.gia_8h_2ca,
          gia_10h_2ca: formData.gia_10h_2ca,
          gia_12h_1ca: formData.gia_12h_1ca,
          gia_12h_2ca: formData.gia_12h_2ca,
          updated_at: new Date().toISOString()
        };

        if (SUPABASE_CONFIGURED) {
          const { error } = await supabase
            .from('machines')
            .update(updatedMachine)
            .eq('id', editingId);
          if (error) throw error;
        } else {
          // LocalStorage update
          const newMachines = machines.map(m => m.id === editingId ? updatedMachine : m);
          setMachines(newMachines);
          saveToLocalStorage(newMachines);
        }

        toast.success('Đã cập nhật thông tin máy thành công');
      } else {
        const newMaMay = await generateMachineCode();
        const newMachine = {
          id: crypto.randomUUID(),
          ma_may: newMaMay,
          ten_may: formData.ten_may.trim(),
          gia_8h_1ca: formData.gia_8h_1ca,
          gia_10h_1ca: formData.gia_10h_1ca,
          gia_8h_2ca: formData.gia_8h_2ca,
          gia_10h_2ca: formData.gia_10h_2ca,
          gia_12h_1ca: formData.gia_12h_1ca,
          gia_12h_2ca: formData.gia_12h_2ca,
          created_at: new Date().toISOString()
        };

        if (SUPABASE_CONFIGURED) {
          const { error } = await supabase.from('machines').insert(newMachine);
          if (error) throw error;
        } else {
          // LocalStorage insert
          const newMachines = [newMachine, ...machines];
          setMachines(newMachines);
          saveToLocalStorage(newMachines);
        }

        toast.success('Đã thêm máy mới thành công');
      }
      
      resetForm();
    } catch (error) {
      console.error('Error saving machine:', error);
      toast.error('Lỗi lưu dữ liệu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (machine: Machine) => {
    setEditingId(machine.id);
    setFormData({
      ma_may: machine.ma_may || '',
      ten_may: machine.ten_may || '',
      gia_8h_1ca: machine.gia_8h_1ca || 0,
      gia_10h_1ca: machine.gia_10h_1ca || 0,
      gia_8h_2ca: machine.gia_8h_2ca || 0,
      gia_10h_2ca: machine.gia_10h_2ca || 0,
      gia_12h_1ca: machine.gia_12h_1ca || 0,
      gia_12h_2ca: machine.gia_12h_2ca || 0,
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa máy này không?')) return;
    
    try {
      if (SUPABASE_CONFIGURED) {
        const { error } = await supabase.from('machines').delete().eq('id', id);
        if (error) throw error;
      } else {
        const newMachines = machines.filter(m => m.id !== id);
        setMachines(newMachines);
        saveToLocalStorage(newMachines);
      }
      toast.success('Đã xóa máy thành công');
    } catch (error) {
      console.error('Error deleting machine:', error);
      toast.error('Lỗi xóa dữ liệu');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('Chưa chọn máy nào để xóa');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} máy đã chọn?`)) return;

    try {
      if (SUPABASE_CONFIGURED) {
        const { error } = await supabase.from('machines').delete().in('id', selectedIds);
        if (error) throw error;
      } else {
        const newMachines = machines.filter(m => !selectedIds.includes(m.id));
        setMachines(newMachines);
        saveToLocalStorage(newMachines);
      }
      toast.success(`Đã xóa thành công ${selectedIds.length} máy`);
      setSelectedIds([]);
    } catch (error) {
      console.error('Error deleting machines:', error);
      toast.error('Lỗi xóa dữ liệu');
    }
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

  // TẢI FILE MẪU
  const handleDownloadTemplate = () => {
    const template = [
      {
        'Tên máy': 'Máy CNC 1',
        '8h/1Ca': 500000,
        '10h/1Ca': 600000,
        '8h/2Ca': 550000,
        '10h/2Ca': 650000,
        '12h/1Ca': 700000,
        '12h/2Ca': 800000,
      },
      {
        'Tên máy': 'Máy CNC 2',
        '8h/1Ca': 450000,
        '10h/1Ca': 540000,
        '8h/2Ca': 495000,
        '10h/2Ca': 585000,
        '12h/1Ca': 630000,
        '12h/2Ca': 720000,
      },
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_May');
    XLSX.writeFile(wb, 'mau_nhap_may_moc.xlsx');
    toast.success('Đã tải file mẫu');
  };

  // EXPORT EXCEL
  const handleExportExcel = () => {
    const exportData = machines.map(machine => ({
      'Mã máy': machine.ma_may,
      'Tên máy': machine.ten_may,
      '8h/1Ca': formatNumber(machine.gia_8h_1ca),
      '10h/1Ca': formatNumber(machine.gia_10h_1ca),
      '8h/2Ca': formatNumber(machine.gia_8h_2ca),
      '10h/2Ca': formatNumber(machine.gia_10h_2ca),
      '12h/1Ca': formatNumber(machine.gia_12h_1ca),
      '12h/2Ca': formatNumber(machine.gia_12h_2ca),
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachMay');
    XLSX.writeFile(wb, `danh_sach_may_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  // IMPORT EXCEL
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast.error('Vui lòng chọn file Excel');
      return;
    }

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        console.log('📊 Các cột trong Excel:', Object.keys(json[0] || {}));

        if (!json || json.length === 0) {
          toast.error('File Excel không có dữ liệu');
          setIsImporting(false);
          return;
        }

        let addedCount = 0;
        let errorCount = 0;
        let tempMachines = [...machines];

        for (let idx = 0; idx < json.length; idx++) {
          const row = json[idx];
          try {
            // Tìm tên máy
            let tenMay = '';
            const keys = Object.keys(row);
            for (const key of keys) {
              const lowerKey = key.toLowerCase();
              if (lowerKey.includes('tên') || lowerKey.includes('ten') || lowerKey.includes('máy') || lowerKey.includes('may')) {
                if (row[key] && row[key].toString().trim()) {
                  tenMay = row[key].toString().trim();
                  break;
                }
              }
            }
            
            if (!tenMay) {
              errorCount++;
              continue;
            }

            // Hàm lấy giá trị số
            const getNumberValue = (row: any, possibleNames: string[]): number => {
              for (const name of possibleNames) {
                const val = row[name];
                if (val !== undefined && val !== null && val !== '') {
                  let num = 0;
                  if (typeof val === 'number') {
                    num = val;
                  } else {
                    const cleanNum = String(val).replace(/[^0-9.-]/g, '');
                    num = parseFloat(cleanNum);
                  }
                  if (!isNaN(num)) return Math.round(num);
                }
              }
              return 0;
            };

            // Đọc giá từ các cột
            const gia8h1Ca = getNumberValue(row, ['8h/1Ca', 'Giá Giờ 8h/1Ca', '8h1Ca']);
            const gia10h1Ca = getNumberValue(row, ['10h/1Ca', 'Giá Giờ 10h/1Ca', '10h1Ca']);
            const gia8h2Ca = getNumberValue(row, ['8h/2Ca', 'Giá Giờ 8h/2Ca', '8h2Ca']);
            const gia10h2Ca = getNumberValue(row, ['10h/2Ca', 'Giá Giờ 10h/2Ca', '10h2Ca']);
            const gia12h1Ca = getNumberValue(row, ['12h/1Ca', 'Giá Giờ 12h/1Ca', '12h1Ca']);
            const gia12h2Ca = getNumberValue(row, ['12h/2Ca', 'Giá Giờ 12h/2Ca', '12h2Ca']);

            // Tạo mã máy mới
            const newMaMay = `MAY${String(tempMachines.length + 1 + addedCount).padStart(3, '0')}`;
            const newMachine = {
              id: crypto.randomUUID(),
              ma_may: newMaMay,
              ten_may: tenMay,
              gia_8h_1ca: gia8h1Ca,
              gia_10h_1ca: gia10h1Ca,
              gia_8h_2ca: gia8h2Ca,
              gia_10h_2ca: gia10h2Ca,
              gia_12h_1ca: gia12h1Ca,
              gia_12h_2ca: gia12h2Ca,
              created_at: new Date().toISOString()
            };

            if (SUPABASE_CONFIGURED) {
              const { error } = await supabase.from('machines').insert(newMachine);
              if (error) throw error;
            }
            
            tempMachines = [newMachine, ...tempMachines];
            addedCount++;
            
          } catch (err) {
            console.error(`Dòng ${idx + 2}: Lỗi xử lý:`, err);
            errorCount++;
          }
        }

        // Save to localStorage if not using Supabase
        if (!SUPABASE_CONFIGURED) {
          setMachines(tempMachines);
          saveToLocalStorage(tempMachines);
        } else {
          await loadMachines();
        }

        if (addedCount > 0) {
          toast.success(`Import thành công ${addedCount} máy${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`);
        } else {
          toast.error(`Import thất bại. Kiểm tra định dạng file Excel.`);
        }
        
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Lỗi đọc file Excel: ' + (error as Error).message);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast.error('Lỗi đọc file');
      setIsImporting(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const filteredMachines = machines.filter((machine) => {
    const keyword = searchTerm.toLowerCase().trim();
    return (
      (machine.ma_may || '').toLowerCase().includes(keyword) ||
      (machine.ten_may || '').toLowerCase().includes(keyword)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER BUTTONS */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadTemplate}
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Tải file mẫu
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportExcel}
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Excel
          </Button>
        </div>
        <Badge className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 font-bold shadow-sm">
          Tổng số: {machines.length} máy
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* FORM NHẬP */}
        <div className="xl:col-span-1">
          <Card className="rounded-xl border border-slate-100 shadow-sm bg-white sticky top-6">
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
                    value={editingId ? formData.ma_may : "Hệ thống tự động sinh"} 
                    disabled 
                    className="h-9 bg-slate-50 text-xs font-mono text-slate-500" 
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-600">Tên Máy *</Label>
                  <Input
                    value={formData.ten_may}
                    onChange={(e) => setFormData({ ...formData, ten_may: e.target.value })}
                    placeholder="Nhập tên thiết bị máy móc"
                    className="h-9 text-sm border-slate-200 focus:border-blue-500"
                    required
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
                      <Input type="number" value={formData.gia_8h_1ca || ''} onChange={(e) => setFormData({ ...formData, gia_8h_1ca: Number(e.target.value) })} placeholder="Đơn giá" className="h-8 text-xs bg-white col-span-2" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] font-medium text-slate-600 col-span-1">Giá Giờ 10h/1Ca</Label>
                      <Input type="number" value={formData.gia_10h_1ca || ''} onChange={(e) => setFormData({ ...formData, gia_10h_1ca: Number(e.target.value) })} placeholder="Đơn giá" className="h-8 text-xs bg-white col-span-2" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] font-medium text-slate-600 col-span-1">Giá Giờ 8h/2Ca</Label>
                      <Input type="number" value={formData.gia_8h_2ca || ''} onChange={(e) => setFormData({ ...formData, gia_8h_2ca: Number(e.target.value) })} placeholder="Đơn giá" className="h-8 text-xs bg-white col-span-2" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] font-medium text-slate-600 col-span-1">Giá Giờ 10h/2Ca</Label>
                      <Input type="number" value={formData.gia_10h_2ca || ''} onChange={(e) => setFormData({ ...formData, gia_10h_2ca: Number(e.target.value) })} placeholder="Đơn giá" className="h-8 text-xs bg-white col-span-2" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] font-medium text-slate-600 col-span-1">Giá Giờ 12h/1Ca</Label>
                      <Input type="number" value={formData.gia_12h_1ca || ''} onChange={(e) => setFormData({ ...formData, gia_12h_1ca: Number(e.target.value) })} placeholder="Đơn giá" className="h-8 text-xs bg-white col-span-2" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-2">
                      <Label className="text-[11px] font-medium text-slate-600 col-span-1">Giá Giờ 12h/2Ca</Label>
                      <Input type="number" value={formData.gia_12h_2ca || ''} onChange={(e) => setFormData({ ...formData, gia_12h_2ca: Number(e.target.value) })} placeholder="Đơn giá" className="h-8 text-xs bg-white col-span-2" />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Lưu máy')}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1 text-xs h-9">Hủy</Button>
                </div>
              </form>

              <div className="border-t border-slate-100 mt-4 pt-3 space-y-2">
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept=".xlsx,.xls" 
                  className="hidden" 
                  onChange={handleImportExcel} 
                />
                <Button 
                  variant="outline" 
                  className="w-full h-10 border-dashed border-2 text-xs text-slate-600" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                >
                  <Upload className="w-3.5 h-3.5 mr-2 text-slate-400" /> 
                  {isImporting ? 'Đang import...' : 'Tải bảng Excel lên'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BẢNG HIỂN THỊ */}
        <div className="xl:col-span-3">
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

            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[1050px] space-y-0">
                <div className="grid grid-cols-[35px_85px_170px_90px_90px_90px_90px_90px_90px_1fr_75px] gap-1 px-3 py-2.5 bg-slate-50/80 border-b text-xs font-bold text-slate-700 items-center text-center">
                  <div className="flex justify-center"><Checkbox checked={filteredMachines.length > 0 && selectedIds.length === filteredMachines.length} onCheckedChange={toggleSelectAll} className="h-3.5 w-3.5" /></div>
                  <div className="text-left text-slate-500 font-mono">Mã Máy</div>
                  <div className="text-left">Tên Máy</div>
                  <div className="text-right bg-blue-50 text-blue-700 py-1 rounded text-[11px] px-2">8h/1Ca</div>
                  <div className="text-right bg-blue-50 text-blue-700 py-1 rounded text-[11px] px-2">10h/1Ca</div>
                  <div className="text-right bg-blue-50 text-blue-700 py-1 rounded text-[11px] px-2">8h/2Ca</div>
                  <div className="text-right bg-blue-50 text-blue-700 py-1 rounded text-[11px] px-2">10h/2Ca</div>
                  <div className="text-right bg-blue-50 text-blue-700 py-1 rounded text-[11px] px-2">12h/1Ca</div>
                  <div className="text-right bg-blue-50 text-blue-700 py-1 rounded text-[11px] px-2">12h/2Ca</div>
                  <div className="text-left pl-3">Ghi Chú</div>
                  <div>Thao tác</div>
                </div>

                {filteredMachines.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">Chưa có máy nào trong danh sách.</div>
                ) : (
                  filteredMachines.map((machine) => (
                    <div key={machine.id} className="grid grid-cols-[35px_85px_170px_90px_90px_90px_90px_90px_90px_1fr_75px] gap-1 px-3 py-2 items-center border-b text-xs hover:bg-slate-50/40 transition-colors">
                      <div className="flex justify-center"><Checkbox checked={selectedIds.includes(machine.id)} onCheckedChange={() => toggleSelect(machine.id)} className="h-3.5 w-3.5" /></div>
                      <div className="text-left font-mono"><Badge variant="outline" className="text-[10px] px-1.5 bg-slate-50 font-bold">{machine.ma_may}</Badge></div>
                      <div className="text-left font-semibold text-slate-900 truncate pr-1" title={machine.ten_may}>{machine.ten_may}</div>
                      
                      <div className="text-right font-medium text-slate-800 font-mono">{formatNumber(machine.gia_8h_1ca)}</div>
                      <div className="text-right font-medium text-slate-800 font-mono">{formatNumber(machine.gia_10h_1ca)}</div>
                      <div className="text-right font-medium text-slate-800 font-mono">{formatNumber(machine.gia_8h_2ca)}</div>
                      <div className="text-right font-medium text-slate-800 font-mono">{formatNumber(machine.gia_10h_2ca)}</div>
                      <div className="text-right font-medium text-slate-800 font-mono">{formatNumber(machine.gia_12h_1ca)}</div>
                      <div className="text-right font-medium text-slate-800 font-mono">{formatNumber(machine.gia_12h_2ca)}</div>

                      <div className="text-left text-slate-500 truncate pl-3">—</div>
                      
                      <div className="flex justify-center gap-0.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(machine)}><Edit2 className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => handleDelete(machine.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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

export default MachineManagement;
