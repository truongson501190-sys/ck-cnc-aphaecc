
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, UserPlus, Trash2, UserCheck, RefreshCw, Key, Edit, X } from 'lucide-react';
import { toast } from 'sonner';

const POSITIONS = [
  'Quản lý xưởng', 'Tổ trưởng', 'Tổ phó', 'Nhân viên QC', 
  'Nhân viên bảo trì', 'Thợ cơ khí', 'Thợ CNC', 'Nhân viên kho'
];

const DEPARTMENTS = ['Tổ CNC', 'Tổ Cơ Khí', 'Quản lý Chung'];

interface UserRecord {
  msnv: string;
  fullName: string;
  department: string;
  position: string;
  password?: string;
  status: 'active' | 'inactive';
}

const ALL_PERMISSIONS_KEYS = [
  'nhap_kho', 'xuat_kho', 'chuyen_kho', 'xuat_dau', 'kiem_ke_kho', 'ton_kho', 'the_kho', 'lich_su_giao_dich',
  'ke_hoach_san_xuat', 'nhat_ky_gia_cong', 'nhat_ky_qc', 'nhat_ky_bao_tri', 'theo_doi_tien_do',
  'dashboard_tong_hop', 'bao_cao_kho', 'bao_cao_gia_cong', 'bao_cao_qc', 'bao_cao_bao_tri', 'hieu_suat_may', 'cho_duyet',
  'chung_loai', 'kho', 'may_moc', 'du_an', 'quan_ly_nguoi_dung', 'phan_quyen', 'audit_log', 'backup_restore', 'cai_dat_he_thong'
];

