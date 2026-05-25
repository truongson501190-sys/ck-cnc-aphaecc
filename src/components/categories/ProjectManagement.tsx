//Quản lý danh mục -> du an
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Briefcase, Upload, ListFilter } from 'lucide-react';
import { Project } from '@/types/categories';
import * as XLSX from 'xlsx';

export function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    maDuAn: '',
    tenDuAn: '',
    ghiChu: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProjects();
    
    // Listen for sync events
    const handleSync = () => loadProjects();
    window.addEventListener('app-data-synced', handleSync);
    return () => window.removeEventListener('app-data-synced', handleSync);
  }, []);

  const loadProjects = () => {
    try {
      const saved = localStorage.getItem('projects');
      if (saved) {
        setProjects(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const saveProjects = (newProjects: Project[]) => {
    try {
      localStorage.setItem('projects', JSON.stringify(newProjects));
      setProjects(newProjects);
      setSelectedIds([]); // Reset lựa chọn sau khi lưu dữ liệu mới
    } catch (error) {
      console.error('Error saving projects:', error);
      toast.error('Lỗi khi lưu dữ liệu');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.maDuAn.trim() || !formData.tenDuAn.trim()) {
      toast.error('Vui lòng điền mã dự án và tên dự án');
      return;
    }

    // Check for duplicate code
    const isDuplicateMa = projects.some(p => 
      p.maDuAn === formData.maDuAn.trim() && p.id !== editingId
    );
    
    if (isDuplicateMa) {
      toast.error('Mã dự án này đã tồn tại');
      return;
    }

    if (editingId) {
      const updatedProjects = projects.map(project =>
        project.id === editingId
          ? { ...project, ...formData }
          : project
      );
      saveProjects(updatedProjects);
      toast.success('Đã cập nhật dự án thành công');
      setEditingId(null);
    } else {
      const newProject: Project = {
        id: Date.now().toString(),
        maDuAn: formData.maDuAn.trim(),
        tenDuAn: formData.tenDuAn.trim(),
        ghiChu: formData.ghiChu.trim(),
        createdAt: new Date().toISOString()
      };
      saveProjects([newProject, ...projects]);
      toast.success('Đã thêm dự án mới thành công');
    }

    setFormData({
      maDuAn: '',
      tenDuAn: '',
      ghiChu: ''
    });
  };

  const handleEdit = (project: Project) => {
    setFormData({
      maDuAn: project.maDuAn ?? '',
      tenDuAn: project.tenDuAn,
      ghiChu: project.ghiChu || ''
    });
    setEditingId(project.id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Chú có chắc chắn muốn xóa dự án này?')) {
      const updatedProjects = projects.filter(project => project.id !== id);
      saveProjects(updatedProjects);
      toast.success('Đã xóa dự án thành công');
    }
  };

  // HÀM XỬ LÝ XÓA HÀNG LOẠT ĐÃ CHỌN TRÊN THẺ
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) {
      toast.error('Chú chưa chọn dự án nào để xóa');
      return;
    }
    if (!window.confirm(`Chú có chắc chắn muốn xóa ${selectedIds.length} dự án đang tích chọn không?`)) return;

    const updatedProjects = projects.filter(project => !selectedIds.includes(project.id));
    saveProjects(updatedProjects);
    toast.success(`Đã xóa thành công ${selectedIds.length} dự án`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
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

        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        const currentProjects = [...projects];

        json.forEach(row => {
          const maDuAn = (getValueByHeaders(row, ['maDuAn', 'Mã dự án', 'Mã Dự Án', 'ma_du_an', 'Ma Du An', 'Mã DA']) || '').toString().trim();
          const tenDuAn = (getValueByHeaders(row, ['tenDuAn', 'Tên dự án', 'Tên Dự Án', 'ten_du_an', 'Ten Du An', 'Tên DA']) || '').toString().trim();
          const ghiChu = (getValueByHeaders(row, ['ghiChu', 'Ghi chú', 'Ghi Chú', 'ghi_chu', 'Ghi Chu', 'Note']) || '').toString().trim();

          if (!maDuAn || !tenDuAn) {
            skippedCount++;
            return;
          }

          const existingIndex = currentProjects.findIndex(p => p.maDuAn === maDuAn);
          
          if (existingIndex >= 0) {
            currentProjects[existingIndex] = {
              ...currentProjects[existingIndex],
              tenDuAn: tenDuAn || currentProjects[existingIndex].tenDuAn,
              ghiChu: ghiChu || currentProjects[existingIndex].ghiChu
            };
            updatedCount++;
          } else {
            currentProjects.unshift({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              maDuAn,
              tenDuAn,
              ghiChu: ghiChu || undefined,
              createdAt: new Date().toISOString()
            });
            addedCount++;
          }
        });

        saveProjects(currentProjects);
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

  const filteredProjects = projects.filter(project =>
    project.maDuAn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.tenDuAn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.ghiChu && project.ghiChu.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Header tổng */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">💼 Quản Lý Danh Mục Dự Án</h2>
          <p className="text-gray-500 text-sm">Quản lý đồng bộ danh sách các dự án và thông tin khách hàng</p>
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
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-9">
                    {editingId ? 'Cập nhật' : 'Lưu dự án'}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 text-xs h-9">
                      Hủy
                    </Button>
                  )}
                </div>
              </form>

              {/* Import Excel */}
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
                >
                  <Upload className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  Import tệp dữ liệu Excel
                </Button>
                <p className="text-[10px] text-gray-400 leading-tight">
                  * Yêu cầu file Excel chứa tiêu đề cột rõ ràng: <code className="font-mono bg-slate-50 px-1 py-0.5 rounded text-blue-600">maDuAn</code>, <code className="font-mono bg-slate-50 px-1 py-0.5 rounded text-blue-600">tenDuAn</code>.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KHỐI PHẢI: BẢNG THIẾT KẾ ĐẸP, CHỐNG TRÀN VÀ CÓ TIÊU ĐỀ DÒNG */}
        <div className="xl:col-span-2 w-full overflow-hidden">
          <Card className="rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 py-3.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                  <ListFilter className="w-4 h-4 text-blue-500" /> Danh sách dự án hiện hành
                </CardTitle>
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
                  {selectedIds.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="h-8 text-xs font-medium px-2.5">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Xóa ({selectedIds.length})
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
                    {/* DÒNG TIÊU ĐỀ CỘT CHUẨN ĐẸP CỦA CHÚ */}
                    <div className="grid grid-cols-[40px_100px_180px_1fr_80px] gap-2 px-4 py-2.5 bg-slate-50/80 border-b text-[11px] font-bold text-slate-700 items-center text-center">
                      <div className="flex justify-center">
                        <Checkbox 
                          checked={filteredProjects.length > 0 && selectedIds.length === filteredProjects.length} 
                          onCheckedChange={toggleSelectAll} 
                          className="h-3.5 w-3.5 border-slate-300 data-[state=checked]:bg-blue-600" 
                        />
                      </div>
                      <div className="text-left font-semibold">Mã Dự Án</div>
                      <div className="text-left">Tên Dự Án</div>
                      <div className="text-left">Ghi Chú Công Việc</div>
                      <div>Thao tác</div>
                    </div>

                    {/* HIỂN THỊ CÁC DÒNG DỮ LIỆU CÓ Ô TÍCH CHỌN */}
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
                            <div className="flex justify-center">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleSelect(project.id)}
                                className="h-3.5 w-3.5 border-slate-300 data-[state=checked]:bg-blue-600"
                              />
                            </div>
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
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-500 hover:bg-red-50"
                                onClick={() => handleDelete(project.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
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