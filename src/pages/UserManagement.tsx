// src/pages/UserManagement.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  UserCheck, 
  RefreshCw, 
  Key, 
  Edit, 
  FileSpreadsheet, 
  Trash2, 
  UserPlus, 
  Search, 
  Lock,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { hashPassword } from '@/lib/passwordUtils';
import { EmployeeService, type Employee as ServiceEmployee } from '@/services/employeeService';
import { PermissionService } from '@/services/permissionService';
import { useAuth } from '@/contexts/AuthContext';

// ==================== CONSTANTS ====================

const POSITIONS = [
  'Quản lý xưởng',
  'Tổ trưởng',
  'Tổ phó',
  'Nhóm trưởng',
  'Nhân viên QC',
  'Nhân viên bảo trì',
  'Thợ cơ khí',
  'Thợ CNC',
  'Nhân viên kho',
  'Kỹ sư',
  'Nhân viên văn phòng',
];

const DEPARTMENTS = [
  'Tổ CNC',
  'Tổ Cơ Khí',
  'Quản lý Chung',
  'Phòng Kỹ thuật',
  'Phòng QC',
  'Phòng Kho',
  'Phòng Hành chính',
];

// ==================== TYPES ====================

interface EmployeeUI {
  msnv: string;
  ho_ten: string;
  phong_ban?: string | null;
  chuc_vu?: string | null;
  department: string;
  position: string;
  status: 'active' | 'inactive';
  password_hash?: string;
  role?: string;
  role_group?: string | null;
  email?: string | null;
  dien_thoai?: string | null;
}

// ==================== MAP FUNCTIONS ====================

function mapServiceToUI(emp: ServiceEmployee): EmployeeUI {
  return {
    msnv: emp.msnv,
    ho_ten: emp.ho_ten,
    phong_ban: emp.phong_ban,
    chuc_vu: emp.chuc_vu,
    department: emp.phong_ban || '',
    position: emp.chuc_vu || '',
    status: (emp.status === 'active' || emp.status === 'inactive') ? emp.status : 'active',
    password_hash: emp.password_hash,
    role: emp.role,
    role_group: emp.role_group,
    email: emp.email || null,
    dien_thoai: emp.dien_thoai || null,
  };
}

function mapUIToService(emp: Partial<EmployeeUI>): Partial<ServiceEmployee> {
  return {
    msnv: emp.msnv,
    ho_ten: emp.ho_ten,
    phong_ban: emp.department || emp.phong_ban,
    chuc_vu: emp.position || emp.chuc_vu,
    status: emp.status,
    password_hash: emp.password_hash,
    role: emp.role,
    role_group: emp.role_group,
    email: emp.email,
    dien_thoai: emp.dien_thoai,
  };
}

// ==================== MAIN COMPONENT ====================

