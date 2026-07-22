import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
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
import { Plus, QrCode, Search, ShieldCheck, Loader2, X, Check, ChevronsUpDown } from 'lucide-react';
import { ProductionReport, ToolEntry, WorkTimeEntry } from '@/types/production';
import { useMasterData } from '@/hooks/useMasterData';
import { useAuth } from '@/contexts/AuthContext';
import { OptimizedTimeInput } from '@/components/OptimizedTimeInput';
import { supabase } from '@/supabase';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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
  ma_may: string;
  ten_may: string;
  name?: string;
  tenMay?: string;
  code?: string;
  status?: string;
  gia_8h_1ca?: number;
  gia_10h_1ca?: number;
  gia_12h_1ca?: number;
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

// ======================
// HELPER FUNCTIONS
// ======================

const getValue = (data: any, keys: string[], defaultValue: any = '') => {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      return data[key];
    }
  }
  return defaultValue;
};

const getNumberValue = (data: any, keys: string[], defaultValue: number = 0) => {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      return Number(data[key]) || defaultValue;
    }
  }
  return defaultValue;
};

const getToolEntries = (data: any): ToolEntry[] => {
  if (data.toolEntries?.length) return data.toolEntries;
  if (data.tool_entries?.length) return data.tool_entries;
  return [createEmptyToolEntry()];
};

const getWorkTimeEntries = (data: any, runHours: number): WorkTimeEntry[] => {
  if (data.workTimeEntries?.length) return data.workTimeEntries;
  if (data.work_time_entries?.length) return data.work_time_entries;
  if (runHours > 0) {
    return [{ 
      soGio: runHours, 
      thoiGianBatDau: data.tgChay_BatDau || '', 
      thoiGianKetThuc: data.tgChay_KetThuc || '' 
    }];
  }
  return [];
};

const getSetupTimeEntries = (data: any, setupHours: number): WorkTimeEntry[] => {
  if (data.setupTimeEntries?.length) return data.setupTimeEntries;
  if (data.setup_time_entries?.length) return data.setup_time_entries;
  if (setupHours > 0) {
    return [{ 
      soGio: setupHours, 
      thoiGianBatDau: data.tgGia_BatDau || '', 
      thoiGianKetThuc: data.tgGia_KetThuc || '' 
    }];
  }
  return [];
};

const updateSingleToolEntry = (
  entry: ToolEntry,
  field: keyof ToolEntry,
  value: string | number,
  categoryTypes: CategoryType[]
): ToolEntry => {
  const updatedEntry = { ...entry, [field]: value };
  
  if (field === 'tenDao' && typeof value === 'string') {
    const selectedCategory = categoryTypes.find((cat) => cat.tenLoai === value);
    if (selectedCategory) {
      updatedEntry.donVi = selectedCategory.donVi ?? '';
      updatedEntry.donGia = selectedCategory.gia ?? 0;
      updatedEntry.thanhTien = (entry.slSuDung || 0) * (selectedCategory.gia ?? 0);
    }
  }
  
  if (field === 'slSuDung' && typeof value === 'number') {
    updatedEntry.thanhTien = value * (entry.donGia || 0);
  }
  
  return updatedEntry;
};

const calculateCosts = (
  workTimeEntries: WorkTimeEntry[],
  setupTimeEntries: WorkTimeEntry[],
  machineShiftPrice: number
) => {
  const totalRunHours = workTimeEntries.reduce(
    (sum: number, item: WorkTimeEntry) => sum + Number(item.soGio || 0), 
    0
  );
  const totalSetupHours = setupTimeEntries.reduce(
    (sum: number, item: WorkTimeEntry) => sum + Number(item.soGio || 0), 
    0
  );
  const pricePerHour = machineShiftPrice > 0 ? machineShiftPrice / 8 : 0;
  const runAmount = totalRunHours * pricePerHour;
  const setupAmount = totalSetupHours * (pricePerHour / 2);
  
  return { totalRunHours, totalSetupHours, runAmount, setupAmount };
};

