// Sản xuất -> Nhật ký Sản Xuất-> Nút Thêm nhật ký sản xuất
import React, { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Lock, QrCode, Search } from 'lucide-react';
import { ProductionReport, ToolEntry, WorkTimeEntry } from '@/types/production';
import { useMasterData } from '@/hooks/useMasterData';
import { useAuth } from '@/hooks/useAuth';
import { OptimizedTimeInput } from '@/components/OptimizedTimeInput';

interface ProductionFormProps {
  onSubmit: (report: Omit<ProductionReport, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
}

const createEmptyToolEntry = (): ToolEntry => ({
  tenDao: '',
  slCap: 0,
  slSuDung: 0,
  hong: 0,
  donVi: '',
});

interface Project {
  id: string;
  maDuAn: string;
  tenDuAn: string;
  ghiChu?: string;
  createdAt: string;
}

interface CategoryType {
  id: string;
  maLoai: string;
  tenLoai: string;
  donVi: string;
  gia: number;
  ghiChu?: string;
  createdAt: string;
}

export function ProductionForm({ onSubmit, onCancel }: ProductionFormProps) {
  const masterDataHook = useMasterData();
  const { user, isAdmin } = useAuth();
  
  const masterData = masterDataHook?.masterData || { machines: [], tools: [], operators: [], inspectors: [], projects: [] };
  const getProjectByCode = masterDataHook?.getProjectByCode || (() => undefined);
  
  const [formData, setFormData] = useState({
    ngayThang: new Date().toISOString().split('T')[0],
    maySanXuat: '',
    duAn: '',
    tenDuAn: '',
    banVeSo: '',
    chiTietSo: '',
    tenChiTiet: '',
    noiDungGiaCong: '',
    soLuongHoanThanh: 0,
    vatLieu: '',
    nguyenCongSo: '',
    toolEntries: [createEmptyToolEntry()],
    workTimeEntries: [] as WorkTimeEntry[],
    setupTimeEntries: [] as WorkTimeEntry[],
    ca: '' as 'ngay' | 'dem' | '',
    cpMay: 0,
    cpDaoCu: 0,
    nguoiVanHanh: user?.fullName || user?.name || '',
    nguoiKiemTra: '',
    tgTrenCa: '',
    tgGaPhoi: '',
    status: 'draft' as const,
  });

  const [inspectors, setInspectors] = useState<string[]>([]);

  useEffect(() => {
    if (user?.fullName || user?.name) {
      setFormData((prev) => ({
        ...prev,
        nguoiVanHanh: user.fullName || user.name || prev.nguoiVanHanh,
      }));
    }
  }, [user]);

  useEffect(() => {
    try {
      const savedEmployees = localStorage.getItem('employees');
      if (savedEmployees) {
        const list = JSON.parse(savedEmployees) as { hoTen?: string; fullName?: string }[];
        const names = list
          .map((e) => e.hoTen || e.fullName)
          .filter((n): n is string => !!n);
        if (names.length > 0) {
          setInspectors(names);
          return;
        }
      }
    } catch {
      /* use masterData fallback */
    }
    setInspectors(masterData.inspectors);
  }, [masterData.inspectors]);

  const [machines, setMachines] = useState<{ id: string; name?: string; tenMay?: string }[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categoryTypes, setCategoryTypes] = useState<CategoryType[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const LazyScanner = React.lazy(() => import('@/components/QRCodeScanner').then(mod => ({ default: mod.QRCodeScanner }))) as unknown as React.ComponentType<{ onDetected?: (text: string) => void }>;

  // LOAD DATA FROM CORRECT LOCALSTORAGE KEYS
  const loadData = () => {
    try {
      const savedProjects = localStorage.getItem('projects');
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }

    try {
      const savedCategories = localStorage.getItem('category_types');
      if (savedCategories) {
        setCategoryTypes(JSON.parse(savedCategories));
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }

    try {
      const savedMachines = localStorage.getItem('machines');
      if (savedMachines) {
        setMachines(JSON.parse(savedMachines));
      }
    } catch (error) {
      console.error('Error loading machines:', error);
    }
  };

  useEffect(() => {
    loadData();

    const handleStorageChange = () => {
      loadData();
    };

    window.addEventListener('app-data-synced', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('app-data-synced', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleTimeChange = (
    machiningHours: string,
    setupHours: string,
    shift: 'ngay' | 'dem' | '',
    machiningEntries: WorkTimeEntry[],
    setupEntries: WorkTimeEntry[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      tgTrenCa: machiningHours,
      tgGaPhoi: setupHours,
      ca: shift,
      workTimeEntries: machiningEntries,
      setupTimeEntries: setupEntries,
    }));
  };

  // HÀM XỬ LÝ LƯU: ĐÃ ĐƯỢC CẬP NHẬT ĐỂ LIÊN KẾT SANG PHÊ DUYỆT CHỜ DUYỆT
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!formData.maySanXuat || !formData.duAn || !formData.tenDuAn) {
        toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (Máy sản xuất, Dự án)');
        return;
      }

      const validToolEntries = formData.toolEntries.filter(entry => entry.tenDao);
      if (validToolEntries.length === 0) {
        toast.error('Vui lòng nhập ít nhất một dao cụ');
        return;
      }

      if (!formData.workTimeEntries?.length) {
        toast.error('Vui lòng nhập ít nhất một khoảng thời gian làm việc');
        return;
      }

      // -------------------------------------------------------------------------
      // XỬ LÝ ĐẨY DỮ LIỆU SANG DANH SÁCH CHỜ DUYỆT (PENDING APPROVAL LIST)
      // -------------------------------------------------------------------------
      const newApprovalLog = {
        id: "LOG-" + Date.now(),
        ngay: formData.ngayThang,
        maDuAn: formData.duAn,
        tenDuAn: formData.tenDuAn,
        tenDao: validToolEntries[0]?.tenDao || "Chưa chọn dao",
        donVi: validToolEntries[0]?.donVi || "Cái",
        nguoiThucHien: user?.fullName || user?.name || formData.nguoiVanHanh || "Nhân viên vận hành",
        tinhTrang: formData.noiDungGiaCong || `Vận hành máy: ${formData.maySanXuat}. Hoàn thành: ${formData.soLuongHoanThanh} sản phẩm.`,
        status: 'pending' as const // Đưa trạng thái về Chờ Duyệt
      };

      const rawApprovalData = localStorage.getItem('PRODUCTION_LOGS_DATA');
      let currentApprovalList = [];
      if (rawApprovalData) {
        try {
          currentApprovalList = JSON.parse(rawApprovalData);
        } catch {
          currentApprovalList = [];
        }
      }

      // Thêm mới vào cuối mảng, không làm mất dữ liệu cũ của chú
      const updatedApprovalList = [...currentApprovalList, newApprovalLog];
      localStorage.setItem('PRODUCTION_LOGS_DATA', JSON.stringify(updatedApprovalList));
      // -------------------------------------------------------------------------

      // Chạy tiếp luồng xử lý gốc của Form
      onSubmit({
        ...formData,
        toolEntries: validToolEntries,
        nguoiVanHanh: user?.fullName || user?.name || formData.nguoiVanHanh,
        status: 'pending',
      });
      
      // Reset form về mặc định sạch sẽ
      setFormData({
        ngayThang: new Date().toISOString().split('T')[0],
        maySanXuat: '',
        duAn: '',
        tenDuAn: '',
        banVeSo: '',
        chiTietSo: '',
        tenChiTiet: '',
        noiDungGiaCong: '',
        soLuongHoanThanh: 0,
        vatLieu: '',
        nguyenCongSo: '',
        toolEntries: [createEmptyToolEntry()],
        workTimeEntries: [],
        setupTimeEntries: [],
        ca: '',
        cpMay: 0,
        cpDaoCu: 0,
        nguoiVanHanh: user?.fullName || user?.name || '',
        nguoiKiemTra: '',
        tgTrenCa: '',
        tgGaPhoi: '',
        status: 'draft',
      });

      toast.success('Đã gửi báo cáo và chuyển sang danh sách chờ duyệt!');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Lỗi khi gửi báo cáo');
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle project selection
  const handleProjectSelect = (project: Project) => {
    setFormData(prev => ({
      ...prev,
      duAn: project.maDuAn,
      tenDuAn: project.tenDuAn
    }));
    setProjectSearch(project.maDuAn);
    setIsProjectDropdownOpen(false);
  };

  // Filter projects based on search
  const filteredProjects = projects.filter(project =>
    project.maDuAn.toLowerCase().includes(projectSearch.toLowerCase()) ||
    project.tenDuAn.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const addToolEntry = () => {
    if (formData.toolEntries.length < 10) {
      setFormData(prev => ({
        ...prev,
        toolEntries: [...prev.toolEntries, createEmptyToolEntry()]
      }));
    }
  };

  const removeToolEntry = (index: number) => {
    setFormData(prev => ({
      ...prev,
      toolEntries: prev.toolEntries.filter((_, i) => i !== index)
    }));
  };

  const updateToolEntry = (index: number, field: keyof ToolEntry, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      toolEntries: prev.toolEntries.map((entry, i) => {
        if (i === index) {
          const updatedEntry = { ...entry, [field]: value };
          
          // Auto-fill unit when tool name is selected from category types
          if (field === 'tenDao' && typeof value === 'string') {
            const selectedCategory = categoryTypes.find(cat => cat.tenLoai === value);
            if (selectedCategory) {
              updatedEntry.donVi = selectedCategory.donVi ?? '';
            }
          }
          
          return updatedEntry;
        }
        return entry;
      })
    }));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-xl font-bold text-blue-600">
          Nhật ký Sản Xuất
        </CardTitle>
        <div className="text-center">
          <Badge variant="secondary">Người dùng: {user?.fullName || user?.name}</Badge>
        </div>
      </CardHeader>
      <CardContent className="max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ngayThang">Ngày tháng *</Label>
              <Input
                id="ngayThang"
                type="date"
                value={formData.ngayThang}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('ngayThang', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="maySanXuat">Máy Sản Xuất *</Label>
              <div className="flex items-center gap-2">
                <Select 
                  value={formData.maySanXuat} 
                  onValueChange={(value: string) => handleInputChange('maySanXuat', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn máy sản xuất" />
                  </SelectTrigger>
                  <SelectContent>
                    {(machines.length > 0 ? machines : (masterData.machines as any[])).map((machine) => (
                      <SelectItem key={machine.id} value={machine.name || machine.tenMay || machine.id}>
                        {machine.name || machine.tenMay || machine.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" type="button" onClick={() => setScannerOpen(true)} title="Quét mã QR máy">
                  <QrCode className="w-4 h-4" />
                </Button>
              </div>

              <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Quét mã QR máy</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-gray-600 mb-2">Đưa mã QR vào khung camera để quét.</p>
                    <Suspense fallback={<div>Đang tải máy quét...</div>}>
                      <LazyScanner onDetected={(text: string) => {
                        let legacy: any[] = [];
                        try { legacy = JSON.parse(localStorage.getItem('machines') || '[]'); } catch { legacy = []; }
                        const pool = [ ...(machines || []), ...legacy, ...(masterData.machines || []) ];
                        const found = pool.find(m => (m.qrData === text) || (m.id === text) || (m.name === text) || (m.tenMay === text));
                        if (found) {
                          const name = found.name || found.tenMay || found.id;
                          setFormData(prev => ({ ...prev, maySanXuat: name }));
                          toast.success(`Chọn máy: ${name}`);
                        } else {
                          toast.error(`Không tìm thấy máy ứng với mã: ${text}`);
                        }
                        setScannerOpen(false);
                      }} />
                    </Suspense>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duAn">Mã Dự Án *</Label>
              <div className="space-y-2 relative">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    id="duAn"
                    type="text"
                    value={projectSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setProjectSearch(e.target.value);
                      setIsProjectDropdownOpen(true);
                    }}
                    onFocus={() => setIsProjectDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsProjectDropdownOpen(false), 200)}
                    placeholder="Nhập hoặc tìm mã dự án..."
                    className="border-gray-300 pl-10"
                    required
                  />
                </div>
                {isProjectDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                    {filteredProjects.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        {projects.length === 0 ? 'Chưa có dự án nào. Vui lòng thêm dự án ở Quản lý Danh Mục.' : 'Không tìm thấy dự án phù hợp.'}
                      </div>
                    ) : (
                      filteredProjects.map((project) => (
                        <button
                          key={project.id}
                          type="button"
                          onMouseDown={() => handleProjectSelect(project)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 text-sm"
                        >
                          <div className="font-medium">{project.maDuAn}</div>
                          <div className="text-gray-600 text-xs">{project.tenDuAn}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="tenDuAn" className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-500" />
                Tên Dự Án * </Label>
              <Input
                id="tenDuAn"
                value={formData.tenDuAn}  
                readOnly
                disabled
                className="bg-gray-200 border-gray-300 text-gray-600 cursor-not-allowed"
                placeholder="Sẽ tự động điền khi chọn dự án"
              />
            </div>
          </div>

          {/* Drawing and Detail Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="banVeSo">Bản Vẽ Số</Label>
              <Input
                id="banVeSo"
                value={formData.banVeSo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('banVeSo', e.target.value)}
                placeholder="Nhập số bản vẽ"
              />
            </div>
            <div>
              <Label htmlFor="chiTietSo">Chi Tiết Số</Label>
              <Input
                id="chiTietSo"
                value={formData.chiTietSo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('chiTietSo', e.target.value)}
                placeholder="Nhập số chi tiết"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tenChiTiet">Tên Chi Tiết</Label>
            <Input
              id="tenChiTiet"
              value={formData.tenChiTiet}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('tenChiTiet', e.target.value)}
              placeholder="Nhập tên chi tiết"
            />
          </div>

          <div>
            <Label htmlFor="noiDungGiaCong">Nội dung Gia Công</Label>
            <Textarea
              id="noiDungGiaCong"
              value={formData.noiDungGiaCong}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('noiDungGiaCong', e.target.value)}
              placeholder="Mô tả nội dung gia công"
              rows={3}
            />
          </div>

          {/* Quantity and Material */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="soLuongHoanThanh">Số Lượng Hoàn Thành</Label>
              <Input
                id="soLuongHoanThanh"
                type="number"
                value={formData.soLuongHoanThanh}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('soLuongHoanThanh', parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="vatLieu">Vật Liệu</Label>
              <Input
                id="vatLieu"
                value={formData.vatLieu}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vatLieu', e.target.value)}
                placeholder="Loại vật liệu"
              />
            </div>
            <div>
              <Label htmlFor="nguyenCongSo">Nguyên Công Số</Label>
              <Input
                id="nguyenCongSo"
                value={formData.nguyenCongSo}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('nguyenCongSo', e.target.value)}
                placeholder="Số nguyên công"
              />
            </div>
          </div>

          {/* Tool Information Section */}
          <Card className="bg-gray-50 border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold text-gray-600">Thông tin Dao Cụ</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addToolEntry}
                  disabled={formData.toolEntries.length >= 10}
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  Thêm dao cụ ({formData.toolEntries.length}/10)
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.toolEntries.map((entry, index) => (
                <div key={index} className="p-4 border rounded-lg bg-white">
                  <div className="flex items-center mb-2">
                    <Label className="font-semibold text-gray-600">Dao cụ {index + 1}</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <Label>Tên Dao</Label>
                      <Select 
                        value={entry.tenDao} 
                        onValueChange={(value: string) => updateToolEntry(index, 'tenDao', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn dao" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryTypes.length > 0 
                            ? categoryTypes.map((category) => (
                                <SelectItem key={category.id} value={category.tenLoai}>
                                  {category.tenLoai}
                                </SelectItem>
                              ))
                            : masterData.tools.map((tool) => (
                                <SelectItem key={tool.id} value={tool.name}>
                                  {tool.name}
                                </SelectItem>
                              ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>SL Cấp</Label>
                      <Input
                        type="number"
                        value={entry.slCap}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateToolEntry(index, 'slCap', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label>SL Sử Dụng</Label>
                      <Input
                        type="number"
                        value={entry.slSuDung}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateToolEntry(index, 'slSuDung', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label>SL Hỏng</Label>
                      <Input
                        type="number"
                        value={entry.hong}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateToolEntry(index, 'hong', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div>
                      <Label>Đơn Vị</Label>
                      <Input
                        value={entry.donVi}
                        readOnly
                        className="bg-gray-100"
                        placeholder="Tự động điền theo tên dao"
                      />
                    </div>
                    <div className="flex items-end">
                      {formData.toolEntries.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeToolEntry(index)}
                        >
                          Xóa
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <OptimizedTimeInput onTimeChange={handleTimeChange} />

          {/* Personnel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nguoiVanHanh" className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-500" />
                Người Vận Hành 
              </Label>
              <Input
                id="nguoiVanHanh"
                value={formData.nguoiVanHanh}
                readOnly
                disabled
                className="bg-gray-200 border-gray-300 text-gray-600 cursor-not-allowed"
                placeholder="Tự động điền từ người đăng nhập"
              />
            </div>
            <div>
              <Label htmlFor="nguoiKiemTra">Người Kiểm Tra</Label>
              <Select 
                value={formData.nguoiKiemTra} 
                onValueChange={(value: string) => handleInputChange('nguoiKiemTra', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người kiểm tra" />
                </SelectTrigger>
                <SelectContent>
                  {(inspectors.length > 0 ? inspectors : masterData.inspectors).map((inspector) => (
                    <SelectItem key={inspector} value={inspector}>
                      {inspector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onCancel && onCancel()}>
              Hủy
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
              Lưu
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}