export function UserManagement() {
  const { user, refreshUser, logout } = useAuth();

  // ===== STATE =====
  const [employees, setEmployees] = useState<EmployeeUI[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [msnv, setMsnv] = useState('');
  const [hoTen, setHoTen] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [email, setEmail] = useState('');
  const [dienThoai, setDienThoai] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // ===== EFFECTS =====
  useEffect(() => {
    loadEmployees();
  }, []);

  // ===== LOAD DATA =====
  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      const data = await EmployeeService.getAll();
      const mapped = data.map(mapServiceToUI);
      setEmployees(mapped);
    } catch (err: any) {
      console.error('Error loading employees:', err);
      toast.error('Lỗi tải dữ liệu: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== IMPORT EXCEL =====
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as any[];

        if (rows.length === 0) {
          toast.error('File Excel rỗng');
          setIsLoading(false);
          return;
        }

        let addedCount = 0;
        let errorCount = 0;

        for (const row of rows) {
          try {
            const msnv = String(row['MSNV'] || row['Mã số'] || '').trim().toUpperCase();
            const name = String(row['Họ và tên'] || row['Tên'] || '').trim();

            if (!msnv || !name) {
              errorCount++;
              continue;
            }

            let dept = String(row['Bộ phận'] || row['Tổ'] || '').trim();
            let pos = String(row['Chức vụ'] || '').trim();

            if (!DEPARTMENTS.includes(dept)) dept = DEPARTMENTS[0];
            if (!POSITIONS.includes(pos)) pos = 'Thợ CNC';

            const existing = await EmployeeService.getByMsnv(msnv);

            if (!existing) {
              const passwordHash = await hashPassword(msnv);
              await EmployeeService.create({
                msnv,
                ho_ten: name,
                phong_ban: dept,
                chuc_vu: pos,
                status: 'active',
                password_hash: passwordHash,
                email: String(row['Email'] || '').trim() || null,
                dien_thoai: String(row['Điện thoại'] || '').trim() || null,
              });
              await PermissionService.createDefaultPermissions(msnv);
              addedCount++;
            }
          } catch (err) {
            errorCount++;
            console.error('Error importing row:', err);
          }
        }

        if (addedCount === 0 && errorCount === 0) {
          toast.warning('Không có nhân viên mới');
        } else if (addedCount > 0) {
          toast.success(`Đã import ${addedCount} nhân viên${errorCount > 0 ? `, ${errorCount} dòng lỗi` : ''}`);
          await loadEmployees();
        } else {
          toast.error(`Import thất bại, ${errorCount} dòng lỗi`);
        }
      } catch (err: any) {
        toast.error('Lỗi import: ' + err.message);
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  // ===== SAVE USER =====
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!msnv || !hoTen || !department || !position) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const trimmedMsnv = msnv.trim().toUpperCase();

    if (isEditing) {
      // ===== UPDATE =====
      try {
        setIsLoading(true);

        const updates: Partial<ServiceEmployee> = {
          ho_ten: hoTen.trim(),
          phong_ban: department,
          chuc_vu: position,
          status,
          email: email.trim() || null,
          dien_thoai: dienThoai.trim() || null,
        };

        if (password.trim()) {
          updates.password_hash = await hashPassword(password.trim());
        }

        await EmployeeService.update(trimmedMsnv, updates);

        // Refresh user if editing self
        if (user && user.msnv === trimmedMsnv) {
          await refreshUser();
        }

        toast.success('Cập nhật thành công');
        await loadEmployees();
        resetForm();
      } catch (err: any) {
        toast.error('Lỗi cập nhật: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      // ===== CREATE =====
      try {
        setIsLoading(true);

        // Check if exists
        const existing = await EmployeeService.getByMsnv(trimmedMsnv);
        if (existing) {
          toast.error('MSNV đã tồn tại');
          setIsLoading(false);
          return;
        }

        const passwordHash = await hashPassword(password.trim() || trimmedMsnv);

        await EmployeeService.create({
          msnv: trimmedMsnv,
          ho_ten: hoTen.trim(),
          phong_ban: department,
          chuc_vu: position,
          status: 'active',
          password_hash: passwordHash,
          email: email.trim() || null,
          dien_thoai: dienThoai.trim() || null,
        });

        await PermissionService.createDefaultPermissions(trimmedMsnv);

        toast.success('Thêm nhân viên thành công');
        await loadEmployees();
        resetForm();
      } catch (err: any) {
        toast.error('Lỗi thêm: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // ===== RESET PASSWORD =====
  const handleResetPassword = async (targetMsnv: string, name: string) => {
    if (!confirm(`Reset mật khẩu của "${name}" về MSNV?`)) return;

    try {
      setIsLoading(true);
      await EmployeeService.resetPassword(targetMsnv);

      // Refresh user if resetting self
      if (user && user.msnv === targetMsnv) {
        await refreshUser();
      }

      toast.success(`Reset mật khẩu cho "${name}" thành công`);
      await loadEmployees();
    } catch (err: any) {
      toast.error('Lỗi reset: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== SOFT DELETE - Chỉ khóa =====
  const handleSoftDelete = async (targetMsnv: string, name: string) => {
    if (targetMsnv === '1118') {
      toast.error('Không thể khóa tài khoản Admin');
      return;
    }

    if (!confirm(`🔒 Khóa tài khoản "${name}" (${targetMsnv})?`)) return;

    try {
      setIsLoading(true);
      await EmployeeService.delete(targetMsnv);
      
      // Clear permission cache
      PermissionService.clearCache(targetMsnv);
      
      toast.success(`🔒 Đã khóa nhân viên "${name}"`);
      await loadEmployees();

      // Nếu user đang login bị khóa, logout
      if (user && user.msnv === targetMsnv) {
        await logout();
        toast.warning('Tài khoản của bạn đã bị khóa. Vui lòng đăng nhập lại.');
      }

      // Reset form if editing deleted user
      if (isEditing && msnv === targetMsnv) {
        resetForm();
      }
    } catch (err: any) {
      toast.error('Lỗi khóa: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== HARD DELETE - Xóa vĩnh viễn =====
  const handleHardDelete = async (targetMsnv: string, name: string) => {
    if (targetMsnv === '1118') {
      toast.error('Không thể xóa tài khoản Admin');
      return;
    }

    if (!confirm(
      `🚨 CẢNH BÁO!\n\n` +
      `Bạn có chắc chắn muốn XÓA VĨNH VIỄN nhân viên "${name}" (${targetMsnv})?\n` +
      `Hành động này KHÔNG THỂ HOÀN TÁC!\n\n` +
      `Tất cả dữ liệu liên quan sẽ bị mất vĩnh viễn.`
    )) return;

    try {
      setIsLoading(true);
      await EmployeeService.hardDelete(targetMsnv);
      
      // Clear permission cache
      PermissionService.clearCache(targetMsnv);
      
      toast.success(`✅ Đã xóa vĩnh viễn nhân viên "${name}"`);
      await loadEmployees();

      // Nếu user đang login bị xóa, logout
      if (user && user.msnv === targetMsnv) {
        await logout();
        toast.warning('Tài khoản của bạn đã bị xóa. Vui lòng đăng nhập lại.');
      }

      // Reset form if editing deleted user
      if (isEditing && msnv === targetMsnv) {
        resetForm();
      }
    } catch (err: any) {
      toast.error('Lỗi xóa: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== EDIT USER =====
  const handleEditClick = (emp: EmployeeUI) => {
    setIsEditing(true);
    setMsnv(emp.msnv);
    setHoTen(emp.ho_ten);
    setDepartment(emp.department);
    setPosition(emp.position);
    setStatus(emp.status);
    setEmail(emp.email || '');
    setDienThoai(emp.dien_thoai || '');
    setPassword('');
  };

  // ===== RESET FORM =====
  const resetForm = () => {
    setIsEditing(false);
    setMsnv('');
    setHoTen('');
    setDepartment('');
    setPosition('');
    setPassword('');
    setStatus('active');
    setEmail('');
    setDienThoai('');
  };

  // ===== FILTER EMPLOYEES =====
  const filteredEmployees = employees.filter(e => {
    // Lọc theo trạng thái (ẩn inactive theo mặc định)
    if (!showInactive && e.status === 'inactive') return false;
    
    // Tìm kiếm
    const searchLower = searchTerm.toLowerCase();
    return e.msnv.toLowerCase().includes(searchLower) ||
           e.ho_ten.toLowerCase().includes(searchLower) ||
           (e.department && e.department.toLowerCase().includes(searchLower)) ||
           (e.position && e.position.toLowerCase().includes(searchLower));
  });

  // ===== RENDER =====
  return (
    <div className="w-full space-y-5">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportExcel}
        accept=".xlsx, .xls"
        hidden
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản lý Nhân sự</h1>
          <Badge variant="outline" className="ml-2 text-xs">
            {employees.filter(e => e.status === 'active').length} đang hoạt động
          </Badge>
          {employees.filter(e => e.status === 'inactive').length > 0 && (
            <Badge variant="outline" className="text-xs border-amber-200 text-amber-600">
              {employees.filter(e => e.status === 'inactive').length} đã khóa
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="h-9"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Import Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadEmployees}
            disabled={isLoading}
            className="h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Form */}
        <div className="lg:col-span-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Edit className="w-4 h-4 text-amber-600" />
                    Cập nhật nhân viên
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    Thêm nhân viên mới
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveUser} className="space-y-3">
                {/* MSNV */}
                <div>
                  <Label htmlFor="msnv" className="text-xs font-semibold text-slate-600">
                    MSNV <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="msnv"
                    value={msnv}
                    onChange={e => setMsnv(e.target.value.toUpperCase())}
                    disabled={isEditing}
                    placeholder="VD: 1234"
                    className="mt-0.5"
                    required
                  />
                </div>

                {/* Họ tên */}
                <div>
                  <Label htmlFor="hoTen" className="text-xs font-semibold text-slate-600">
                    Họ tên <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="hoTen"
                    value={hoTen}
                    onChange={e => setHoTen(e.target.value)}
                    placeholder="Nhập họ tên"
                    className="mt-0.5"
                    required
                  />
                </div>

                {/* Email & Điện thoại */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="email" className="text-xs font-semibold text-slate-600">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="mt-0.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dienThoai" className="text-xs font-semibold text-slate-600">
                      Điện thoại
                    </Label>
                    <Input
                      id="dienThoai"
                      value={dienThoai}
                      onChange={e => setDienThoai(e.target.value)}
                      placeholder="Số điện thoại"
                      className="mt-0.5"
                    />
                  </div>
                </div>

                {/* Mật khẩu */}
                <div>
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-600">
                    Mật khẩu {isEditing && <span className="text-slate-400 font-normal">(để trống giữ nguyên)</span>}
                  </Label>
                  <Input
                    id="password"
                    type="text"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={isEditing ? 'Nhập mật khẩu mới' : 'Mặc định = MSNV'}
                    className="mt-0.5"
                  />
                </div>

                {/* Department */}
                <div>
                  <Label htmlFor="department" className="text-xs font-semibold text-slate-600">
                    Tổ/Bộ phận <span className="text-red-500">*</span>
                  </Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger id="department" className="mt-0.5">
                      <SelectValue placeholder="Chọn bộ phận" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Position */}
                <div>
                  <Label htmlFor="position" className="text-xs font-semibold text-slate-600">
                    Chức vụ <span className="text-red-500">*</span>
                  </Label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger id="position" className="mt-0.5">
                      <SelectValue placeholder="Chọn chức vụ" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status (only for edit) */}
                {isEditing && (
                  <div>
                    <Label htmlFor="status" className="text-xs font-semibold text-slate-600">
                      Trạng thái
                    </Label>
                    <Select value={status} onValueChange={(v: 'active' | 'inactive') => setStatus(v)}>
                      <SelectTrigger id="status" className="mt-0.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">✅ Hoạt động</SelectItem>
                        <SelectItem value="inactive">⛔ Tạm khóa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Buttons */}
                <div className="space-y-2 pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Đang xử lý...' : (isEditing ? 'Cập nhật' : 'Thêm mới')}
                  </Button>

                  {isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resetForm}
                      className="w-full text-slate-500 hover:text-slate-700"
                      disabled={isLoading}
                    >
                      Hủy chỉnh sửa
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Employee List */}
        <div className="lg:col-span-8">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>Danh sách nhân viên</span>
                <span className="text-xs font-normal text-slate-400">
                  {filteredEmployees.length} / {employees.filter(e => showInactive || e.status === 'active').length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Tìm kiếm theo MSNV, tên, bộ phận, chức vụ..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 bg-white border-slate-200 focus-visible:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="checkbox"
                    id="showInactive"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="h-4 w-4 transform scale-50 rounded-sm border-slate-900 data-[state=checked]:bg-blue-600"
                  />
                  <label htmlFor="showInactive" className="text-sm text-slate-600 cursor-pointer flex items-center gap-1">
                    <EyeOff className="w-3.5 h-3.5" />
                    Hiển thị user đã khóa
                  </label>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/70">
                      <TableRow>
                        <TableHead className="text-xs font-bold text-slate-600">MSNV</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600">Họ tên</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 hidden md:table-cell">Bộ phận</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 hidden sm:table-cell">Chức vụ</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600">Trạng thái</TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                            {searchTerm ? 'Không tìm thấy nhân viên phù hợp' : 'Chưa có nhân viên nào'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEmployees.map(emp => (
                          <TableRow key={emp.msnv} className={emp.status === 'inactive' ? 'bg-slate-50/50' : 'hover:bg-slate-50/50'}>
                            <TableCell className="font-mono text-xs font-semibold text-slate-700">
                              {emp.msnv}
                            </TableCell>
                            <TableCell className="font-medium text-slate-800">
                              {emp.ho_ten}
                              {emp.msnv === '1118' && (
                                <Badge className="ml-2 text-[10px] bg-red-100 text-red-700 hover:bg-red-100">
                                  Admin
                                </Badge>
                              )}
                              {emp.status === 'inactive' && (
                                <Badge className="ml-2 text-[10px] bg-slate-200 text-slate-600 hover:bg-slate-200">
                                  Đã khóa
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 hidden md:table-cell">
                              {emp.department || '-'}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 hidden sm:table-cell">
                              {emp.position || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={emp.status === 'active' ? 'default' : 'secondary'}
                                className={emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}
                              >
                                {emp.status === 'active' ? '✅ Hoạt động' : '⛔ Khóa'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditClick(emp)}
                                  className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                  title="Chỉnh sửa"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleResetPassword(emp.msnv, emp.ho_ten)}
                                  className="h-8 w-8 text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                  title="Reset mật khẩu"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </Button>
                                {emp.msnv !== '1118' && (
                                  <>
                                    {/* 🔵 Nút Khóa (Soft Delete) */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleSoftDelete(emp.msnv, emp.ho_ten)}
                                      className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                                      title="Khóa tài khoản"
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </Button>
                                    {/* 🔴 Nút Xóa vĩnh viễn (Hard Delete) */}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleHardDelete(emp.msnv, emp.ho_ten)}
                                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                      title="Xóa vĩnh viễn"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Hiển thị {filteredEmployees.length} / {employees.length} nhân viên
                  {!showInactive && employees.filter(e => e.status === 'inactive').length > 0 && (
                    <span className="text-amber-500 ml-1">
                      ({employees.filter(e => e.status === 'inactive').length} đã khóa - bật checkbox để xem)
                    </span>
                  )}
                </span>
                <span className="font-mono">
                  {employees.filter(e => e.status === 'active').length} đang hoạt động
                  {employees.filter(e => e.status === 'inactive').length > 0 && (
                    <span className="text-slate-400 ml-1">
                      • {employees.filter(e => e.status === 'inactive').length} đã khóa
                    </span>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;