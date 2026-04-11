import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, Briefcase, Upload } from 'lucide-react';
import { Project } from '@/types/categories';
import * as XLSX from 'xlsx';

export function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
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
      saveProjects([...projects, newProject]);
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
      maDuAn: project.maDuAn,
      tenDuAn: project.tenDuAn,
      ghiChu: project.ghiChu || ''
    });
    setEditingId(project.id);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa dự án này?')) {
      const updatedProjects = projects.filter(project => project.id !== id);
      saveProjects(updatedProjects);
      toast.success('Đã xóa dự án thành công');
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
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let addedCount = 0;
        let skippedCount = 0;
        const newProjects = [...projects];

        data.forEach(row => {
          const maDuAn = (row.maDuAn || '').toString().trim();
          const tenDuAn = (row.tenDuAn || '').toString().trim();
          const ghiChu = (row.ghiChu || '').toString().trim();

          // Check for empty required fields
          if (!maDuAn || !tenDuAn) {
            skippedCount++;
            return;
          }

          // Check for duplicates
          const isDuplicate = newProjects.some(p => 
            p.maDuAn === maDuAn || p.tenDuAn === tenDuAn
          );

          if (isDuplicate) {
            skippedCount++;
            return;
          }

          newProjects.push({
            id: Date.now().toString() + Math.random(),
            maDuAn,
            tenDuAn,
            ghiChu,
            createdAt: new Date().toISOString()
          });
          addedCount++;
        });

        saveProjects(newProjects);
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

  const filteredProjects = projects.filter(project =>
    project.maDuAn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.tenDuAn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.ghiChu && project.ghiChu.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý Dự Án</h2>
          <p className="text-gray-600">Quản lý danh sách các dự án trong hệ thống</p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          <Briefcase className="w-4 h-4 mr-1" />
          {projects.length} dự án
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form thêm/sửa dự án */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {editingId ? 'Chỉnh sửa dự án' : 'Thêm dự án mới'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="maDuAn">Mã dự án *</Label>
                  <Input
                    id="maDuAn"
                    value={formData.maDuAn}
                    onChange={(e) => setFormData({ ...formData, maDuAn: e.target.value })}
                    placeholder="VD: DA001"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="tenDuAn">Tên dự án *</Label>
                  <Input
                    id="tenDuAn"
                    value={formData.tenDuAn}
                    onChange={(e) => setFormData({ ...formData, tenDuAn: e.target.value })}
                    placeholder="Nhập tên dự án"
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
                    {editingId ? 'Cập nhật' : 'Thêm dự án'}
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
                  File cần có cột: maDuAn, tenDuAn (tùy chọn: ghiChu)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danh sách dự án */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Danh sách dự án</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm kiếm dự án..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredProjects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {projects.length === 0 ? (
                    <>
                      <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Chưa có dự án nào</p>
                      <p className="text-sm">Thêm dự án đầu tiên để bắt đầu</p>
                    </>
                  ) : (
                    <p>Không tìm thấy dự án phù hợp</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{project.maDuAn}</Badge>
                          <h3 className="font-semibold text-gray-900">{project.tenDuAn}</h3>
                        </div>
                        {project.ghiChu && (
                          <p className="text-sm text-gray-500 mt-1">
                            {project.ghiChu}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(project)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(project.id)}
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