// ======================
// MAIN COMPONENT
// ======================

export default function ProductionForm({ onSubmit, onCancel, initialData }: Readonly<ProductionFormProps>) {
  const masterDataHook = useMasterData();
  const { user } = useAuth();

  const masterData = masterDataHook?.masterData || { 
    machines: [], 
    tools: [], 
    operators: [], 
    inspectors: [], 
    projects: [] 
  };

  const getUserName = useCallback(() => {
    return user?.fullName || user?.name || '';
  }, [user]);

  // ======================
  // FORM STATE
  // ======================
  const initializeFormData = useCallback(() => {
    if (!initialData) {
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
        nguoiVanHanh: getUserName(),
        nguoiKiemTra: '',
        tgTrenCa: '',
        tgGaPhoi: '',
        status: 'draft' as const,
      };
    }

    const setupHours = getNumberValue(initialData, ['gio_ga', 'gioGa']);
    const runHours = getNumberValue(initialData, ['gio_chay', 'gioChay']);
    const setupCost = getNumberValue(initialData, ['chi_phi_ga', 'chiPhiGa']);
    const runCost = getNumberValue(initialData, ['chi_phi_chay_may', 'chiPhiChayMay', 'cpMay']);
    const toolCost = getNumberValue(initialData, ['chi_phi_dao', 'chiPhiDao', 'cpDaoCu']);

    return {
      ngayThang: getValue(initialData, ['ngayThang', 'ngay'], new Date().toISOString().split('T')[0]),
      maySanXuat: getValue(initialData, ['maySanXuat', 'may']),
      duAn: getValue(initialData, ['duAn', 'maDuAn']),
      tenDuAn: getValue(initialData, ['tenDuAn', 'khach_hang']),
      banVeSo: getValue(initialData, ['banVeSo']),
      chiTietSo: getValue(initialData, ['chiTietSo', 'ncSo']),
      tenChiTiet: getValue(initialData, ['tenChiTiet']),
      noiDungGiaCong: getValue(initialData, ['noiDungGiaCong', 'noiDung']),
      soLuongHoanThanh: getNumberValue(initialData, ['soLuongHoanThanh', 'sanLuong']),
      vatLieu: getValue(initialData, ['vatLieu']),
      nguyenCongSo: getValue(initialData, ['nguyenCongSo', 'ncSo']),
      toolEntries: getToolEntries(initialData),
      workTimeEntries: getWorkTimeEntries(initialData, runHours),
      setupTimeEntries: getSetupTimeEntries(initialData, setupHours),
      ca: getValue(initialData, ['ca']),
      cpMay: runCost,
      chiPhiChayMay: runCost,
      cpDaoCu: toolCost,
      chiPhiDao: toolCost,
      chiPhiGa: setupCost,
      nguoiVanHanh: getValue(initialData, ['nguoiVanHanh'], getUserName()),
      nguoiKiemTra: getValue(initialData, ['nguoiKiemTra']),
      tgTrenCa: getValue(initialData, ['tgTrenCa']),
      tgGaPhoi: getValue(initialData, ['tgGaPhoi']),
      status: getValue(initialData, ['status'], 'draft'),
    };
  }, [initialData, getUserName]);

  const [formData, setFormData] = useState<any>(initializeFormData);

  const [inspectors, setInspectors] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [categoryTypes, setCategoryTypes] = useState<CategoryType[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [openCombobox, setOpenCombobox] = useState<Record<number, boolean>>({});

  const LazyScanner = React.lazy(() => import('@/components/QRCodeScanner').then(mod => ({ default: mod.QRCodeScanner }))) as unknown as React.ComponentType<{ onDetected?: (text: string) => void }>;

  // ======================
  // LOAD DỮ LIỆU TỪ SUPABASE
  // ======================

  const loadMachinesFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('status', 'active');
      if (error) throw error;
      if (data && data.length > 0) setMachines(data as Machine[]);
    } catch (error) {
      console.error('Error loading machines:', error);
    }
  }, []);

  const loadProjectsFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('trang_thai', 'active');
      if (error) throw error;
      if (data && data.length > 0) {
        const formattedProjects: Project[] = data.map((p: any) => ({
          id: p.id,
          maDuAn: p.maDuAn || p.ma_du_an,
          tenDuAn: p.tenDuAn || p.ten_du_an,
          createdAt: p.createdAt || p.created_at || new Date().toISOString(),
        }));
        setProjects(formattedProjects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }, []);

  const getCategoriesFromLocalStorage = useCallback(() => {
    const localKeys = ['categoryTypes', 'categories'];

    for (const key of localKeys) {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;

        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (err) {
        console.warn(`Cannot parse ${key} from localStorage`, err);
      }
    }

    return [];
  }, []);

  const buildFallbackCategories = useCallback(() => {
    if (masterData.tools.length > 0) {
      return masterData.tools.map((tool: any) => ({
        id: tool.id || crypto.randomUUID(),
        maLoai: tool.id || '',
        tenLoai: tool.name || '',
        donVi: tool.unit || 'cái',
        gia: 0,
        createdAt: new Date().toISOString(),
      }));
    }

    return [
      { id: '1', maLoai: 'DAO001', tenLoai: 'Dao phay mặt đầu', donVi: 'cái', gia: 500000, createdAt: new Date().toISOString() },
      { id: '2', maLoai: 'DAO002', tenLoai: 'Dao phay ngón', donVi: 'cái', gia: 450000, createdAt: new Date().toISOString() },
      { id: '3', maLoai: 'DAO003', tenLoai: 'Mũi khoan', donVi: 'cái', gia: 300000, createdAt: new Date().toISOString() },
    ];
  }, [masterData.tools]);

  const loadCategoriesFromSupabase = useCallback(async () => {
    let categoriesData: any[] = [];

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;
      categoriesData = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error loading categories:', error);
    }

    if (categoriesData.length === 0) {
      categoriesData = getCategoriesFromLocalStorage();
    }

    if (categoriesData.length === 0) {
      categoriesData = buildFallbackCategories();
    }

    const formattedCategories: CategoryType[] = categoriesData
      .map((c: any) => ({
        id: c.id || c.maLoai || c.ma_loai || crypto.randomUUID(),
        maLoai: c.maLoai || c.ma_loai || c.id || '',
        tenLoai: c.tenLoai || c.ten_loai || c.name || c.tenChungLoai || '',
        donVi: c.donVi || c.don_vi || c.donVi || c.unit || 'cái',
        gia: c.gia || 0,
        createdAt: c.createdAt || c.created_at || new Date().toISOString(),
      }))
      .filter((cat) => !!cat.tenLoai);

    setCategoryTypes(formattedCategories);
  }, [buildFallbackCategories, getCategoriesFromLocalStorage]);

  const loadEmployees = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active');
      if (error) throw error;
      if (data && data.length > 0) {
        const formattedEmployees: Employee[] = data.map((emp: any) => ({
          id: emp.id,
          msnv: emp.msnv,
          hoTen: emp.ho_ten || emp.full_name || emp.hoTen,
          fullName: emp.ho_ten || emp.full_name || emp.fullName,
          name: emp.ho_ten || emp.full_name || emp.name,
          role: emp.chuc_vu?.toLowerCase() || emp.role?.toLowerCase() || 'user',
          chucVu: emp.chuc_vu || emp.position || '',
          department: emp.phong_ban || emp.department || '',
        }));
        setEmployees(formattedEmployees);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  }, []);

  const loadAllMasterData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      await Promise.all([
        loadMachinesFromSupabase(),
        loadProjectsFromSupabase(),
        loadCategoriesFromSupabase(),
        loadEmployees(),
      ]);
    } catch (error) {
      console.error('Error loading master data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, [loadMachinesFromSupabase, loadProjectsFromSupabase, loadCategoriesFromSupabase, loadEmployees]);

  useEffect(() => {
    loadAllMasterData();

    const handleStorageChange = () => {
      loadAllMasterData();
    };

    window.addEventListener('app-data-synced', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('app-data-synced', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadAllMasterData]);

  useEffect(() => {
    if (getUserName() && !initialData) {
      setFormData((prev: any) => ({
        ...prev,
        nguoiVanHanh: getUserName() || prev.nguoiVanHanh,
      }));
    }
  }, [user, getUserName, initialData]);

  const getInspectorsByRole = useCallback(() => {
    try {
      const allowedRoles = new Set(['admin', 'quan_ly_xuong', 'to_truong', 'to_pho', 'nhom_truong']);
      const allowedChucVu = new Set(['admin', 'quản lý xưởng', 'tổ trưởng', 'tổ phó', 'nhóm trưởng']);
      
      if (employees.length > 0) {
        const inspectorList = employees
          .filter((emp: Employee) => {
            const role = (emp.role || '').toLowerCase();
            const chucVu = (emp.chucVu || '').toLowerCase();
            return allowedRoles.has(role) || allowedChucVu.has(chucVu);
          })
          .map((emp: Employee) => emp.hoTen || emp.fullName || emp.name || '')
          .filter((name: string) => name && name.trim() !== '');
        if (inspectorList.length > 0) {
          setInspectors(inspectorList);
          return;
        }
      }
      setInspectors([]);
    } catch (error) {
      console.error('Error getting inspectors:', error);
      setInspectors(masterData.inspectors || []);
    }
  }, [employees, masterData.inspectors]);

  useEffect(() => {
    if (employees.length > 0) getInspectorsByRole();
  }, [employees, getInspectorsByRole]);

  const handleTimeChange = (
    machiningHours: string,
    setupHours: string,
    shift: 'ngay' | 'dem' | '',
    machiningEntries: WorkTimeEntry[],
    setupEntries: WorkTimeEntry[]
  ) => {
    setFormData((prev: any) => ({
      ...prev,
      tgTrenCa: machiningHours,
      tgGaPhoi: setupHours,
      ca: shift,
      workTimeEntries: machiningEntries,
      setupTimeEntries: setupEntries,
    }));
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleProjectSelect = (project: Project) => {
    setFormData((prev: any) => ({ ...prev, duAn: project.maDuAn, tenDuAn: project.tenDuAn }));
    setProjectSearch(project.maDuAn);
    setIsProjectDropdownOpen(false);
  };

  const addToolEntry = () => {
    if (formData.toolEntries.length < 20) {
      setFormData((prev: any) => ({
        ...prev,
        toolEntries: [...prev.toolEntries, createEmptyToolEntry()]
      }));
      toast.success(`Đã thêm dao cụ (${formData.toolEntries.length + 1}/20)`);
    } else {
      toast.warning('Đã đạt giới hạn tối đa');
    }
  };

  const removeToolEntry = (index: number) => {
    setFormData((prev: any) => ({ 
      ...prev, 
      toolEntries: prev.toolEntries.filter((_: ToolEntry, i: number) => i !== index) 
    }));
    setOpenCombobox((prev) => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
  };

  const updateToolEntry = (index: number, field: keyof ToolEntry, value: string | number) => {
    setFormData((prev: any) => ({
      ...prev,
      toolEntries: prev.toolEntries.map((entry: ToolEntry, i: number) => {
        if (i === index) {
          return updateSingleToolEntry(entry, field, value, categoryTypes);
        }
        return entry;
      })
    }));
  };

  const handleToolSelection = (index: number, currentValue: string) => {
    updateToolEntry(index, 'tenDao', currentValue);
    setOpenCombobox((prev) => ({ ...prev, [index]: false }));
  };

  const getMachineName = (machine: Machine): string => {
    return machine.ten_may || machine.tenMay || machine.name || machine.ma_may || '';
  };

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
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

      const selectedMachine = machines.find((m) => getMachineName(m) === formData.maySanXuat);
      const machineShiftPrice = selectedMachine?.gia_8h_1ca || selectedMachine?.gia_10h_1ca || selectedMachine?.gia_12h_1ca || 0;
      
      const { totalRunHours, totalSetupHours, runAmount, setupAmount } = calculateCosts(
        formData.workTimeEntries,
        formData.setupTimeEntries,
        machineShiftPrice
      );

      const updatedToolEntries = validToolEntries.map((tool: ToolEntry) => ({
        ...tool,
        thanhTien: (tool.slSuDung || 0) * (tool.donGia || 0),
      }));

      const submitData: any = {
        ...formData,
        toolEntries: updatedToolEntries,
        nguoiVanHanh: formData.nguoiVanHanh || (initialData ? initialData.nguoiVanHanh : getUserName()),
        status: initialData?.status || 'pending',
        chiPhiGa: setupAmount,
        chiPhiChayMay: runAmount,
        chiPhiDao: updatedToolEntries.reduce((sum: number, tool: ToolEntry) => sum + (tool.thanhTien || 0), 0),
        gioGa: totalSetupHours,
        gioChay: totalRunHours,
      };

      onSubmit(submitData);

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
          nguoiVanHanh: getUserName(),
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

  const filteredProjects = projects.filter((project: Project) =>
    project.maDuAn?.toLowerCase().includes(projectSearch.toLowerCase()) ||
    project.tenDuAn?.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const uniqueMachinesForSelect = useMemo(() => {
    const machineMap = new Map<string, Machine>();
    machines.forEach((machine: Machine) => {
      const name = getMachineName(machine);
      if (name && !machineMap.has(name)) machineMap.set(name, machine);
    });
    return Array.from(machineMap.values());
  }, [machines]);

  if (isLoadingData && machines.length === 0 && projects.length === 0 && categoryTypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="px-3 py-1 text-sm">
                  Người dùng: {getUserName()}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 items-center mt-3 sm:mt-0">
                <Badge variant="secondary" className="px-3 py-1 text-sm">
                  Chào mừng, {getUserName()}
                </Badge>
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 mt-2">
                {initialData ? 'Chỉnh sửa nhật ký sản xuất' : 'Thêm mới nhật ký sản xuất'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {initialData 
                  ? 'Chỉnh sửa thông tin nhật ký sản xuất' 
                  : 'Nhập đầy đủ thông tin sản xuất, dao cụ và thời gian gia công'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Thông tin cơ bản */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-bold text-slate-800">📋 Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="ngayThang" className="text-sm font-semibold text-slate-700">Ngày tháng <span className="text-red-500">*</span></Label>
                  <DateInput
                    id="ngayThang"
                    value={formData.ngayThang}
                    onChange={(value: string) => handleInputChange('ngayThang', value)}
                    className="mt-1.5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="maySanXuat" className="text-sm font-semibold text-slate-700">Máy Sản Xuất <span className="text-red-500">*</span></Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Select value={formData.maySanXuat} onValueChange={(value: string) => handleInputChange('maySanXuat', value)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Chọn máy sản xuất" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueMachinesForSelect.length > 0 ? (
                          uniqueMachinesForSelect.map((machine: Machine) => (
                            <SelectItem key={machine.id} value={getMachineName(machine)}>
                              {getMachineName(machine)}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="placeholder" disabled>Chưa có dữ liệu máy</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" type="button" onClick={() => setScannerOpen(true)} size="icon">
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-slate-700">Ca sản xuất</Label>
                  <div className="flex gap-2 mt-1.5">
                    {['ngay', 'dem'].map((shift: string) => (
                      <button
                        key={shift}
                        type="button"
                        onClick={() => handleInputChange('ca', shift)}
                        className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                          formData.ca === shift
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {shift === 'ngay' ? '🌞 Ca ngày' : '🌙 Ca đêm'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Thông tin dự án */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-bold text-slate-800">🎯 Thông tin dự án</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="duAn" className="text-sm font-semibold text-slate-700">Mã Dự Án <span className="text-red-500">*</span></Label>
                  <div className="relative mt-1.5">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                      className="pl-10"
                      required
                    />
                    {isProjectDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                        {filteredProjects.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            {projects.length === 0 ? 'Chưa có dự án nào. Vui lòng thêm dự án ở Quản lý Danh Mục.' : 'Không tìm thấy dự án phù hợp.'}
                          </div>
                        ) : (
                          filteredProjects.map((project: Project) => (
                            <button
                              key={project.id}
                              type="button"
                              onMouseDown={() => handleProjectSelect(project)}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-sm">{project.maDuAn}</div>
                              <div className="text-gray-500 text-xs">{project.tenDuAn}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="tenDuAn" className="text-sm font-semibold text-slate-700">Tên Dự Án <span className="text-red-500">*</span></Label>
                  <Input
                    id="tenDuAn"
                    value={formData.tenDuAn}
                    readOnly
                    disabled
                    className="mt-1.5 bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed"
                    placeholder="Sẽ tự động điền khi chọn dự án"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chi tiết gia công */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-bold text-slate-800">🔧 Chi tiết gia công</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-semibold text-slate-700">Bản vẽ số</Label>
                  <Input
                    value={formData.banVeSo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('banVeSo', e.target.value)}
                    placeholder="Nhập số bản vẽ"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-slate-700">Chi tiết số</Label>
                  <Input
                    value={formData.chiTietSo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('chiTietSo', e.target.value)}
                    placeholder="Nhập số chi tiết"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div className="mt-6">
                <Label className="text-sm font-semibold text-slate-700">Tên chi tiết</Label>
                <Input
                  value={formData.tenChiTiet}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('tenChiTiet', e.target.value)}
                  placeholder="Nhập tên chi tiết"
                  className="mt-1.5"
                />
              </div>
              <div className="mt-6">
                <Label className="text-sm font-semibold text-slate-700">Nội dung gia công</Label>
                <Textarea
                  value={formData.noiDungGiaCong}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('noiDungGiaCong', e.target.value)}
                  placeholder="Mô tả nội dung gia công"
                  rows={3}
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Số lượng và vật liệu */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-bold text-slate-800">📦 Số lượng & Vật liệu</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label className="text-sm font-semibold text-slate-700">Số lượng hoàn thành</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={formData.soLuongHoanThanh}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('soLuongHoanThanh', Number.parseFloat(e.target.value) || 0)}
                    min="0"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-slate-700">Vật liệu</Label>
                  <Input
                    value={formData.vatLieu}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vatLieu', e.target.value)}
                    placeholder="Loại vật liệu"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-slate-700">Nguyên công số</Label>
                  <Input
                    value={formData.nguyenCongSo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('nguyenCongSo', e.target.value)}
                    placeholder="Số nguyên công"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Thông tin dao cụ */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-bold text-slate-800">Thông tin dao cụ</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addToolEntry}
                  disabled={formData.toolEntries.length >= 20}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Thêm Dao ({formData.toolEntries.length}/20)
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {formData.toolEntries.map((entry: ToolEntry, index: number) => (
                  <div key={`tool-${index}-${entry.tenDao || index}`} className="border border-slate-200 rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-center mb-3">
                      <Label className="font-semibold text-slate-700">Dao cụ {index + 1}</Label>
                      {formData.toolEntries.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeToolEntry(index)} className="text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="lg:col-span-2">
                        <Label className="text-sm">Tên dao</Label>
                        <Popover open={openCombobox[index]} onOpenChange={(open) => setOpenCombobox((prev) => ({ ...prev, [index]: open }))}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between mt-1 font-normal"
                            >
                              {entry.tenDao
                                ? categoryTypes.find((cat) => cat.tenLoai === entry.tenDao)?.tenLoai
                                : "Chọn dao"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Nhập tên dao để tìm..." />
                              <CommandEmpty>Không tìm thấy dao cụ.</CommandEmpty>
                              <CommandGroup>
                                {categoryTypes.map((category) => (
                                  <CommandItem
                                    key={category.id}
                                    value={category.tenLoai}
                                    onSelect={(currentValue) => handleToolSelection(index, currentValue)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        entry.tenDao === category.tenLoai ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {category.tenLoai}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label className="text-sm">SL cấp</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={entry.slCap}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateToolEntry(index, 'slCap', e.target.value === '' ? 0 : Number.parseFloat(e.target.value))}
                          min="0"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">SL sử dụng</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={entry.slSuDung}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateToolEntry(index, 'slSuDung', e.target.value === '' ? 0 : Number.parseFloat(e.target.value))}
                          min="0"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">SL hỏng</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={entry.hong}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateToolEntry(index, 'hong', e.target.value === '' ? 0 : Number.parseFloat(e.target.value))}
                          min="0"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Đơn vị</Label>
                        <Input value={entry.donVi} readOnly className="mt-1 bg-gray-50" />
                      </div>
                    </div>
                  </div>
                ))}
                {categoryTypes.length === 0 && !isLoadingData && (
                  <p className="text-center text-gray-400 text-sm py-4">
                    Chưa có dữ liệu dao cụ. Vui lòng thêm danh mục dao cụ trong Quản lý Danh mục.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Thời gian gia công */}
          <OptimizedTimeInput 
            onTimeChange={handleTimeChange} 
            initialMachiningEntries={formData.workTimeEntries} 
            initialSetupEntries={formData.setupTimeEntries} 
          />

          {/* Nhân sự */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base font-bold text-slate-800">👥 Nhân sự</CardTitle>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="nguoiVanHanh" className="text-sm font-semibold text-slate-700">
                    Người vận hành
                  </Label>
                  <Input
                    id="nguoiVanHanh"
                    value={formData.nguoiVanHanh}
                    onChange={(e) => handleInputChange('nguoiVanHanh', e.target.value)}
                    className="mt-1.5 bg-white border-blue-200 focus:border-blue-400"
                    placeholder="Nhập tên người vận hành..."
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    * Nhập tên người vận hành
                  </p>
                </div>

                <div>
                  <Label htmlFor="nguoiKiemTra" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    Người kiểm tra
                  </Label>
                  <Select
                    value={formData.nguoiKiemTra}
                    onValueChange={(value: string) => handleInputChange('nguoiKiemTra', value)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Chọn người kiểm tra" />
                    </SelectTrigger>
                    <SelectContent>
                      {(inspectors.length > 0 ? inspectors : masterData.inspectors).map((inspector: string) => (
                        <SelectItem key={inspector} value={inspector}>
                          {inspector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">
                    * Chọn người kiểm tra (Tổ trưởng, Tổ phó, Nhóm trưởng, Quản lý)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 pb-6">
            <Button type="button" variant="outline" onClick={() => onCancel?.()} className="px-6">
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              {initialData ? 'Cập nhật' : 'Lưu nhật ký'}
            </Button>
          </div>

        </form>

        {/* QR Scanner Dialog */}
        <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Quét mã QR máy</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600 mb-3">Đưa mã QR vào khung camera để quét.</p>
              <Suspense fallback={<div className="text-center py-8 text-gray-500">Đang tải máy quét...</div>}>
                <LazyScanner onDetected={(text: string) => {
                  const found = machines.find((m) =>
                    (m as any)?.qrData === text ||
                    (m as any)?.id === text ||
                    getMachineName(m) === text
                  );
                  if (found) {
                    setFormData((prev: any) => ({ ...prev, maySanXuat: getMachineName(found) }));
                    toast.success(`Đã chọn máy: ${getMachineName(found)}`);
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
  );
}