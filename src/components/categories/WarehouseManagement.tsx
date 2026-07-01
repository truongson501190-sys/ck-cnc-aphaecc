//Quản lý danh mục -> kho (ĐÃ SỬA DÙNG SUPABASE - CAMELCASE)
import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Edit2, Package, Plus, Search, Trash2, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';

interface Warehouse {
  id: string;
  maKho: string;
  tenKho: string;
  ghiChu?: string;
  created_by?: string;
  createdAt: string;
}

export function WarehouseManagement() {
  const { user } = useAuth();
  const { canEdit } = usePermission();
  const canEditOrDelete = canEdit('kho');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    maKho: '',
    tenKho: '',
    ghiChu: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tải dữ liệu từ Supabase
  const loadWarehouses = async () => {
    setIsLoading(true);
    try {
      // Dùng đúng tên cột trong database (camelCase)
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
      toast.error('Không thể tải dữ liệu kho');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      maKho: '',
      tenKho: '',
      ghiChu: '',
    });
  };

  const generateWarehouseCode = async () => {
    const { count } = await supabase
      .from('warehouses')
      .select('*', { count: 'exact', head: true });
    const nextNumber = (count || 0) + 1;
    return `KHO${String(nextNumber).padStart(3, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const tenKho = formData.tenKho.trim();
    if (!tenKho) {
      toast.error('Vui lòng nhập tên kho');
      return;
    }

    const msnv = user?.msnv || 'unknown';

    if (editingId) {
      const { error } = await supabase
        .from('warehouses')
        .update({
          tenKho: tenKho,
          ghiChu: formData.ghiChu.trim(),
          updatedAt: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;
      toast.success('Cập nhật kho thành công');
    } else {
      const newMaKho = await generateWarehouseCode();
      const { error } = await supabase
        .from('warehouses')
        .insert({
          id: crypto.randomUUID(),
          maKho: newMaKho,
          tenKho: tenKho,
          ghiChu: formData.ghiChu.trim(),
          status: 'active',
          created_by: msnv,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Thêm kho thành công');
    }

    resetForm();
    await loadWarehouses();
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingId(warehouse.id);
    setFormData({
      maKho: warehouse.maKho || '',
      tenKho: warehouse.tenKho,
      ghiChu: warehouse.ghiChu || '',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa kho này?')) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('warehouses').delete().eq('id', id);
      if (error) throw error;
      toast.success('Đã xóa kho');
      await loadWarehouses();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('Vui lòng chọn kho cần xóa');
      return;
    }
    if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.length} kho?`)) return;
    
    setIsDeleting(true);
    try {
      for (const id of selectedIds) {
        await supabase.from('warehouses').delete().eq('id', id);
      }
      setSelectedIds([]);
      toast.success('Đã xóa nhiều kho');
      await loadWarehouses();
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredWarehouses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredWarehouses.map((warehouse) => warehouse.id));
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

        const msnv = user?.msnv || 'unknown';
        let added = 0;
        let errorCount = 0;

        const { count: currentCount } = await supabase
          .from('warehouses')
          .select('*', { count: 'exact', head: true });
        
        let nextNumber = (currentCount || 0) + 1;

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          try {
            // Lấy tên kho từ nhiều tên cột khác nhau
            let tenKho = row['Tên kho'] || row['tenKho'] || row['ten_kho'] || '';
            if (!tenKho) {
              errorCount++;
              continue;
            }
            
            tenKho = tenKho.toString().trim();
            let maKho = row['Mã kho'] || row['maKho'] || row['ma_kho'] || '';
            maKho = maKho.toString().trim();
            let ghiChu = row['Ghi chú'] || row['ghiChu'] || row['ghi_chu'] || '';
            ghiChu = ghiChu.toString().trim();

            // Kiểm tra mã kho đã tồn tại chưa
            let finalMaKho = maKho;
            if (!finalMaKho) {
              finalMaKho = `KHO${String(nextNumber).padStart(3, '0')}`;
            }

            const { data: existing } = await supabase
              .from('warehouses')
              .select('id')
              .eq('maKho', finalMaKho)
              .maybeSingle();

            if (existing) {
              // Cập nhật
              await supabase
                .from('warehouses')
                .update({
                  tenKho: tenKho,
                  ghiChu: ghiChu,
                  updatedAt: new Date().toISOString()
                })
                .eq('maKho', finalMaKho);
            } else {
              // Thêm mới
              await supabase.from('warehouses').insert({
                id: crypto.randomUUID(),
                maKho: finalMaKho,
                tenKho: tenKho,
                ghiChu: ghiChu,
                status: 'active',
                created_by: msnv,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              added++;
              nextNumber++;
            }
          } catch (err) {
            console.error(`Dòng ${i + 2}: Lỗi xử lý:`, err);
            errorCount++;
          }
        }

        if (added > 0) {
          toast.success(`Import thành công: ${added} thêm mới${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`);
        } else if (errorCount > 0) {
          toast.warning(`Import hoàn tất: ${errorCount} dòng lỗi, không có dòng mới`);
        } else {
          toast.info('Không có dữ liệu mới để import');
        }
        await loadWarehouses();
      } catch (error) {
        console.error(error);
        toast.error('Lỗi đọc file Excel');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredWarehouses = warehouses.filter(
    (warehouse) =>
      warehouse.maKho?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.tenKho.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.ghiChu?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold"></h2>
          <p className="text-sm text-muted-foreground"></p>
        </div>
        <Badge variant="secondary">
          <Package className="w-4 h-4 mr-1" />
          {warehouses.length} kho
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* FORM */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>{editingId ? 'Chỉnh sửa kho' : 'Thêm kho mới'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Mã kho</Label>
                <Input
                  value={editingId ? formData.maKho : (warehouses.length > 0 ? `KHO${String(warehouses.length + 1).padStart(3, '0')}` : 'KHO001')}
                  disabled
                />
              </div>
              <div>
                <Label>Tên kho</Label>
                <Input
                  value={formData.tenKho}
                  onChange={(e) => setFormData({ ...formData, tenKho: e.target.value })}
                  placeholder="Nhập tên kho"
                  disabled={!canEditOrDelete}
                />
              </div>
              <div>
                <Label>Ghi chú</Label>
                <Textarea
                  rows={3}
                  value={formData.ghiChu}
                  onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                  placeholder="Ghi chú..."
                  disabled={!canEditOrDelete}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={!canEditOrDelete}>
                  <Plus className="w-4 h-4 mr-2" />
                  {editingId ? 'Cập nhật' : 'Thêm kho'}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm} disabled={!canEditOrDelete}>
                    Hủy
                  </Button>
                )}
              </div>
            </form>

            {/* IMPORT */}
            <div className="border-t mt-6 pt-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleImportExcel}
              />
              <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={!canEditOrDelete}>
                <Upload className="w-4 h-4 mr-2" />
                Import Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* TABLE */}
        <Card className="xl:col-span-2">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách kho</CardTitle>
              {selectedIds.length > 0 && canEditOrDelete && (
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={isDeleting || !canEditOrDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa ({selectedIds.length})
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10"
                placeholder="Tìm kiếm kho..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredWarehouses.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">Không có dữ liệu kho</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="w-[40px] py-3">
                        <Checkbox
                          checked={selectedIds.length === filteredWarehouses.length && filteredWarehouses.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="h-4 w-4 transform scale-50 rounded-sm border-slate-900 data-[state=checked]:bg-blue-600"
                        />
                      </th>
                      <th className="text-left py-3">Mã kho</th>
                      <th className="text-left py-3">Tên kho</th>
                      <th className="text-left py-3">Ghi chú</th>
                      <th className="text-right py-3">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWarehouses.map((warehouse) => (
                      <tr key={warehouse.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 text-center">
                          <Checkbox
                            checked={selectedIds.includes(warehouse.id)}
                            onCheckedChange={() => toggleSelect(warehouse.id)}
                            className="h-4 w-4 transform scale-50 rounded-sm border-slate-900 data-[state=checked]:bg-blue-600"
                          />
                        </td>
                        <td className="py-3">
                          <Badge variant="outline">{warehouse.maKho}</Badge>
                        </td>
                        <td className="py-3 font-medium">{warehouse.tenKho}</td>
                        <td className="py-3 text-muted-foreground">{warehouse.ghiChu || '-'}</td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(warehouse)} disabled={!canEditOrDelete}>
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(warehouse.id)} disabled={isDeleting || !canEditOrDelete}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}