export function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [msnv, setMsnv] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setIsLoading(true);
    try {
      const stored = localStorage.getItem('wms_users');
      if (stored) {
        setUsers(JSON.parse(stored));
      } else {
        const defaultAdmin: UserRecord[] = [{
          msnv: '1118',
          fullName: 'Administrator',
          department: 'Quản lý Chung',
          position: 'Quản lý xưởng',
          password: '1118',
          status: 'active'
        }];
        localStorage.setItem('wms_users', JSON.stringify(defaultAdmin));
        setUsers(defaultAdmin);
        
        const adminPerms: Record<string, string> = {};
        ALL_PERMISSIONS_KEYS.forEach(key => adminPerms[key] = 'full');
        localStorage.setItem('wms_user_permissions_1118', JSON.stringify(adminPerms));
      }
    } catch (e) {
      toast.error('Lỗi tải danh sách người dùng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msnv || !fullName || !department || !position) {
      toast.error('Vui lòng điền đầy đủ thông tin nhân viên.');
      return;
    }

    const trimmedMsnv = msnv.trim();

    if (isEditing) {
      // Update user in wms_users
      const updatedUsers = users.map(u => {
        if (u.msnv === trimmedMsnv) {
          return { 
            ...u, 
            fullName: fullName.trim(), 
            department, 
            position,
            status,
            password: password.trim() !== '' ? password.trim() : u.password 
          };
        }
        return u;
      });
      localStorage.setItem('wms_users', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      
      // Update userRecords as well
      const userRecordsStr = localStorage.getItem('userRecords');
      if (userRecordsStr) {
        const userRecords = JSON.parse(userRecordsStr);
        const updatedUserRecords = userRecords.map((r: any) => {
          if (r.msnv === trimmedMsnv) {
            return {
              ...r,
              fullName: fullName.trim(),
              department,
              position,
              status: status === 'active',
              passwordHash: password.trim() !== '' ? password.trim() : r.passwordHash
            };
          }
          return r;
        });
        localStorage.setItem('userRecords', JSON.stringify(updatedUserRecords));
      }
      
      toast.success(`Đã cập nhật thông tin nhân viên ${fullName.trim()} thành công.`);
      resetForm();
    } else {
      // Add new user
      if (users.some(u => u.msnv.toLowerCase() === trimmedMsnv.toLowerCase())) {
        toast.error('Mã số nhân viên (MSNV) này đã tồn tại trên hệ thống!');
        return;
      }

      const newUser: UserRecord = {
        msnv: trimmedMsnv,
        fullName: fullName.trim(),
        department,
        position,
        password: password.trim() !== '' ? password.trim() : trimmedMsnv,
        status: 'active'
      };

      const updatedUsers = [...users, newUser];
      localStorage.setItem('wms_users', JSON.stringify(updatedUsers));
      
      // Add to userRecords as well
      const userRecordsStr = localStorage.getItem('userRecords');
      const userRecords = userRecordsStr ? JSON.parse(userRecordsStr) : [];
      userRecords.push({
        id: trimmedMsnv,
        msnv: trimmedMsnv,
        fullName: fullName.trim(),
        department,
        position,
        role: 'user',
        status: true,
        passwordHash: password.trim() !== '' ? password.trim() : trimmedMsnv,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('userRecords', JSON.stringify(userRecords));
      
      // Initialize permissions
      const initialPerms: Record<string, string> = {};
      ALL_PERMISSIONS_KEYS.forEach(key => initialPerms[key] = 'none');
      localStorage.setItem(`wms_user_permissions_${trimmedMsnv}`, JSON.stringify(initialPerms));

      setUsers(updatedUsers);
      toast.success(`Đã thêm thành công nhân viên ${newUser.fullName} vào hệ thống.`);
      resetForm();
    }
  };

  const handleEditClick = (user: UserRecord) => {
    setIsEditing(true);
    setMsnv(user.msnv);
    setFullName(user.fullName);
    setDepartment(user.department);
    setPosition(user.position);
    setStatus(user.status);
    setPassword('');
  };

  const handleResetPassword = (targetMsnv: string, name: string) => {
    if (confirm(`Bạn có chắc muốn đặt lại mật khẩu cho nhân viên [${name}] về mặc định (Mật khẩu mặc định trùng với MSNV: ${targetMsnv})?`)) {
      const updatedUsers = users.map(u => 
        u.msnv === targetMsnv ? { ...u, password: targetMsnv } : u
      );
      localStorage.setItem('wms_users', JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
      
      // Also update userRecords
      const userRecordsStr = localStorage.getItem('userRecords');
      if (userRecordsStr) {
        const userRecords = JSON.parse(userRecordsStr);
        const updatedUserRecords = userRecords.map((r: any) => {
          if (r.msnv === targetMsnv) {
            return { ...r, passwordHash: targetMsnv };
          }
          return r;
        });
        localStorage.setItem('userRecords', JSON.stringify(updatedUserRecords));
      }
      
      toast.success(`Đã reset mật khẩu của nhân viên ${name} về mặc định (${targetMsnv}) thành công!`);
    }
  };

  const handleDeleteUser = (targetMsnv: string) => {
    if (targetMsnv === '1118') {
      toast.error('Không thể xóa tài khoản Quản trị viên hệ thống (1118).');
      return;
    }
    
    if (confirm(`Bạn có chắc chắn muốn xóa hồ sơ và toàn bộ dữ liệu phân quyền của nhân viên có MSNV: ${targetMsnv}?`)) {
      // Remove from wms_users
      const updated = users.filter(u => u.msnv !== targetMsnv);
      localStorage.setItem('wms_users', JSON.stringify(updated));
      
      // Remove from userRecords
      const userRecordsStr = localStorage.getItem('userRecords');
      if (userRecordsStr) {
        const userRecords = JSON.parse(userRecordsStr);
        const updatedUserRecords = userRecords.filter((r: any) => r.msnv !== targetMsnv);
        localStorage.setItem('userRecords', JSON.stringify(updatedUserRecords));
      }
      
      localStorage.removeItem(`wms_user_permissions_${targetMsnv}`);
      setUsers(updated);
      toast.success('Đã xóa tài khoản và thu hồi quyền truy cập thành công.');
      if (isEditing && msnv === targetMsnv) resetForm();
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setMsnv('');
    setFullName('');
    setDepartment('');
    setPosition('');
    setPassword('');
    setStatus('active');
  };

  const filteredUsers = users.filter(u => 
    u.msnv.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" /> Quản lý Hồ sơ Nhân sự hệ thống WMS
          </h1>
          <p className="text-xs text-slate-500">Thiết lập nhân viên xưởng, điều chỉnh chức vụ, đổi mật khẩu và quản lý quyền hạn.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadUsers} disabled={isLoading} className="h-9">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} /> Làm mới dữ liệu
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Form nhập liệu */}
        <Card className="lg:col-span-4 bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold flex items-center justify-between text-slate-800">
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-600" /> 
                {isEditing ? 'Cập nhật thông tin' : 'Thêm nhân sự mới'}
              </span>
              {isEditing && (
                <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="h-6 text-xs text-slate-400 hover:text-slate-600 px-1">
                  <X className="w-3 h-3 mr-1" /> Hủy sửa
                </Button>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              {isEditing ? `Đang chỉnh sửa nhân viên mã số ${msnv}` : 'Thiết lập tài khoản đăng nhập trực tiếp cho nhân viên.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="msnv" className="text-xs font-semibold text-slate-700">Mã số nhân viên (MSNV) *</Label>
                <Input 
                  id="msnv" 
                  placeholder="Ví dụ: 1245" 
                  value={msnv} 
                  onChange={e => setMsnv(e.target.value)} 
                  className="h-9 text-sm focus-visible:ring-indigo-500 border-slate-200 bg-slate-50 disabled:opacity-75 disabled:cursor-not-allowed font-mono font-bold" 
                  disabled={isEditing} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold text-slate-700">Họ và tên *</Label>
                <Input id="fullName" placeholder="Nhập tên nhân viên" value={fullName} onChange={e => setFullName(e.target.value)} className="h-9 text-sm focus-visible:ring-indigo-500 border-slate-200" required />
              </div>
              
              {/* Ô MẬT KHẨU MỚI THÊM */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Mật khẩu {isEditing ? '(Bỏ trống nếu giữ nguyên)' : ''}
                </Label>
                <Input 
                  id="password" 
                  type="text" 
                  placeholder={isEditing ? "Nhập mật khẩu mới tại đây" : "Bỏ trống sẽ tự động lấy MSNV"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="h-9 text-sm focus-visible:ring-indigo-500 border-slate-200 font-mono" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Tổ / Bộ phận làm việc *</Label>
                <Select value={department} onValueChange={setDepartment} required>
                  <SelectTrigger className="h-9 text-sm border-slate-200 focus:ring-indigo-500">
                    <SelectValue placeholder="Chọn tổ / bộ phận" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(d => <SelectItem key={d} value={d} className="text-sm">{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Chức vụ tác nghiệp *</Label>
                <Select value={position} onValueChange={setPosition} required>
                  <SelectTrigger className="h-9 text-sm border-slate-200 focus:ring-indigo-500">
                    <SelectValue placeholder="Chọn chức vụ" />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map(p => <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isEditing && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Trạng thái *</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)} required>
                    <SelectTrigger className="h-9 text-sm border-slate-200 focus:ring-indigo-500">
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Hoạt động</SelectItem>
                      <SelectItem value="inactive">Tạm khóa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className={`w-full h-9 text-white font-semibold shadow-sm text-sm mt-2 ${isEditing ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                {isEditing ? 'Xác nhận cập nhật' : 'Kích hoạt & Cấp tài khoản'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danh sách nhân sự */}
        <Card className="lg:col-span-8 bg-white border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-2 justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input placeholder="Tìm kiếm nhanh nhân viên..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 bg-white h-9 text-sm border-slate-200 focus-visible:ring-indigo-500" />
            </div>
            <span className="text-xs text-slate-500 font-medium shrink-0">Tổng số: <b>{filteredUsers.length}</b> tài khoản</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200">
                  <TableHead className="w-[100px] font-bold text-slate-700 text-xs">MSNV</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Họ và tên</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Bộ phận</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs">Chức vụ</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs text-center">Trạng thái</TableHead>
                  <TableHead className="w-[110px] text-center font-bold text-slate-700 text-xs">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">Không tìm thấy nhân viên phù hợp.</TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(u => (
                    <TableRow key={u.msnv} className={`border-slate-100 ${isEditing && msnv === u.msnv ? 'bg-amber-50/40 hover:bg-amber-50/50' : 'hover:bg-slate-50/60'}`}>
                      <TableCell className="font-mono font-bold text-xs text-slate-600">{u.msnv}</TableCell>
                      <TableCell className="font-semibold text-sm text-slate-800">{u.fullName}</TableCell>
                      <TableCell className="text-xs text-slate-600">{u.department}</TableCell>
                      <TableCell className="text-xs text-slate-600">
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 font-medium border-slate-200">{u.position}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={u.status === 'active' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border border-emerald-200' : 'bg-slate-50 text-slate-700 hover:bg-slate-50 border border-slate-200'}>
                          {u.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditClick(u)}
                            className="h-7 w-7 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md"
                            title="Sửa thông tin nhân sự"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleResetPassword(u.msnv, u.fullName)}
                            disabled={u.msnv === '1118'}
                            className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                            title="Đặt lại mật khẩu gốc"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteUser(u.msnv)} 
                            disabled={u.msnv === '1118'} 
                            className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                            title="Xóa nhân sự"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default UserManagement;
