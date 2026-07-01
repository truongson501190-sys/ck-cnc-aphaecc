//Quản lý danh mục -> dự án (ĐÃ SỬA - KHỚP VỚI CẤU TRÚC DB + TỐI ƯU)
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Briefcase, Upload, ListFilter, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/supabase';
import { usePermission } from '@/hooks/usePermission';

interface Project {
  id: string;
  maDuAn: string;
  tenDuAn: string;
  ghiChu?: string;
  created_by?: string;
  createdAt: string;
}

export function ProjectManagement() {
  const { canView: permCanView, canEdit: permCanEdit } = usePermission();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Kiểm tra quyền dựa trên permission system
  const canView = permCanView('du_an');
  const canAdd = permCanEdit('du_an');
  const canEdit = permCanEdit('du_an');
  const canDelete = permCanEdit('du_an');
  
  const [formData, setFormData] = useState({
    maDuAn: '',
    tenDuAn: '',
    ghiChu: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check view permission and show error
  useEffect(() => {
    if (!canView) {
      toast.error('Bạn không có quyền xem danh sách dự án');
    }
  }, [canView]);

  // Tải dữ liệu từ Supabase - DÙNG TÊN CỘT ĐÚNG
  const loadProjects = useCallback(async () => {
    if (!canView) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Không thể tải dữ liệu dự án');
    } finally {
      setIsLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.maDuAn.trim() || !formData.tenDuAn.trim()) {
      toast.error('Vui lòng điền mã dự án và tên dự án');
      return;
    }

    const isEditing = !!editingId;
    if (isEditing && !canEdit) {
      toast.error('Bạn không có quyền sửa dự án');
      return;
    }
    if (!isEditing && !canAdd) {
      toast.error('Bạn không có quyền thêm dự án');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userId = authUser?.email || 'unknown';

      if (isEditing) {
        const { error } = await supabase
          .from('projects')
          .update({
            tenDuAn: formData.tenDuAn.trim(),
            ghiChu: formData.ghiChu.trim(),
            updatedAt: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Đã cập nhật dự án thành công');
        setEditingId(null);
      } else {
        // Kiểm tra trùng mã dự án
        const { data: existing } = await supabase
          .from('projects')
          .select('id')
          .eq('maDuAn', formData.maDuAn.trim())
          .maybeSingle();

        if (existing) {
          toast.error('Mã dự án này đã tồn tại');
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from('projects')
          .insert({
            id: crypto.randomUUID(),
            maDuAn: formData.maDuAn.trim(),
            tenDuAn: formData.tenDuAn.trim(),
            ghiChu: formData.ghiChu.trim(),
            trang_thai: 'active',
            created_by: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

        if (error) throw error;
        toast.success('Đã thêm dự án mới thành công');
      }

      setFormData({
        maDuAn: '',
        tenDuAn: '',
        ghiChu: ''
      });
      await loadProjects();
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Lỗi lưu dữ liệu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (project: Project) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền sửa dự án');
      return;
    }
    setFormData({
      maDuAn: project.maDuAn || '',
      tenDuAn: project.tenDuAn,
      ghiChu: project.ghiChu || ''
    });
    setEditingId(project.id);
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      toast.error('Bạn không có quyền xóa dự án');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa dự án này không?')) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      toast.success('Đã xóa dự án thành công');
      await loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Lỗi xóa dữ liệu');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!canDelete) {
      toast.error('Bạn không có quyền xóa dự án');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Chưa chọn dự án nào để xóa');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} dự án đang tích chọn không?`)) return;

    setIsDeleting(true);
    try {
      for (const id of selectedIds) {
        await supabase.from('projects').delete().eq('id', id);
      }
      toast.success(`Đã xóa thành công ${selectedIds.length} dự án`);
      setSelectedIds([]);
      await loadProjects();
    } catch (error) {
      console.error('Error deleting projects:', error);
      toast.error('Lỗi xóa dữ liệu');
    } finally {
      setIsDeleting(false);
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
    if (selectedIds.length === filteredProjects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProjects.map((p) => p.id));
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      maDuAn: '',
      tenDuAn: '',
      ghiChu: ''
    });
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canAdd) {
      toast.error('Bạn không có quyền thêm dự án');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet) as Record<string, unknown>[];

        const getValueByHeaders = (row: Record<string, unknown>, possibleHeaders: string[]) => {
          const rowKeys = Object.keys(row);
          const normalize = (str: string) => 
            str.toLowerCase()
               .normalize('NFD')
               .replace(/[\u0300-\u036f]/g, '')
               .replace(/\s+/g, '')
               .replace(/[^a-z0-9]/g, '');

          const normalizedHeaders = possibleHeaders.map(normalize);
          const foundKey = rowKeys.find(key => {
            const normalizedKey = normalize(key);
            return normalizedHeaders.some(nh => normalizedKey === nh || normalizedKey.includes(nh));
          });
          return foundKey ? row[foundKey] : undefined;
        };

        const { data: { user: authUser } } = await supabase.auth.getUser();
        const userId = authUser?.email || 'unknown';
        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        // Xử lý từng dòng
        for (const row of json) {
          const maDuAn = (getValueByHeaders(row, ['maDuAn', 'Mã dự án', 'Mã Dự Án', 'ma_du_an', 'Ma Du An', 'Mã DA']) || '').toString().trim();
          const tenDuAn = (getValueByHeaders(row, ['tenDuAn', 'Tên dự án', 'Tên Dự Án', 'ten_du_an', 'Ten Du An', 'Tên DA']) || '').toString().trim();
          const ghiChu = (getValueByHeaders(row, ['ghiChu', 'Ghi chú', 'Ghi Chú', 'ghi_chu', 'Ghi Chu', 'Note']) || '').toString().trim();

          if (!maDuAn || !tenDuAn) {
            skippedCount++;
            continue;
          }

          // Kiểm tra tồn tại
          const { data: existing } = await supabase
            .from('projects')
            .select('id')
            .eq('maDuAn', maDuAn)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('projects')
              .update({
                tenDuAn: tenDuAn,
                ghiChu: ghiChu,
                updatedAt: new Date().toISOString()
              })
              .eq('maDuAn', maDuAn);
            updatedCount++;
          } else {
            await supabase
              .from('projects')
              .insert({
                id: crypto.randomUUID(),
                maDuAn: maDuAn,
                tenDuAn: tenDuAn,
                ghiChu: ghiChu,
                trang_thai: 'active',
                created_by: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            addedCount++;
          }
        }

        toast.success(`Đã import: Thêm mới ${addedCount}, cập nhật ${updatedCount}. Bỏ qua ${skippedCount} dòng.`);
        await loadProjects();
      } catch (error) {
        console.error('Error importing Excel:', error);
        toast.error('Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.');
      } finally {
        setIsImporting(false);
      }
    };
    
    reader.onerror = () => {
      toast.error('Lỗi đọc file');
      setIsImporting(false);
    };
    
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredProjects = projects.filter(project =>
    project.maDuAn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.tenDuAn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.ghiChu && project.ghiChu.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Briefcase className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-500">Bạn không có quyền xem danh sách dự án</p>
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
          Tổng số: {projects.length} dự án
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* KHỐI TRÁI: FORM NHẬP / IMPORT */}
        <div className="xl:col-span-1">
          <Card className="rounded-xl border border-slate-100 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                {editingId ? 'Chỉnh sửa dự án' : 'Thêm dự án mới'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <Label htmlFor="maDuAn" className="text-xs font-semibold text-slate-600">Mã dự án *</Label>
                  <Input
                    id="maDuAn"
                    value={formData.maDuAn}
                    onChange={(e) => setFormData({ ...formData, maDuAn: e.target.value })}
                    placeholder="Ví dụ: DA001"
                    className="h-9 text-sm border-slate-200 uppercase font-mono"
                    disabled={!canAdd && !editingId}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tenDuAn" className="text-xs font-semibold text-slate-600">Tên dự án *</Label>
                  <Input
                    id="tenDuAn"
                    value={formData.tenDuAn}
                    onChange={(e) => setFormData({ ...formData, tenDuAn: e.target.value })}
                    placeholder="Nhập tên dự án hoặc tên khách hàng"
                    className="h-9 text-sm border-slate-200"
                    disabled={!canAdd && !editingId}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ghiChu" className="text-xs font-semibold text-slate-600">Ghi chú dự án</Label>
                  <Textarea
                    id="ghiChu"
                    value={formData.ghiChu}
                    onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                    placeholder="Nhập ghi chú chi tiết (nếu có)"
                    rows={3}
                    className="text-xs resize-none border-slate-200"
                    disabled={!canAdd && !editingId}
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9" 
                    disabled={isSubmitting || (!canAdd && !editingId)}
                  >
                    {isSubmitting ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Lưu dự án')}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 text-xs h-9">
                      Hủy
                    </Button>
                  )}
                </div>
              </form>

              {/* Import Excel - chỉ hiển thị nếu có quyền thêm */}
              {canAdd && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <Label className="text-xs font-bold text-slate-700 block">Tải bảng Excel mẫu lên</Label>
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
                    className="w-full h-10 border-dashed border-2 text-xs text-slate-600 hover:bg-slate-50"
                    disabled={isImporting}
                  >
                    <Upload className="w-3.5 h-3.5 mr-2 text-slate-400" />
                    {isImporting ? 'Đang import...' : 'Import tệp dữ liệu Excel'}
                  </Button>
                  <p className="text-[10px] text-gray-400 leading-tight">
                    * Yêu cầu file Excel chứa tiêu đề cột rõ ràng: <code className="font-mono bg-slate-50 px-1 py-0.5 rounded text-blue-600">maDuAn</code>, <code className="font-mono bg-slate-50 px-1 py-0.5 rounded text-blue-600">tenDuAn</code>.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* KHỐI PHẢI: BẢNG DANH SÁCH DỰ ÁN */}
        <div className="xl:col-span-2 w-full overflow-hidden">
          <Card className="rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 py-3.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <ListFilter className="w-4 h-4 text-blue-500" />
                  <CardTitle className="text-base font-bold text-slate-800">Danh sách dự án hiện hành</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                    <Input
                      placeholder="Tìm mã, tên dự án..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-48 sm:w-56 h-8 text-xs border-slate-200"
                    />
                  </div>
                  {selectedIds.length > 0 && canDelete && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={handleDeleteSelected} 
                      className="h-8 text-xs font-medium px-2.5"
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> 
                      {isDeleting ? 'Đang xóa...' : `Xóa (${selectedIds.length})`}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-xs">
                  <Briefcase className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  {projects.length === 0 ? 'Chưa có dữ liệu dự án nào trong hệ thống.' : 'Không tìm thấy kết quả phù hợp.'}
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[550px] w-full">
                    {/* DÒNG TIÊU ĐỀ CỘT */}
                    <div className="grid grid-cols-[40px_100px_180px_1fr_80px] gap-2 px-4 py-2.5 bg-slate-50/80 border-b text-[11px] font-bold text-slate-700 items-center text-center">
                      {canDelete && (
                        <div className="flex justify-center">
                          <Checkbox 
                            checked={filteredProjects.length > 0 && selectedIds.length === filteredProjects.length} 
                            onCheckedChange={toggleSelectAll} 
                            className="h-4 w-4 transform scale-50 rounded-sm border-slate-900 data-[state=checked]:bg-blue-600"
                          />
                        </div>
                      )}
                      <div className="text-left font-semibold">Mã Dự Án</div>
                      <div className="text-left">Tên Dự Án</div>
                      <div className="text-left">Ghi Chú Công Việc</div>
                      <div>Thao tác</div>
                    </div>

                    {/* HIỂN THỊ CÁC DÒNG DỮ LIỆU */}
                    <div className="divide-y divide-slate-100">
                      {filteredProjects.map((project) => {
                        const isChecked = selectedIds.includes(project.id);
                        return (
                          <div
                            key={project.id}
                            className={`grid grid-cols-[40px_100px_180px_1fr_80px] gap-2 px-4 py-2.5 text-[11px] items-center text-center transition-colors hover:bg-slate-50/40 ${
                              isChecked ? 'bg-blue-50/20' : ''
                            }`}
                          >
                            {canDelete && (
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleSelect(project.id)}
                                  className="h-4 w-4 transform scale-50 rounded-sm border-slate-900 data-[state=checked]:bg-blue-600"
                                />
                              </div>
                            )}
                            <div className="text-left font-mono">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-50 text-slate-700 font-bold border-slate-200">
                                {project.maDuAn}
                              </Badge>
                            </div>
                            <div className="text-left font-semibold text-slate-800 truncate pr-1" title={project.tenDuAn}>
                              {project.tenDuAn}
                            </div>
                            <div className="text-left text-slate-500 truncate" title={project.ghiChu}>
                              {project.ghiChu || '—'}
                            </div>
                            <div className="flex justify-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                onClick={() => handleEdit(project)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              {canDelete && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-red-500 hover:bg-red-50"
                                  onClick={() => handleDelete(project.id)}
                                  disabled={isDeleting}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}