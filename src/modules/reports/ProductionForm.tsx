import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/DateInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Lock, QrCode, Search, ShieldCheck } from 'lucide-react';
import { ProductionReport, ToolEntry, WorkTimeEntry } from '@/types/production';
import { useMasterData } from '@/hooks/useMasterData';
import { useAuth } from '@/contexts/AuthContext';
import { OptimizedTimeInput } from '@/components/OptimizedTimeInput';

interface ProductionFormProps {
  onSubmit: (report: Omit<ProductionReport, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
  initialData?: any;
}

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

interface Employee {
  id: string;
  msnv: string;
  hoTen: string;
  fullName?: string;
  name?: string;
  role: string;
  chucVu: string;
  department: string;
}

interface Machine {
  id: string;
  name?: string;
  tenMay?: string;
  ten_may?: string;
  code?: string;
  status?: string;
}

const createEmptyToolEntry = (): ToolEntry => ({
  tenDao: '',
  slCap: 0,
  slSuDung: 0,
  hong: 0,
  donVi: '',
  donGia: 0,
  thanhTien: 0,
});

export function ProductionForm({ onSubmit, onCancel, initialData }: ProductionFormProps) {
  const masterDataHook = useMasterData();
  const { user, isAdmin } = useAuth();
  
  const masterData = masterDataHook?.masterData || { machines: [], tools: [], operators: [], inspectors: [], projects: [] };
  
  // State cho form data
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        ngayThang: initialData.ngay || initialData.ngayThang || new Date().toISOString().split('T')[0],
        maySanXuat: initialData.may || initialData.maySanXuat || '',
        duAn: initialData.maDuAn || initialData.duAn || '',
        tenDuAn: initialData.tenDuAn || '',
        banVeSo: initialData.banVeSo || '',
        chiTietSo: initialData.chiTietSo || initialData.ncSo || '',
        tenChiTiet: initialData.tenChiTiet || '',
        noiDungGiaCong: initialData.noiDung || initialData.noiDungGiaCong || '',
        soLuongHoanThanh: initialData.sanLuong || initialData.soLuongHoanThanh || 0,
        vatLieu: initialData.vatLieu || '',
        nguyenCongSo: initialData.nguyenCongSo || initialData.ncSo || '',
        toolEntries: initialData.toolEntries?.length ? initialData.toolEntries : [createEmptyToolEntry()],
        workTimeEntries: initialData.workTimeEntries || (initialData.gioChay ? [{ soGio: initialData.gioChay, thoiGianBatDau: '', thoiGianKetThuc: '' }] : []),
        setupTimeEntries: initialData.setupTimeEntries || (initialData.gioGa ? [{ soGio: initialData.gioGa, thoiGianBatDau: '', thoiGianKetThuc: '' }] : []),
        ca: initialData.ca || '',
        cpMay: initialData.cpMay || initialData.chiPhiChayMay || 0,
        cpDaoCu: initialData.cpDaoCu || initialData.chiPhiDao || 0,
        nguoiVanHanh: initialData.nguoiVanHanh || user?.fullName || user?.name || '',
        nguoiKiemTra: initialData.nguoiKiemTra || '',
        tgTrenCa: initialData.tgTrenCa || '',
        tgGaPhoi: initialData.tgGaPhoi || '',
        status: initialData.status || 'draft',
      };
    }
    return {
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
    };
  });

  // State cho danh sách
  const [inspectors, setInspectors] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categoryTypes, setCategoryTypes] = useState<CategoryType[]>([]);
  
  // State cho UI
  const [scannerOpen, setScannerOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const LazyScanner = React.lazy(() => import('@/components/QRCodeScanner').then(mod => ({ default: mod.QRCodeScanner }))) as unknown as React.ComponentType<{ onDetected?: (text: string) => void }>;

  // ======================
  // HÀM LẤY DANH SÁCH MÁY UNIQUE
  // ======================
  const loadUniqueMachines = useCallback(() => {
    try {
      let allMachines: Machine[] = [];
      
      // Lấy từ masterData
      if (masterData.machines && masterData.machines.length) {
        allMachines = [...allMachines, ...masterData.machines];
      }
      
      // Lấy từ localStorage
      const savedMachines = localStorage.getItem('machines');
      if (savedMachines) {
        const localMachines = JSON.parse(savedMachines);
        allMachines = [...allMachines, ...localMachines];
      }
      
      // Loại bỏ trùng lặp dựa trên tên máy
      const uniqueMap = new Map<string, Machine>();
      allMachines.forEach(machine => {
        const machineName = machine.name || machine.tenMay || machine.ten_may || '';
        if (machineName && !uniqueMap.has(machineName)) {
          uniqueMap.set(machineName, machine);
        }
      });
      
      const uniqueMachines = Array.from(uniqueMap.values());
      setMachines(uniqueMachines);
      
    } catch (error) {
      console.error('Error loading machines:', error);
    }
  }, [masterData.machines]);

  // ======================
  // LẤY THÔNG TIN USER HIỆN TẠI
  // ======================
  useEffect(() => {
    if (user?.fullName || user?.name) {
      setFormData((prev) => ({
        ...prev,
        nguoiVanHanh: user.fullName || user.name || prev.nguoiVanHanh,
      }));
    }
  }, [user]);

  // ======================
  // LẤY DANH SÁCH NHÂN VIÊN TỪ LOCALSTORAGE
  // ======================
  const loadEmployees = useCallback((): Employee[] => {
    try {
      let employeesList: Employee[] = [];
      const savedEmployees = localStorage.getItem('employees');
      
      if (savedEmployees) {
        employeesList = JSON.parse(savedEmployees);
      } else {
        const savedUsers = localStorage.getItem('users');
        if (savedUsers) {
          employeesList = JSON.parse(savedUsers);
        }
      }
      
      setEmployees(employeesList);
      return employeesList;
    } catch (error) {
      console.error('Error loading employees:', error);
      return [];
    }
  }, []);

  // ======================
  // LẤY DANH SÁCH NGƯỜI KIỂM TRA
  // ======================
  const getInspectorsByRole = useCallback(() => {
    try {
      const allowedRoles = ['admin', 'quan_ly_xuong', 'to_truong', 'to_pho'];
      const allowedChucVu = ['Admin', 'Quản lý xưởng', 'Tổ trưởng', 'Tổ phó'];
      
      let employeesList = employees.length > 0 ? employees : loadEmployees();
      
      if (employeesList.length > 0) {
        const inspectorList = employeesList
          .filter((emp: Employee) => {
            const role = (emp.role || '').toLowerCase();
            const chucVu = (emp.chucVu || '').toLowerCase();
            return allowedRoles.includes(role) || allowedChucVu.some(cv => cv.toLowerCase() === chucVu);
          })
          .map((emp: Employee) => emp.hoTen || emp.fullName || emp.name || '')
          .filter((name: string) => name && name.trim() !== '');
        
        if (inspectorList.length > 0) {
          setInspectors(inspectorList);
          return;
        }
      }
      
      // Fallback
      const defaultInspectors = [
        { name: 'Nguyễn Văn A', role: 'admin', chucVu: 'Admin' },
        { name: 'Trần Thị B', role: 'quan_ly_xuong', chucVu: 'Quản lý xưởng' },
        { name: 'Lê Văn C', role: 'to_truong', chucVu: 'Tổ trưởng' },
        { name: 'Phạm Thị D', role: 'to_pho', chucVu: 'Tổ phó' },
      ];
      
      const filteredDefault = defaultInspectors
        .filter(emp => allowedRoles.includes(emp.role))
        .map(emp => emp.name);
      
      setInspectors(filteredDefault);
      
    } catch (error) {
      console.error('Error getting inspectors by role:', error);
      setInspectors(masterData.inspectors || []);
    }
  }, [employees, loadEmployees, masterData.inspectors]);

  // ======================
  // LẤY THÔNG TIN CHI TIẾT CỦA NGƯỜI KIỂM TRA
  // ======================
  const getInspectorDetails = useCallback((inspectorName: string) => {
    try {
      const employeesList = employees.length > 0 ? employees : loadEmployees();
      const inspector = employeesList.find((emp: Employee) => {
        const name = emp.hoTen || emp.fullName || emp.name || '';
        return name === inspectorName;
      });
      
      if (inspector) {
        return {
          name: inspectorName,
          role: inspector.role || inspector.chucVu || '',
          chucVu: inspector.chucVu || inspector.role || '',
          department: inspector.department || '',
          msnv: inspector.msnv || '',
        };
      }
      
      return { name: inspectorName, role: '', chucVu: '', department: '', msnv: '' };
    } catch (error) {
      return { name: inspectorName, role: '', chucVu: '', department: '', msnv: '' };
    }
  }, [employees, loadEmployees]);

  // ======================
  // LOAD DỮ LIỆU MASTER
  // ======================
  const loadMasterData = useCallback(() => {
    try {
      // Load projects
      const savedProjects = localStorage.getItem('projects');
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
      
      // Load categories
      const savedCategories = localStorage.getItem('category_types');
      if (savedCategories) {
        setCategoryTypes(JSON.parse(savedCategories));
      }
      
      // Load machines (đã có trong loadUniqueMachines)
      loadUniqueMachines();
      
    } catch (error) {
      console.error('Error loading master data:', error);
    }
  }, [loadUniqueMachines]);

  // ======================
  // EFFECT CHÍNH
  // ======================
  useEffect(() => {
    loadEmployees();
    loadMasterData();
    
    const handleStorageChange = () => {
      loadMasterData();
      loadEmployees();
    };
    
    window.addEventListener('app-data-synced', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('app-data-synced', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadEmployees, loadMasterData]);

  // ======================
  // EFFECT: CẬP NHẬT DANH SÁCH NGƯỜI KIỂM TRA
  // ======================
  useEffect(() => {
    if (employees.length > 0) {
      getInspectorsByRole();
    }
  }, [employees, getInspectorsByRole]);

  // ======================
  // KIỂM TRA QUYỀN
  // ======================
  const isCurrentUserInspector = () => {
    const currentUserName = user?.fullName || user?.name;
    return formData.nguoiKiemTra === currentUserName;
  };

  const canApprove = () => {
    const userRole = (user?.role || '').toLowerCase();
    const allowedRoles = ['admin', 'quan_ly_xuong'];
    
    if (allowedRoles.includes(userRole)) return true;
    if (isCurrentUserInspector()) return true;
    
    return false;
  };

  // ======================
  // XỬ LÝ FORM
  // ======================
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

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProjectSelect = (project: Project) => {
    setFormData(prev => ({
      ...prev,
      duAn: project.maDuAn,
      tenDuAn: project.tenDuAn
    }));
    setProjectSearch(project.maDuAn);
    setIsProjectDropdownOpen(false);
  };

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
      toolEntries: prev.toolEntries.filter((_: ToolEntry, i: number) => i !== index)
    }));
  };

  const updateToolEntry = (index: number, field: keyof ToolEntry, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      toolEntries: prev.toolEntries.map((entry: ToolEntry, i: number) => {
        if (i === index) {
          const updatedEntry = { ...entry, [field]: value };
          
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

  // Lấy tên máy từ object machine
  const getMachineName = (machine: Machine): string => {
    return machine.name || machine.tenMay || machine.ten_may || machine.id || '';
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      if (initialData && initialData.status === 'approved' && !isAdmin) {
        toast.error('Không có quyền chỉnh sửa nhật ký đã duyệt');
        return;
      }
      
      if (!formData.maySanXuat || !formData.duAn || !formData.tenDuAn) {
        toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (Máy sản xuất, Dự án)');
        return;
      }

      const validToolEntries = formData.toolEntries.filter((entry: ToolEntry) => entry.tenDao);
      if (validToolEntries.length === 0) {
        toast.error('Vui lòng nhập ít nhất một dao cụ');
        return;
      }

      if (!formData.workTimeEntries?.length) {
        toast.error('Vui lòng nhập ít nhất một khoảng thời gian làm việc');
        return;
      }

      const selectedMachine = machines.find(
        (m) => getMachineName(m) === formData.maySanXuat
      );

      let machineShiftPrice = 0;
      if (selectedMachine) {
        machineShiftPrice = Number((selectedMachine as any).gia8h1Ca) || 
                           Number((selectedMachine as any).gia10h1Ca) || 
                           Number((selectedMachine as any).gia12h1Ca) || 0;
      }

      const totalRunHours = formData.workTimeEntries.reduce(
        (sum: number, item: WorkTimeEntry) => sum + Number(item.soGio || 0),
        0
      );

      const totalSetupHours = formData.setupTimeEntries.reduce(
        (sum: number, item: WorkTimeEntry) => sum + Number(item.soGio || 0),
        0
      );

      const pricePerHour = machineShiftPrice > 0 ? machineShiftPrice / 8 : 0;
      const runAmount = totalRunHours * pricePerHour;
      const setupAmount = totalSetupHours * (pricePerHour / 2);

      const updatedToolEntries = validToolEntries.map((tool: ToolEntry) => {
        const matchedCategory = categoryTypes.find(cat => cat.tenLoai === tool.tenDao);
        const donGia = Number(matchedCategory?.gia) || 0;
        return {
          ...tool,
          donGia,
          thanhTien: tool.slSuDung * donGia,
        };
      });

      onSubmit({
        ...formData,
        toolEntries: updatedToolEntries,
        nguoiVanHanh: user?.fullName || user?.name || formData.nguoiVanHanh,
        status: initialData?.status || 'pending',
        chiPhiGa: setupAmount,
        chiPhiChayMay: runAmount,
        chiPhiDao: updatedToolEntries.reduce((sum: number, tool: any) => sum + tool.thanhTien, 0),
        gioGa: totalSetupHours,
        gioChay: totalRunHours,
      });
      
      if (!initialData) {
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
      }

      toast.success(initialData ? 'Đã cập nhật báo cáo!' : 'Đã gửi báo cáo!');
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Lỗi khi gửi báo cáo');
    }
  };

  const filteredProjects = projects.filter(project =>
    project.maDuAn.toLowerCase().includes(projectSearch.toLowerCase()) ||
    project.tenDuAn.toLowerCase().includes(projectSearch.toLowerCase())
  );

  // Lấy danh sách máy unique để hiển thị
  const uniqueMachinesForSelect = React.useMemo(() => {
    const machineMap = new Map<string, Machine>();
    machines.forEach(machine => {
      const name = getMachineName(machine);
      if (name && !machineMap.has(name)) {
        machineMap.set(name, machine);
      }
    });
    return Array.from(machineMap.values());
  }, [machines]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-xl font-bold text-blue-600">
          Nhật ký Sản Xuất
        </CardTitle>
        <div className="text-center">
          <Badge variant="secondary">Người dùng: {user?.fullName || user?.name}</Badge>
          {canApprove() && (
            <Badge variant="outline" className="ml-2 text-green-600">
              Có quyền duyệt
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="max-h-[80vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ngayThang">Ngày tháng *</Label>
              <DateInput
                id="ngayThang"
                value={formData.ngayThang}
                onChange={(value: string) => handleInputChange('ngayThang', value)}
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
                    {uniqueMachinesForSelect.length > 0 ? (
                      uniqueMachinesForSelect.map((machine) => {
                        const machineName = getMachineName(machine);
                        return (
                          <SelectItem key={machine.id} value={machineName}>
                            {machineName}
                          </SelectItem>
                        );
                      })
                    ) : (
                      <SelectItem value="" disabled>Chưa có dữ liệu máy</SelectItem>
                    )}
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
                        const found = machines.find(m => 
                          (m as any).qrData === text || 
                          (m as any).id === text || 
                          getMachineName(m) === text
                        );
                        if (found) {
                          const name = getMachineName(found);
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

          {/* Project Selection */}
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
                Tên Dự Án *
              </Label>
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
                step="0.001"
                value={formData.soLuongHoanThanh}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('soLuongHoanThanh', parseFloat(e.target.value) || 0)
                }
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
                <CardTitle className="text-lg font-semibold text-gray-600">
                  Thông tin Dao Cụ
                </CardTitle>
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
              {formData.toolEntries.map((entry: ToolEntry, index: number) => (
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
                            : masterData.tools.map((tool: any) => (
                                <SelectItem key={tool.id} value={tool.name}>
                                  {tool.name}
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>SL Cấp</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={entry.slCap}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateToolEntry(index, 'slCap', e.target.value === '' ? '' : parseFloat(e.target.value))
                        }
                        min="0"
                        placeholder="Nhập SL cấp"
                      />
                    </div>
                    <div>
                      <Label>SL Sử Dụng</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={entry.slSuDung}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateToolEntry(index, 'slSuDung', e.target.value === '' ? '' : parseFloat(e.target.value))
                        }
                        min="0"
                        placeholder="Nhập SL sử dụng"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label>SL Hỏng</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={entry.hong}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateToolEntry(index, 'hong', e.target.value === '' ? '' : parseFloat(e.target.value))
                        }
                        min="0"
                        placeholder="Nhập SL hỏng"
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
              <Label htmlFor="nguoiKiemTra" className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                Người Kiểm Tra
                {formData.nguoiKiemTra && (
                  <Badge variant="outline" className="text-xs ml-2">
                    {getInspectorDetails(formData.nguoiKiemTra)?.chucVu || 'Chưa xác định'}
                  </Badge>
                )}
              </Label>
              <Select 
                value={formData.nguoiKiemTra} 
                onValueChange={(value: string) => handleInputChange('nguoiKiemTra', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người kiểm tra" />
                </SelectTrigger>
                <SelectContent>
                  {inspectors.length > 0 ? (
                    inspectors.map((inspector) => {
                      const details = getInspectorDetails(inspector);
                      return (
                        <SelectItem key={inspector} value={inspector}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{inspector}</span>
                            {details.chucVu && (
                              <Badge variant="outline" className="text-xs ml-2">
                                {details.chucVu === 'Admin' ? '👑 Admin' :
                                 details.chucVu === 'Quản lý xưởng' ? '📋 Quản lý xưởng' :
                                 details.chucVu === 'Tổ trưởng' ? '👨‍💼 Tổ trưởng' :
                                 details.chucVu === 'Tổ phó' ? '👨‍🔧 Tổ phó' : details.chucVu}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })
                  ) : (
                    masterData.inspectors.map((inspector: string) => (
                      <SelectItem key={inspector} value={inspector}>
                        {inspector}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">
                * Chọn người kiểm tra
              </p>
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