import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Edit, 
  Trash2, 
  Plus, 
  Settings,
  Shield,
  UserCheck,
  UserX,
  Save,
  X,
  Search,
  Filter,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Key,
  Lock,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { User, UserPermissions, DEFAULT_PERMISSIONS, ADMIN_PERMISSIONS, UserLog } from '@/types/user';
import { toast } from 'sonner';

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [userLogs, setUserLogs] = useState<UserLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form state
  const [formData, setFormData] = useState<Partial<User & { password?: string; confirmPassword?: string }>>({
    msnv: '',
    fullName: '',
    department: 'Tổ CNC',
    position: '',
    role: 'user',
    status: 'active',
    permissions: DEFAULT_PERMISSIONS,
    password: '',
    confirmPassword: ''
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
    showPassword: false
  });

  useEffect(() => {
    loadUsers();
    loadUserLogs();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.msnv.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const loadUsers = () => {
    try {
      // Always load from localStorage (which is synced by AuthContext)
      const savedUsers = localStorage.getItem('users');
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        setUsers(parsedUsers);
        console.log('📋 UserManagement loaded users:', parsedUsers.map((u: User) => ({ msnv: u.msnv, status: u.status })));
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Lỗi tải danh sách người dùng');
    }
  };

  const loadUserLogs = () => {
    try {
      const savedLogs = localStorage.getItem('userLogs');
      if (savedLogs) {
        setUserLogs(JSON.parse(savedLogs));
      }
    } catch (error) {
      console.error('Error loading user logs:', error);
    }
  };

  // Sync function to keep both users and userRecords in perfect sync
  const syncUserData = (updatedUsers: User[]) => {
    // Save to users table
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);

    // Sync with userRecords for authentication
    const userRecords = updatedUsers.map((user, index) => ({
      id: (index + 1).toString(),
      msnv: user.msnv,
      fullName: user.fullName,
      department: user.department,
      position: user.position,
      role: user.role,
      status: user.status === 'active',
      passwordHash: getPasswordHashForUser(user.msnv),
      createdAt: user.createdAt,
      lastLogin: user.updatedAt
    }));

    localStorage.setItem('userRecords', JSON.stringify(userRecords));
    console.log('🔄 Data synced:', { users: updatedUsers.length, userRecords: userRecords.length });
  };

  const getPasswordHashForUser = (msnv: string) => {
    const existingUserRecords = JSON.parse(localStorage.getItem('userRecords') || '[]');
    const existingUser = existingUserRecords.find((u: any) => u.msnv === msnv);
    
    if (existingUser && existingUser.passwordHash) {
      return existingUser.passwordHash;
    }
    
    // Default passwords
    const defaultPasswords: Record<string, string> = {
      'ADM001': btoa('admin123'),
      'CNC001': btoa('123456'),
      'KHO001': btoa('123456'),
      'BT001': btoa('123456'),
      'QC001': btoa('123456'),
      'CK001': btoa('123456')
    };
    
    return defaultPasswords[msnv] || btoa('123456');
  };

  const logUserAction = (action: string, targetMsnv: string, changes: any) => {
    const newLog: UserLog = {
      id: Date.now().toString(),
      adminMsnv: currentUser?.msnv || '',
      targetMsnv,
      action,
      changes,
      timestamp: new Date().toISOString()
    };
    
    const updatedLogs = [...userLogs, newLog];
    setUserLogs(updatedLogs);
    localStorage.setItem('userLogs', JSON.stringify(updatedLogs));
  };

  const handleAddUser = () => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error('Chỉ Admin mới có quyền thêm người dùng');
      return;
    }

    if (!formData.msnv || !formData.fullName || !formData.password) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (users.find(u => u.msnv === formData.msnv)) {
      toast.error('Mã nhân viên đã tồn tại');
      return;
    }

    const newUser: User = {
      msnv: formData.msnv!,
      fullName: formData.fullName!,
      department: formData.department as any,
      position: formData.position!,
      role: formData.role as any,
      status: formData.status as any,
      permissions: formData.role === 'admin' ? ADMIN_PERMISSIONS : (formData.permissions || DEFAULT_PERMISSIONS),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedUsers = [...users, newUser];
    
    // Save both to users and userRecords immediately to ensure consistency
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);

    const userRecords = JSON.parse(localStorage.getItem('userRecords') || '[]');
    const newUserRecord = {
      id: Date.now().toString(),
      msnv: formData.msnv,
      fullName: formData.fullName,
      department: formData.department,
      position: formData.position,
      role: formData.role,
      status: formData.status === 'active',
      passwordHash: btoa(formData.password!),
      createdAt: new Date().toISOString()
    };
    userRecords.push(newUserRecord);
    localStorage.setItem('userRecords', JSON.stringify(userRecords));

    // Force dataSync to push all changes to cloud
    import('@/lib/dataSync').then(({ dataSync }) => {
      dataSync.syncToCloud().catch(err => console.error('Cloud sync failed after adding user:', err));
    });

    logUserAction('ADD_USER', newUser.msnv, newUser);
    
    setIsAddDialogOpen(false);
    resetForm();
    toast.success(`Thêm người dùng thành công! Mật khẩu: ${formData.password}`);
  };

  const handleEditUser = () => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error('Chỉ Admin mới có quyền sửa thông tin người dùng');
      return;
    }

    if (!selectedUser || !formData.fullName) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const updatedUser: User = {
      ...selectedUser,
      fullName: formData.fullName!,
      department: formData.department as any,
      position: formData.position!,
      role: formData.role as any,
      status: formData.status as any,
      permissions: formData.role === 'admin' ? ADMIN_PERMISSIONS : (formData.permissions || selectedUser.permissions),
      updatedAt: new Date().toISOString()
    };

    const updatedUsers = users.map(u => u.msnv === selectedUser.msnv ? updatedUser : u);
    
    // Save to users table
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);

    // Sync with userRecords for authentication
    const userRecords = JSON.parse(localStorage.getItem('userRecords') || '[]');
    const updatedUserRecords = userRecords.map((r: any) => {
      if (r.msnv === selectedUser.msnv) {
        return {
          ...r,
          fullName: updatedUser.fullName,
          department: updatedUser.department,
          position: updatedUser.position,
          role: updatedUser.role,
          status: updatedUser.status === 'active'
        };
      }
      return r;
    });
    localStorage.setItem('userRecords', JSON.stringify(updatedUserRecords));

    // Force dataSync to push all changes to cloud
    import('@/lib/dataSync').then(({ dataSync }) => {
      dataSync.syncToCloud().catch(err => console.error('Cloud sync failed after editing user:', err));
    });

    logUserAction('EDIT_USER', selectedUser.msnv, { before: selectedUser, after: updatedUser });
    
    setIsEditDialogOpen(false);
    setSelectedUser(null);
    resetForm();
    toast.success('Cập nhật thông tin thành công');
  };

  const handleChangePassword = () => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error('Chỉ Admin mới có quyền đổi mật khẩu');
      return;
    }

    if (!selectedUser) {
      toast.error('Không tìm thấy người dùng');
      return;
    }

    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    // Update password in userRecords
    const userRecords = JSON.parse(localStorage.getItem('userRecords') || '[]');
    const updatedUserRecords = userRecords.map((u: any) => 
      u.msnv === selectedUser.msnv 
        ? { ...u, passwordHash: btoa(passwordData.newPassword) }
        : u
    );
    localStorage.setItem('userRecords', JSON.stringify(updatedUserRecords));

    // Force dataSync to push all changes to cloud
    import('@/lib/dataSync').then(({ dataSync }) => {
      dataSync.syncToCloud().catch(err => console.error('Cloud sync failed after changing password:', err));
    });

    logUserAction('CHANGE_PASSWORD', selectedUser.msnv, { changedBy: currentUser.msnv });
    
    setIsPasswordDialogOpen(false);
    setSelectedUser(null);
    setPasswordData({ newPassword: '', confirmPassword: '', showPassword: false });
    toast.success(`Đổi mật khẩu thành công! Mật khẩu mới: ${passwordData.newPassword}`);
  };

  const handleDeleteUser = (msnv: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error('Chỉ Admin mới có quyền xóa người dùng');
      return;
    }

    if (msnv === currentUser.msnv) {
      toast.error('Không thể xóa tài khoản của chính mình');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      return;
    }

    const userToDelete = users.find(u => u.msnv === msnv);
    if (!userToDelete) return;

    const updatedUsers = users.filter(u => u.msnv !== msnv);
    
    // Update users
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);

    // Update userRecords
    const userRecords = JSON.parse(localStorage.getItem('userRecords') || '[]');
    const updatedUserRecords = userRecords.filter((r: any) => r.msnv !== msnv);
    localStorage.setItem('userRecords', JSON.stringify(updatedUserRecords));

    // Force dataSync to push all changes to cloud
    import('@/lib/dataSync').then(({ dataSync }) => {
      dataSync.syncToCloud().catch(err => console.error('Cloud sync failed after deleting user:', err));
    });

    logUserAction('DELETE_USER', msnv, userToDelete);
    toast.success('Xóa người dùng thành công');
  };

  const toggleUserStatus = (msnv: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error('Chỉ Admin mới có quyền thay đổi trạng thái');
      return;
    }

    const user = users.find(u => u.msnv === msnv);
    if (!user) return;

    const newStatus = user.status === 'active' ? 'locked' : 'active';
    const updatedUsers = users.map(u => 
      u.msnv === msnv ? { ...u, status: newStatus, updatedAt: new Date().toISOString() } : u
    );
    
    // Update users
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);

    // Update userRecords
    const userRecords = JSON.parse(localStorage.getItem('userRecords') || '[]');
    const updatedUserRecords = userRecords.map((r: any) => 
      r.msnv === msnv ? { ...r, status: newStatus === 'active' } : r
    );
    localStorage.setItem('userRecords', JSON.stringify(updatedUserRecords));

    // Force dataSync to push all changes to cloud
    import('@/lib/dataSync').then(({ dataSync }) => {
      dataSync.syncToCloud().catch(err => console.error('Cloud sync failed after toggling status:', err));
    });

    logUserAction('TOGGLE_STATUS', msnv, { from: user.status, to: newStatus });
    toast.success(`${newStatus === 'active' ? 'Kích hoạt' : 'Khóa'} tài khoản thành công`);
  };

  const handleRefreshData = () => {
    console.log('🔄 Refreshing data...');
    loadUsers();
    loadUserLogs();
    toast.success('Đã làm mới dữ liệu');
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      ...user,
      permissions: { ...user.permissions }
    });
    setIsEditDialogOpen(true);
  };

  const openPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setPasswordData({ newPassword: '', confirmPassword: '', showPassword: false });
    setIsPasswordDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      msnv: '',
      fullName: '',
      department: 'Tổ CNC',
      position: '',
      role: 'user',
      status: 'active',
      permissions: DEFAULT_PERMISSIONS,
      password: '',
      confirmPassword: ''
    });
  };

  const updatePermission = (module: keyof UserPermissions, permission: keyof UserPermissions[keyof UserPermissions], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions!,
        [module]: {
          ...prev.permissions![module],
          [permission]: value
        }
      }
    }));
  };

  const setAllPermissionsForModule = (module: keyof UserPermissions, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions!,
        [module]: {
          view: value,
          add: value,
          edit: value,
          delete: value,
          approve: value,
          export: value
        }
      }
    }));
  };

  const moduleLabels = {
    'kho-tong': 'Kho tổng',
    'kho-co-khi': 'Kho cơ khí',
    'kho-cnc': 'Kho CNC',
    'kho-dau': 'Kho dầu',
    'bao-cao-tong-hop': 'Báo cáo tổng hợp'
  };

  const permissionLabels = {
    view: 'Xem',
    add: 'Thêm',
    edit: 'Sửa',
    delete: 'Xóa',
    approve: 'Duyệt',
    export: 'Xuất file'
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Không có quyền truy cập</h3>
            <p className="text-gray-600">Chỉ Admin mới có thể truy cập trang quản lý nhân sự.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quản Lý Nhân Sự</h1>
            <p className="text-gray-600 mt-1">Quản lý người dùng và phân quyền hệ thống (Đã đồng bộ)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleRefreshData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg" onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm người dùng
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">Thêm người dùng mới</DialogTitle>
              </DialogHeader>
              <UserForm 
                formData={formData}
                setFormData={setFormData}
                onSave={handleAddUser}
                onCancel={() => setIsAddDialogOpen(false)}
                updatePermission={updatePermission}
                setAllPermissionsForModule={setAllPermissionsForModule}
                moduleLabels={moduleLabels}
                permissionLabels={permissionLabels}
                isAdd={true}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Tổng người dùng</p>
                <p className="text-2xl font-bold text-blue-900">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Đang hoạt động</p>
                <p className="text-2xl font-bold text-green-900">{users.filter(u => u.status === 'active').length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Bị khóa</p>
                <p className="text-2xl font-bold text-orange-900">{users.filter(u => u.status === 'locked').length}</p>
              </div>
              <UserX className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Admin</p>
                <p className="text-2xl font-bold text-purple-900">{users.filter(u => u.role === 'admin').length}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Danh sách người dùng
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Lịch sử thao tác
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Danh sách người dùng ({filteredUsers.length}/{users.length})</CardTitle>
                
                {/* Filters */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Tìm kiếm..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Duyệt">Duyệt</SelectItem>
                      <SelectItem value="User">User</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="active">Hoạt động</SelectItem>
                      <SelectItem value="locked">Khóa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Mã NV</TableHead>
                      <TableHead>Họ và tên</TableHead>
                      <TableHead>Chức danh</TableHead>
                      <TableHead>Bộ phận</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead className="w-[200px]">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.msnv} className="hover:bg-gray-50">
                        <TableCell className="font-mono font-medium">{user.msnv}</TableCell>
                        <TableCell className="font-medium">{user.fullName}</TableCell>
                        <TableCell className="text-gray-600">{user.position}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {user.department}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.role === 'admin' ? 'default' : user.role === 'manager' ? 'secondary' : 'outline'}
                            className={
                              user.role === 'admin' ? 'bg-red-100 text-red-800 border-red-200' :
                              user.role === 'manager' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              'bg-gray-100 text-gray-800 border-gray-200'
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleUserStatus(user.msnv)}
                            className="p-0 h-auto"
                          >
                            <Badge 
                              variant={user.status === 'active' ? 'default' : 'destructive'}
                              className={`cursor-pointer ${
                                user.status === 'active' 
                                  ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' 
                                  : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                              }`}
                            >
                              {user.status === 'active' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Hoạt động
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Khóa
                                </>
                              )}
                            </Badge>
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(user)}
                              className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                              title="Chỉnh sửa thông tin"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPasswordDialog(user)}
                              className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600"
                              title="Đổi mật khẩu"
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                            {user.msnv !== currentUser.msnv && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user.msnv)}
                                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                title="Xóa người dùng"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử thao tác (50 gần nhất)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Hành động</TableHead>
                    <TableHead>Đối tượng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userLogs.slice(-50).reverse().map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </TableCell>
                      <TableCell className="font-medium">{log.adminMsnv}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            log.action === 'ADD_USER' ? 'bg-green-50 text-green-700 border-green-200' :
                            log.action === 'EDIT_USER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            log.action === 'DELETE_USER' ? 'bg-red-50 text-red-700 border-red-200' :
                            log.action === 'CHANGE_PASSWORD' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }
                        >
                          {log.action === 'ADD_USER' && 'Thêm người dùng'}
                          {log.action === 'EDIT_USER' && 'Sửa thông tin'}
                          {log.action === 'DELETE_USER' && 'Xóa người dùng'}
                          {log.action === 'TOGGLE_STATUS' && 'Thay đổi trạng thái'}
                          {log.action === 'CHANGE_PASSWORD' && 'Đổi mật khẩu'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{log.targetMsnv}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Chỉnh sửa thông tin người dùng</DialogTitle>
          </DialogHeader>
          <UserForm 
            formData={formData}
            setFormData={setFormData}
            onSave={handleEditUser}
            onCancel={() => setIsEditDialogOpen(false)}
            updatePermission={updatePermission}
            setAllPermissionsForModule={setAllPermissionsForModule}
            moduleLabels={moduleLabels}
            permissionLabels={permissionLabels}
            isEdit={true}
          />
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Đổi mật khẩu
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Người dùng</Label>
              <p className="text-sm text-gray-600">{selectedUser?.fullName} ({selectedUser?.msnv})</p>
            </div>
            
            <div>
              <Label htmlFor="newPassword" className="text-sm font-medium">Mật khẩu mới *</Label>
              <div className="relative mt-1">
                <Input
                  id="newPassword"
                  type={passwordData.showPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setPasswordData(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                >
                  {passwordData.showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Xác nhận mật khẩu *</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  type={passwordData.showPassword ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Nhập lại mật khẩu mới"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setPasswordData(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                >
                  {passwordData.showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsPasswordDialogOpen(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Hủy
              </Button>
              <Button 
                onClick={handleChangePassword}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                <Lock className="w-4 h-4 mr-2" />
                Đổi mật khẩu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Component form riêng để tái sử dụng
interface UserFormProps {
  formData: Partial<User & { password?: string; confirmPassword?: string }>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<User & { password?: string; confirmPassword?: string }>>>;
  onSave: () => void;
  onCancel: () => void;
  updatePermission: (module: keyof UserPermissions, permission: keyof UserPermissions[keyof UserPermissions], value: boolean) => void;
  setAllPermissionsForModule: (module: keyof UserPermissions, value: boolean) => void;
  moduleLabels: Record<string, string>;
  permissionLabels: Record<string, string>;
  isEdit?: boolean;
  isAdd?: boolean;
}

function UserForm({ 
  formData, 
  setFormData, 
  onSave, 
  onCancel, 
  updatePermission, 
  setAllPermissionsForModule,
  moduleLabels, 
  permissionLabels,
  isEdit = false,
  isAdd = false
}: UserFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      {/* Thông tin cơ bản */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Thông tin cơ bản
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="msnv" className="text-sm font-medium">Mã nhân viên *</Label>
              <Input
                id="msnv"
                value={formData.msnv || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, msnv: e.target.value.toUpperCase() }))}
                disabled={isEdit}
                placeholder="VD: CNC001"
                className="mt-1"
              />
              {isEdit && <p className="text-xs text-gray-500 mt-1">Không thể thay đổi mã nhân viên</p>}
            </div>
            <div>
              <Label htmlFor="fullName" className="text-sm font-medium">Họ và tên *</Label>
              <Input
                id="fullName"
                value={formData.fullName || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Nhập họ và tên"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department" className="text-sm font-medium">Bộ phận</Label>
              <Select 
                value={formData.department} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, department: value as any }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tổ CNC">Tổ CNC</SelectItem>
                  <SelectItem value="Tổ Cơ khí">Tổ Cơ khí</SelectItem>
                  <SelectItem value="Kho">Kho</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Quản trị">Quản trị</SelectItem>
                  <SelectItem value="Khác">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="position" className="text-sm font-medium">Chức danh</Label>
              <Input
                id="position"
                value={formData.position || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                placeholder="VD: Thợ CNC, Thủ kho..."
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role" className="text-sm font-medium">Vai trò</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  role: value as any,
                  permissions: value === 'Admin' ? ADMIN_PERMISSIONS : prev.permissions
                }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="User">User</SelectItem>
                  <SelectItem value="Duyệt">Duyệt - Người duyệt</SelectItem>
                  <SelectItem value="Admin">Admin - Quản trị viên</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status" className="text-sm font-medium">Trạng thái</Label>
              <div className="flex items-center space-x-3 mt-3">
                <Switch
                  id="status"
                  checked={formData.status === 'active'}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    status: checked ? 'active' : 'locked' 
                  }))}
                />
                <Label htmlFor="status" className="text-sm">
                  {formData.status === 'active' ? (
                    <span className="text-green-600 font-medium">Hoạt động</span>
                  ) : (
                    <span className="text-red-600 font-medium">Khóa</span>
                  )}
                </Label>
              </div>
            </div>
          </div>

          {/* Password fields for new users */}
          {isAdd && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password" className="text-sm font-medium">Mật khẩu *</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Xác nhận mật khẩu *</Label>
                <div className="relative mt-1">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.confirmPassword || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Nhập lại mật khẩu"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phân quyền chi tiết */}
      {formData.role !== 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Phân quyền chi tiết
            </CardTitle>
            <p className="text-sm text-gray-600">
              Cấp quyền truy cập cho từng module trong hệ thống
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-4 font-semibold border-b border-gray-200">Module</th>
                    {Object.entries(permissionLabels).map(([key, label]) => (
                      <th key={key} className="text-center p-4 font-semibold border-b border-gray-200 min-w-[80px]">
                        {label}
                      </th>
                    ))}
                    <th className="text-center p-4 font-semibold border-b border-gray-200 min-w-[100px]">
                      Tất cả
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(moduleLabels).map(([moduleKey, moduleLabel]) => {
                    const modulePerms = formData.permissions?.[moduleKey as keyof UserPermissions];
                    const allEnabled = modulePerms && Object.values(modulePerms).every(Boolean);
                    
                    return (
                      <tr key={moduleKey} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-900">{moduleLabel}</td>
                        {Object.entries(permissionLabels).map(([permKey]) => (
                          <td key={permKey} className="text-center p-4">
                            <Switch
                              checked={formData.permissions?.[moduleKey as keyof UserPermissions]?.[permKey as keyof UserPermissions[keyof UserPermissions]] || false}
                              onCheckedChange={(checked) => updatePermission(
                                moduleKey as keyof UserPermissions,
                                permKey as keyof UserPermissions[keyof UserPermissions],
                                checked
                              )}
                            />
                          </td>
                        ))}
                        <td className="text-center p-4">
                          <Button
                            variant={allEnabled ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAllPermissionsForModule(
                              moduleKey as keyof UserPermissions,
                              !allEnabled
                            )}
                            className="text-xs"
                          >
                            {allEnabled ? 'Bỏ tất cả' : 'Chọn tất cả'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {formData.role === 'admin' && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-center">
              <Shield className="w-8 h-8 text-red-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Quyền Admin</h3>
                <p className="text-sm text-gray-600">Admin có toàn quyền truy cập tất cả các module trong hệ thống</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} className="px-6">
          <X className="w-4 h-4 mr-2" />
          Hủy
        </Button>
        <Button onClick={onSave} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6">
          <Save className="w-4 h-4 mr-2" />
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}