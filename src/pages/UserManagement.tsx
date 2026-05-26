// Quản Lý Người Dùng

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Card,
  CardContent,
  CardHeader
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

import {
  Users,
  Edit,
  Plus,
  RefreshCw,
  Key,
  Search,
  Trash2,
  ShieldAlert,
  Home
} from 'lucide-react';

import { toast } from 'sonner';

interface UserProfile {
  msnv: string;
  fullName: string;
  department: string;
  roleGroup: string;
  status: 'active' | 'locked';
}

export function UserManagement() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const [selectedUser, setSelectedUser] =
    useState<UserProfile | null>(null);

  const [newPassword, setNewPassword] = useState('');

  const [userForm, setUserForm] = useState({
    msnv: '',
    fullName: '',
    department: 'Tổ CNC',
    roleGroup: 'Thợ CNC'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    let filtered = [...users];

    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (u) =>
          u.msnv
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          u.fullName
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const loadUsers = () => {
    const savedUsers =
      localStorage.getItem('wms_users');

    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      const systemAdmin: UserProfile[] = [
        {
          msnv: '1118',
          fullName: 'Nguyễn Trường Sơn',
          department: 'Ban Quản Trị Hệ Thống',
          roleGroup: 'Admin',
          status: 'active'
        }
      ];

      localStorage.setItem(
        'wms_users',
        JSON.stringify(systemAdmin)
      );

      setUsers(systemAdmin);
    }
  };

  const handleSaveUser = () => {
    if (
      !userForm.msnv.trim() ||
      !userForm.fullName.trim()
    ) {
      toast.error(
        'Vui lòng nhập đầy đủ thông tin'
      );
      return;
    }

    const formattedMSNV =
      userForm.msnv.trim().toUpperCase();

    const existed = users.some(
      (u) => u.msnv === formattedMSNV
    );

    if (existed) {
      toast.error('Mã nhân viên đã tồn tại');
      return;
    }

    const newUser: UserProfile = {
      msnv: formattedMSNV,
      fullName: userForm.fullName.trim(),
      department: userForm.department,
      roleGroup: userForm.roleGroup,
      status: 'active'
    };

    const updated = [...users, newUser];

    setUsers(updated);

    localStorage.setItem(
      'wms_users',
      JSON.stringify(updated)
    );

    setIsAddUserOpen(false);

    toast.success('Đã thêm nhân viên');
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;

    const updated = users.map((u) =>
      u.msnv === selectedUser.msnv
        ? {
            ...u,
            fullName:
              userForm.fullName.trim(),
            department:
              userForm.department,
            roleGroup:
              userForm.roleGroup
          }
        : u
    );

    setUsers(updated);

    localStorage.setItem(
      'wms_users',
      JSON.stringify(updated)
    );

    setIsEditUserOpen(false);

    toast.success(
      'Đã cập nhật nhân viên'
    );
  };

  const toggleUserStatus = (
    msnv: string
  ) => {
    if (msnv === '1118') {
      toast.error(
        'Không thể khóa Admin tổng'
      );
      return;
    }

    const updated: UserProfile[] =
      users.map((u) =>
        u.msnv === msnv
          ? {
              ...u,
              status:
                u.status === 'active'
                  ? 'locked'
                  : 'active'
            }
          : u
      );

    setUsers(updated);

    localStorage.setItem(
      'wms_users',
      JSON.stringify(updated)
    );

    toast.success(
      'Đã cập nhật trạng thái'
    );
  };

  const handleDeleteUser = (
    msnv: string
  ) => {
    if (msnv === '1118') {
      toast.error(
        'Không thể xóa Admin tổng'
      );
      return;
    }

    if (
      !window.confirm(
        `Bạn có chắc muốn xóa ${msnv}?`
      )
    ) {
      return;
    }

    const updated = users.filter(
      (u) => u.msnv !== msnv
    );

    setUsers(updated);

    localStorage.setItem(
      'wms_users',
      JSON.stringify(updated)
    );

    toast.success(
      'Đã xóa nhân viên'
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* HEADER */}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm">

        <div className="flex items-center gap-3">

          {/* NÚT TRANG CHỦ */}

          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/')}
            className="h-11 w-11"
          >
            <Home className="w-5 h-5" />
          </Button>

          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-md">
            <Users className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quản Lý Người Dùng
            </h1>

            <p className="text-sm text-gray-500">
              Hồ sơ nhân sự toàn bộ xưởng CNC-CK Alpha ECC.
            </p>
          </div>

        </div>

        <div className="flex items-center gap-2">

          <Button
            variant="outline"
            onClick={loadUsers}
            className="h-9 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Tải lại
          </Button>

          <Button
            onClick={() => {
              setUserForm({
                msnv: '',
                fullName: '',
                department: 'Tổ CNC',
                roleGroup: 'Thợ CNC'
              });

              setIsAddUserOpen(true);
            }}
            className="bg-blue-600 text-white h-9 text-xs"
          >
            <Plus className="w-4 h-4 mr-1" />
            Thêm nhân viên mới
          </Button>

        </div>

      </div>

      {/* TABLE */}

      <Card className="border shadow-sm">

        <CardHeader className="p-4 bg-gray-50/50 border-b">

          <div className="relative max-w-sm w-full">

            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />

            <Input
              placeholder="Tìm nhanh theo Mã hoặc Tên..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="pl-9 bg-white h-9 text-xs"
            />

          </div>

        </CardHeader>

        <CardContent className="p-0">

          <Table>

            <TableHeader className="bg-gray-100/50">

              <TableRow>

                <TableHead className="text-xs">
                  Mã Số NV
                </TableHead>

                <TableHead className="text-xs">
                  Họ và Tên
                </TableHead>

                <TableHead className="text-xs">
                  Bộ phận / Tổ đội
                </TableHead>

                <TableHead className="text-xs">
                  Nhóm chức danh
                </TableHead>

                <TableHead className="text-xs text-center">
                  Trạng thái
                </TableHead>

                <TableHead className="text-right text-xs p-4">
                  Thao tác
                </TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {filteredUsers.map((u) => {
                const isSuperAdmin =
                  u.msnv === '1118';

                return (
                  <TableRow
                    key={u.msnv}
                    className={
                      isSuperAdmin
                        ? 'bg-blue-50/40'
                        : ''
                    }
                  >

                    <TableCell className="font-mono font-bold text-blue-600 text-xs">
                      {u.msnv}
                    </TableCell>

                    <TableCell className="font-semibold text-gray-900 text-xs flex items-center gap-1.5 py-3">

                      {u.fullName}

                      {isSuperAdmin && (
                        <Badge className="bg-amber-500 text-white text-[9px]">
                          Chủ sở hữu
                        </Badge>
                      )}

                    </TableCell>

                    <TableCell className="text-xs">

                      <Badge variant="outline">
                        {u.department}
                      </Badge>

                    </TableCell>

                    <TableCell className="text-xs">

                      <Badge
                        className={
                          isSuperAdmin
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-800'
                        }
                      >
                        {u.roleGroup}
                      </Badge>

                    </TableCell>

                    <TableCell className="text-center">

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleUserStatus(
                            u.msnv
                          )
                        }
                        disabled={isSuperAdmin}
                        className="p-0 h-auto disabled:opacity-100"
                      >

                        <Badge
                          className={
                            u.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }
                        >
                          {u.status === 'active'
                            ? 'Đang hoạt động'
                            : 'Đang khóa'}
                        </Badge>

                      </Button>

                    </TableCell>

                    <TableCell className="text-right p-2.5 space-x-1">

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => {
                          setSelectedUser(u);

                          setUserForm({
                            msnv: u.msnv,
                            fullName: u.fullName,
                            department: u.department,
                            roleGroup: u.roleGroup
                          });

                          setIsEditUserOpen(true);
                        }}
                      >
                        <Edit className="w-3.5 h-3.5 mr-1 text-gray-500" />
                        Sửa
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-amber-600 text-xs"
                        onClick={() => {
                          setSelectedUser(u);
                          setNewPassword('');
                          setIsPasswordOpen(true);
                        }}
                      >
                        <Key className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSuperAdmin}
                        className="h-8 text-red-600 text-xs"
                        onClick={() =>
                          handleDeleteUser(u.msnv)
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>

                    </TableCell>

                  </TableRow>
                );
              })}

            </TableBody>

          </Table>

        </CardContent>

      </Card>

      {/* DIALOG THÊM */}

      <Dialog
        open={isAddUserOpen}
        onOpenChange={setIsAddUserOpen}
      >

        <DialogContent className="bg-white max-w-md p-6 rounded-xl">

          <DialogHeader>
            <DialogTitle className="font-bold text-gray-900">
              Thêm hồ sơ nhân sự mới
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">

            <div className="space-y-1.5">
              <Label>
                Mã số nhân viên
              </Label>

              <Input
                placeholder="Ví dụ: CNC099"
                value={userForm.msnv}
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    msnv: e.target.value
                  })
                }
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Họ và tên
              </Label>

              <Input
                placeholder="Nhập họ tên"
                value={userForm.fullName}
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    fullName: e.target.value
                  })
                }
                className="h-9"
              />
            </div>

          </div>

          <div className="flex justify-end gap-2 mt-4 text-xs">

            <Button
              variant="outline"
              onClick={() =>
                setIsAddUserOpen(false)
              }
            >
              Hủy
            </Button>

            <Button
              onClick={handleSaveUser}
              className="bg-blue-600 text-white"
            >
              Lưu hồ sơ
            </Button>

          </div>

        </DialogContent>

      </Dialog>

      {/* DIALOG SỬA */}

      <Dialog
        open={isEditUserOpen}
        onOpenChange={setIsEditUserOpen}
      >

        <DialogContent className="bg-white max-w-md p-6 rounded-xl">

          <DialogHeader>
            <DialogTitle className="font-bold text-gray-900">
              Cập nhật hồ sơ nhân sự
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">

            <div className="space-y-1.5">

              <Label>
                Mã số nhân viên
              </Label>

              <Input
                value={userForm.msnv}
                disabled
                className="bg-gray-50 font-bold h-9"
              />

            </div>

            <div className="space-y-1.5">

              <Label>
                Họ và tên
              </Label>

              <Input
                value={userForm.fullName}
                onChange={(e) =>
                  setUserForm({
                    ...userForm,
                    fullName: e.target.value
                  })
                }
                className="h-9"
              />

            </div>

          </div>

          <div className="flex justify-end gap-2 mt-4 text-xs">

            <Button
              variant="outline"
              onClick={() =>
                setIsEditUserOpen(false)
              }
            >
              Hủy
            </Button>

            <Button
              onClick={handleUpdateUser}
              className="bg-blue-600 text-white"
            >
              Cập nhật
            </Button>

          </div>

        </DialogContent>

      </Dialog>

      {/* DIALOG PASSWORD */}

      <Dialog
        open={isPasswordOpen}
        onOpenChange={setIsPasswordOpen}
      >

        <DialogContent className="bg-white max-w-sm p-6 rounded-xl">

          <DialogHeader>

            <DialogTitle className="font-bold flex items-center gap-1.5 text-gray-900">

              <ShieldAlert className="w-4 h-4 text-amber-500" />

              Cấp mật khẩu đăng nhập

            </DialogTitle>

          </DialogHeader>

          <div className="space-y-2 py-2 text-xs">

            <Label>
              Mật khẩu mới cho [{selectedUser?.msnv}]
            </Label>

            <Input
              type="password"
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
              className="h-9"
            />

          </div>

          <div className="flex justify-end gap-2 mt-4 text-xs">

            <Button
              variant="outline"
              onClick={() =>
                setIsPasswordOpen(false)
              }
            >
              Đóng
            </Button>

            <Button
              onClick={() => {
                if (!newPassword.trim()) {
                  toast.error(
                    'Vui lòng nhập mật khẩu'
                  );
                  return;
                }

                setIsPasswordOpen(false);

                toast.success(
                  'Cấp mật khẩu mới thành công!'
                );
              }}
              className="bg-amber-600 text-white"
            >
              Xác nhận
            </Button>

          </div>

        </DialogContent>

      </Dialog>

    </div>
  );
}

export default UserManagement;