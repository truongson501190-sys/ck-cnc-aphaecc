// MachineManagement.tsx - Quản lý Máy móc (KHỚP VỚI CẤU TRÚC DB)
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Search,
  Edit2,
  Trash2,
  Upload,
  DollarSign,
  Loader2,
  Briefcase,
} from 'lucide-react';
import { supabase } from '@/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';

interface Machine {
  id: string;
  maMay: string;      // ← Đã sửa từ ma_may
  tenMay: string;     // ← Đã sửa từ ten_may
  gia_8h_1ca: number;
  gia_10h_1ca: number;
  gia_8h_2ca: number;
  gia_10h_2ca: number;
  gia_12h_1ca: number;
  gia_12h_2ca: number;
  ghi_chu?: string;   // ← Thêm cột ghi_chu
  createdAt?: string;
  updatedAt?: string;
}

const formatNumber = (value: number | undefined): string => {
  if (!value && value !== 0) return '—';
  return Math.round(value).toLocaleString('vi-VN');
};

export function MachineManagement() {
  const { user } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Kiểm tra quyền dựa trên role
  const canAdd = user?.role === 'admin';
  const canEdit = user?.role === 'admin';
  const canDelete = user?.role === 'admin';
  const canView = user?.role === 'admin';

  const [formData, setFormData] = useState({
    maMay: '',
    tenMay: '',
    gia_8h_1ca: 0,
    gia_10h_1ca: 0,
    gia_8h_2ca: 0,
    gia_10h_2ca: 0,
    gia_12h_1ca: 0,
    gia_12h_2ca: 0,
    ghi_chu: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check view permission and show error
  useEffect(() => {
    if (!canView) {
      toast.error('Bạn không có quyền xem danh sách máy móc');
    }
  }, [canView]);

  // Tải dữ liệu - DÙNG đúng tên cột trong DB
  const loadMachines = useCallback(async () => {
    if (!canView) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      setMachines(data || []);
    } catch (error) {
      console.error('Error loading machines:', error);
      toast.error('Không thể tải dữ liệu máy móc');
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  // Lắng nghe Realtime
  useEffect(() => {
    if (!canView) return;
    
    loadMachines();

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
          if (payload.eventType === 'INSERT') {
            setMachines((prev) => [payload.new as Machine, ...prev]);
            toast.success(`Đã thêm máy mới: ${(payload.new as Machine).tenMay}`);
          } else if (payload.eventType === 'UPDATE') {
            setMachines((prev) =>
              prev.map((item) => item.id === payload.new.id ? (payload.new as Machine) : item)
            );
            toast.info(`Đã cập nhật máy: ${(payload.new as Machine).tenMay}`);
          } else if (payload.eventType === 'DELETE') {
            setMachines((prev) => prev.filter((item) => item.id !== payload.old.id));
            toast.warning('Đã xóa một máy khỏi danh sách');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMachines, canView]);

  const generateMachineCode = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('maMay')
        .order('maMay', { ascending: false })
        .limit(1);
      
      if (error || !data || data.length === 0) return 'MAY001';
      
      const lastCode = data[0].maMay;
      const num = parseInt(lastCode.replace('MAY', ''), 10);
      const nextNum = (isNaN(num) ? 0 : num) + 1;
      return `MAY${String(nextNum).padStart(3, '0')}`;
    } catch (e) {
      return 'MAY001';
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      maMay: '',
      tenMay: '',
      gia_8h_1ca: 0,
      gia_10h_1ca: 0,
      gia_8h_2ca: 0,
      gia_10h_2ca: 0,
      gia_12h_1ca: 0,
      gia_12h_2ca: 0,
      ghi_chu: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tenMay.trim()) {
      toast.error('Vui lòng nhập Tên Máy');
      return;
    }

    const isEditing = !!editingId;
    if (isEditing && !canEdit) {
      toast.error('Bạn không có quyền sửa máy móc');
      return;
    }
    if (!isEditing && !canAdd) {
      toast.error('Bạn không có quyền thêm máy móc');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('machines')
          .update({
            tenMay: formData.tenMay.trim(),
            gia_8h_1ca: formData.gia_8h_1ca,
            gia_10h_1ca: formData.gia_10h_1ca,
            gia_8h_2ca: formData.gia_8h_2ca,
            gia_10h_2ca: formData.gia_10h_2ca,
            gia_12h_1ca: formData.gia_12h_1ca,
            gia_12h_2ca: formData.gia_12h_2ca,
            ghi_chu: formData.ghi_chu,
            updatedAt: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Đã cập nhật thông tin máy thành công');
      } else {
        const newMaMay = await generateMachineCode();
        const { error } = await supabase
          .from('machines')
          .insert({
            id: crypto.randomUUID(),
            maMay: newMaMay,
            tenMay: formData.tenMay.trim(),
            gia_8h_1ca: formData.gia_8h_1ca,
            gia_10h_1ca: formData.gia_10h_1ca,
            gia_8h_2ca: formData.gia_8h_2ca,
            gia_10h_2ca: formData.gia_10h_2ca,
            gia_12h_1ca: formData.gia_12h_1ca,
            gia_12h_2ca: formData.gia_12h_2ca,
            ghi_chu: formData.ghi_chu,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

        if (error) throw error;
        toast.success('Đã thêm máy mới thành công');
      }
      
      resetForm();
      await loadMachines();
    } catch (error) {
      console.error('Error saving machine:', error);
      toast.error('Lỗi lưu dữ liệu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (machine: Machine) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền sửa máy móc');
      return;
    }
    setEditingId(machine.id);
    setFormData({
      maMay: machine.maMay || '',
      tenMay: machine.tenMay || '',
      gia_8h_1ca: machine.gia_8h_1ca || 0,
      gia_10h_1ca: machine.gia_10h_1ca || 0,
      gia_8h_2ca: machine.gia_8h_2ca || 0,
      gia_10h_2ca: machine.gia_10h_2ca || 0,
      gia_12h_1ca: machine.gia_12h_1ca || 0,
      gia_12h_2ca: machine.gia_12h_2ca || 0,
      ghi_chu: machine.ghi_chu || '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      toast.error('Bạn không có quyền xóa máy móc');
      return;
    }
    if (!window.confirm('Bạn có chắc muốn xóa máy này không?')) return;
    
    try {
      const { error } = await supabase.from('machines').delete().eq('id', id);
      if (error) throw error;
      toast.success('Đã xóa máy thành công');
      await loadMachines();
      setSelectedIds(prev => prev.filter(pid => pid !== id));
    } catch (error) {
      console.error('Error deleting machine:', error);
      toast.error('Lỗi xóa dữ liệu');
    }
  };

  const handleDeleteSelected = async () => {
    if (!canDelete) {
      toast.error('Bạn không có quyền xóa máy móc');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Chưa chọn máy nào để xóa');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} máy đã chọn?`)) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('machines').delete().in('id', selectedIds);
      if (error) throw error;
      toast.success(`Đã xóa thành công ${selectedIds.length} máy`);
      setSelectedIds([]);
      await loadMachines();
    } catch (error) {
      console.error('Error deleting machines:', error);
      toast.error('Lỗi xóa dữ liệu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelect = (id: string) => {
    if (!canDelete) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!canDelete) return;
    if (selectedIds.length === filteredMachines.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMachines.map((m) => m.id));
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canAdd) {
      toast.error('Bạn không có quyền thêm máy móc');
      return;
    }

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
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        if (!json || json.length === 0) {
          toast.error('File Excel không có dữ liệu');
          return;
        }

        let addedCount = 0;
        let errorCount = 0;

        const { count: currentCount } = await supabase
          .from('machines')
          .select('*', { count: 'exact', head: true });
        
        let nextNumber = (currentCount || 0) + 1;

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

            const getNumberValue = (row: any, possibleNames: string[]): number => {
              for (const name of possibleNames) {
                const val = row[name];
                if (val !== undefined && val !== null && val !== '') {
                  let num = 0;
                  if (typeof val === 'number') num = val;
                  else {
                    const cleanNum = String(val).replace(/[^0-9.-]/g, '');
                    num = parseFloat(cleanNum);
                  }
                  if (!isNaN(num)) return Math.round(num);
                }
              }
              return 0;
            };

            const gia8h1Ca = getNumberValue(row, ['8h/1Ca', 'Giá Giờ 8h/1Ca', '8h1Ca']);
            const gia10h1Ca = getNumberValue(row, ['10h/1Ca', 'Giá Giờ 10h/1Ca', '10h1Ca']);
            const gia8h2Ca = getNumberValue(row, ['8h/2Ca', 'Giá Giờ 8h/2Ca', '8h2Ca']);
            const gia10h2Ca = getNumberValue(row, ['10h/2Ca', 'Giá Giờ 10h/2Ca', '10h2Ca']);
            const gia12h1Ca = getNumberValue(row, ['12h/1Ca', 'Giá Giờ 12h/1Ca', '12h1Ca']);
            const gia12h2Ca = getNumberValue(row, ['12h/2Ca', 'Giá Giờ 12h/2Ca', '12h2Ca']);

            const newMaMay = `MAY${String(nextNumber).padStart(3, '0')}`;
            const { error } = await supabase.from('machines').insert({
              id: crypto.randomUUID(),
              maMay: newMaMay,
              tenMay: tenMay,
              gia_8h_1ca: gia8h1Ca,
              gia_10h_1ca: gia10h1Ca,
              gia_8h_2ca: gia8h2Ca,
              gia_10h_2ca: gia10h2Ca,
              gia_12h_1ca: gia12h1Ca,
              gia_12h_2ca: gia12h2Ca,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            
            if (error) throw error;
            addedCount++;
            nextNumber++;
          } catch (err) {
            console.error(`Dòng ${idx + 2}: Lỗi xử lý:`, err);
            errorCount++;
          }
        }

        if (addedCount > 0) {
          toast.success(`Import thành công ${addedCount} máy${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`);
          await loadMachines();
        } else {
          toast.error('Import thất bại. Kiểm tra định dạng file Excel.');
        }
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Lỗi đọc file Excel');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
      (machine.maMay || '').toLowerCase().includes(keyword) ||
      (machine.tenMay || '').toLowerCase().includes(keyword)
    );
  });

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-500">Bạn không có quyền xem danh sách máy móc</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
       
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Header tổng */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800"></h2>
          <p className="text-gray-500 text-sm"></p>
        </div>
        <Badge className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 font-bold shadow-sm text-sm">
          <Briefcase className="w-4 h-4 mr-1.5" />
          Tổng số: {machines.length} máy
        </Badge>
      </div>
 
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* FORM NHẬP */}
        {(canAdd || canEdit) && (
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
                    <Input value={editingId ? formData.maMay : "Hệ thống tự động sinh"} disabled className="h-9 bg-slate-50 text-xs font-mono text-slate-500" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Tên Máy *</Label>
                    <Input
                      value={formData.tenMay}
                      onChange={(e) => setFormData({ ...formData, tenMay: e.target.value })}
                      placeholder="Nhập tên thiết bị máy móc"
                      className="h-9 text-sm border-slate-200 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Điền giá theo Ca máy
                    </p>
                    
                    <div className="space-y-2">
                      {[
                        { label: 'Giá Giờ 8h/1Ca', key: 'gia_8h_1ca' },
                        { label: 'Giá Giờ 10h/1Ca', key: 'gia_10h_1ca' },
                        { label: 'Giá Giờ 8h/2Ca', key: 'gia_8h_2ca' },
                        { label: 'Giá Giờ 10h/2Ca', key: 'gia_10h_2ca' },
                        { label: 'Giá Giờ 12h/1Ca', key: 'gia_12h_1ca' },
                        { label: 'Giá Giờ 12h/2Ca', key: 'gia_12h_2ca' },
                      ].map((field) => (
                        <div key={field.key} className="grid grid-cols-3 items-center gap-2">
                          <Label className="text-[11px] font-medium text-slate-600 col-span-1">{field.label}</Label>
                          <Input
                            type="number"
                            value={(formData as any)[field.key] || ''}
                            onChange={(e) => setFormData({ ...formData, [field.key]: Number(e.target.value) })}
                            placeholder="Đơn giá"
                            className="h-8 text-xs bg-white col-span-2"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Ghi chú</Label>
                    <Input
                      value={formData.ghi_chu}
                      onChange={(e) => setFormData({ ...formData, ghi_chu: e.target.value })}
                      placeholder="Nhập ghi chú (nếu có)"
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9" disabled={isSubmitting}>
                      {isSubmitting ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Lưu máy')}
                    </Button>
                    {editingId && (
                      <Button type="button" variant="outline" onClick={resetForm} className="flex-1 text-xs h-9">
                        Hủy
                      </Button>
                    )}
                  </div>
                </form>

                {/* IMPORT EXCEL */}
                {canAdd && (
                  <div className="border-t border-slate-100 mt-4 pt-3">
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
                      {isImporting ? 'Đang import...' : 'Import Excel'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* BẢNG HIỂN THỊ */}
        <div className={canAdd || canEdit ? "xl:col-span-3" : "xl:col-span-4"}>
          <Card className="rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 py-3.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <CardTitle className="text-base font-bold text-slate-800">Bảng chi tiết đơn giá ca kíp</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input 
                      placeholder="Tìm nhanh tên máy..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="pl-9 w-48 h-8 text-xs border-slate-200" 
                    />
                  </div>
                  {selectedIds.length > 0 && canDelete && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleDeleteSelected} 
                      className="h-8 text-xs"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> 
                      Xóa ({selectedIds.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <div className="min-w-[1050px] space-y-0">
                <div className={`grid ${canDelete ? 'grid-cols-[35px_85px_170px_90px_90px_90px_90px_90px_90px_75px]' : 'grid-cols-[85px_170px_90px_90px_90px_90px_90px_90px_75px]'} gap-1 px-3 py-2.5 bg-slate-50/80 border-b text-xs font-bold text-slate-700 items-center text-center`}>
                  {canDelete && (
                    <div className="flex justify-center">
                      <Checkbox 
                        checked={filteredMachines.length > 0 && selectedIds.length === filteredMachines.length} 
                        onCheckedChange={toggleSelectAll} 
                        className="h-4 w-4 transform scale-50 rounded-sm border-slate-900 data-[state=checked]:bg-blue-600"
                      />
                    </div>
                  )}
                  <div className="text-left text-slate-500 font-mono">Mã Máy</div>
                  <div className="text-left">Tên Máy</div>
                  <div className="text-right bg-blue-50 text-blue-700 py-1 rounded text-[11px] px-2">8h/1Ca</div>
                  <div className="text-right bg-blue-50 text-blue-700 py-1 rounded text-[11px] px-2">10h/1Ca</div>
                  <div className="text-right bg-blue-50 text-blue-700 py-1 rounded text-[11px] px-2">8h/2Ca</div>
                  <div className="text-right bg-blue-50 text-blue-700 py-1 rounded text-[11px] px-2">10h/2Ca</div>
                  <div className="text-right bg-blue-50 text-blue-700 py-1 rounded text-[11px] px-2">12h/1Ca</div>
                  <div className="text-right bg-blue-50 text-blue-700 py-1 rounded text-[11px] px-2">12h/2Ca</div>
                  <div>Thao tác</div>
                </div>

                {filteredMachines.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Chưa có máy nào trong danh sách.
                  </div>
                ) : (
                  filteredMachines.map((machine) => (
                    <div key={machine.id} className={`grid ${canDelete ? 'grid-cols-[35px_85px_170px_90px_90px_90px_90px_90px_90px_75px]' : 'grid-cols-[85px_170px_90px_90px_90px_90px_90px_90px_75px]'} gap-1 px-3 py-2 items-center border-b text-xs hover:bg-slate-50/40 transition-colors`}>
                      {canDelete && (
                        <div className="flex justify-center">
                          <Checkbox 
                            checked={selectedIds.includes(machine.id)} 
                            onCheckedChange={() => toggleSelect(machine.id)} 
                            className="h-4 w-4 transform scale-50 rounded-sm border-slate-900 data-[state=checked]:bg-blue-600"
                          />
                        </div>
                      )}
                      <div className="text-left font-mono">
                        <Badge variant="outline" className="text-[10px] px-1.5 bg-slate-50 font-bold">
                          {machine.maMay}
                        </Badge>
                      </div>
                      <div className="text-left font-semibold text-slate-900 truncate pr-1" title={machine.tenMay}>
                        {machine.tenMay}
                      </div>
                      <div className="text-right font-medium text-slate-800 font-mono">{formatNumber(machine.gia_8h_1ca)}</div>
                      <div className="text-right font-medium text-slate-800 font-mono">{formatNumber(machine.gia_10h_1ca)}</div>
                      <div className="text-right font-medium text-slate-800 font-mono">{formatNumber(machine.gia_8h_2ca)}</div>
                      <div className="text-right font-medium text-slate-800 font-mono">{formatNumber(machine.gia_10h_2ca)}</div>
                      <div className="text-right font-medium text-slate-800 font-mono">{formatNumber(machine.gia_12h_1ca)}</div>
                      <div className="text-right font-medium text-slate-800 font-mono">{formatNumber(machine.gia_12h_2ca)}</div>
                      <div className="flex justify-center gap-0.5">
                        {canEdit && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-blue-600 hover:bg-blue-50" 
                            onClick={() => handleEdit(machine)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-red-500 hover:bg-red-50" 
                            onClick={() => handleDelete(machine.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
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