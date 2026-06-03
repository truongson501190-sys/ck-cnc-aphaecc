import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users, Eye, EyeOff } from 'lucide-react';
import type { SystemUser } from '@/hooks/useSystemUsers';
import { useSystemUsers } from '@/hooks/useSystemUsers';
import { supabase } from '@/supabase';

export function UserManagement() {
  const { users, loadUsers, deleteUser, loading } = useSystemUsers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    msnv: '',
    hoTen: '',
    chucDanh: '',
    boPhan: '',
    matKhau: '',
    vaiTro: 'user' as 'admin' | 'manager' | 'user',
    trangThai: 'active' as 'active' | 'inactive'
  });

  const roles = [
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'user', label: 'User' }
  ];

  const statuses = [
    { value: 'active', label: 'Hoạt động' },
    { value: 'inactive', label: 'Tạm khóa' }
  ];

  const departments = [
    { value: 'Kho', label: 'Bộ phận Kho' },
    { value: 'Tổ CNC', label: 'Tổ CNC' },
    { value: 'Tổ Cơ khí', label: 'Tổ Cơ Khí' },
    { value: 'Khác', label: 'Khác' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.msnv || !formData.hoTen || !formData.chucDanh || !formData.boPhan || !formData.matKhau) {
      alert('Vui lòng điền đầy đủ tất cả các trường bắt buộc (*)');
      return;
    }
    
    if (editingUser) {
      const updatedUser = {
        ...editingUser,
        fullName: formData.hoTen,
        department: formData.boPhan,
        position: formData.chucDanh,
        role: formData.vaiTro,
        status: formData.trangThai,
        updatedAt: new Date().toISOString()
      };
      
      // Cập nhật vào bảng users
      const { error: userError } = await supabase
        .from('users')
        .update(updatedUser)
        .eq('msnv', updatedUser.msnv);
      
      if (userError) {
        console.error('Error updating user:', userError);
        alert('Có lỗi xảy ra khi cập nhật người dùng');
        return;
      }
      
      // Cập nhật vào bảng wms_users
      const { error: wmsUserError } = await supabase
        .from('wms_users')
        .update(updatedUser)
        .eq('msnv', updatedUser.msnv);
      
      if (wmsUserError) {
        console.error('Error updating wms_user:', wmsUserError);
      }
      
      // Nếu có thay đổi mật khẩu, cập nhật vào userRecords
      if (formData.matKhau) {
        const { error: recordError } = await supabase
          .from('userRecords')
          .update({ passwordHash: formData.matKhau })
          .eq('msnv', updatedUser.msnv);
        
        if (recordError) {
          console.error('Error updating user record:', recordError);
        }
      }
      
    } else {
      // Check if MSNV already exists
      if (users.some(user => user.msnv === formData.msnv)) {
        alert('MSNV đã tồn tại. Vui lòng chọn MSNV khác.');
        return;
      }

      const newUser: SystemUser = {
        msnv: formData.msnv,
        fullName: formData.hoTen,
        department: formData.boPhan,
        position: formData.chucDanh,
        role: formData.vaiTro,
        status: formData.trangThai,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Thêm vào bảng users
      const { error: userError } = await supabase
        .from('users')
        .insert(newUser);
      
      if (userError) {
        console.error('Error adding user:', userError);
        alert('Có lỗi xảy ra khi thêm người dùng');
        return;
      }
      
      // Thêm vào bảng wms_users
      const { error: wmsUserError } = await supabase
        .from('wms_users')
        .insert(newUser);
      
      if (wmsUserError) {
        console.error('Error adding wms_user:', wmsUserError);
      }
      
      // Thêm vào bảng userRecords (với mật khẩu)
      const { error: recordError } = await supabase
        .from('userRecords')
        .insert({
          id: newUser.msnv,
          msnv: newUser.msnv,
          fullName: newUser.fullName,
          department: newUser.department,
          position: newUser.position,
          role: newUser.role,
          status: newUser.status === 'active',
          passwordHash: formData.matKhau,
          createdAt: newUser.createdAt
        });
      
      if (recordError) {
        console.error('Error adding user record:', recordError);
      }
    }

    await loadUsers();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      msnv: '',
      hoTen: '',
      chucDanh: '',
      boPhan: '',
      matKhau: '',
      vaiTro: 'user',
      trangThai: 'active'
    });
    setEditingUser(null);
    setIsDialogOpen(false);
    setShowPassword(false);
  };

  const handleEdit = (user: SystemUser) => {
    setEditingUser(user);
    setFormData({
      msnv: user.msnv,
      hoTen: user.fullName,
      chucDanh: user.position,
      boPhan: user.department,
      matKhau: '',
      vaiTro: user.role,
      trangThai: user.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (msnv: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      // Xóa từ bảng users
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('msnv', msnv);
      
      if (userError) {
        console.error('Error deleting user:', userError);
        alert('Có lỗi xảy ra khi xóa người dùng');
        return;
      }
      
      // Xóa từ bảng wms_users
      const { error: wmsUserError } = await supabase
        .from('wms_users')
        .delete()
        .eq('msnv', msnv);
      
      if (wmsUserError) {
        console.error('Error deleting wms_user:', wmsUserError);
      }
      
      // Xóa từ bảng userRecords
      const { error: recordError } = await supabase
        .from('userRecords')
        .delete()
        .eq('msnv', msnv);
      
      if (recordError) {
        console.error('Error deleting user record:', recordError);
      }
      
      await loadUsers();
    }
  };

  const getRoleColor = (role: string) => {
    const colors = {
      'admin': 'bg-red-100 text-red-800',
      'manager': 'bg-blue-100 text-blue-800',
      'user': 'bg-green-100 text-green-800'
    };
    return colors[role as keyof typeof colors] || colors['user'];
  };

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Quản Lý Người Dùng
          </h2>
          <p className="text-gray-600 mt-1">Quản lý thông tin người dùng và phân quyền</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              Thêm Người Dùng Mới
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Chỉnh Sửa Người Dùng' : 'Thêm Người Dùng Mới'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="msnv">MSNV (Tên đăng nhập) *</Label>
                <Input
                  id="msnv"
                  value={formData.msnv}
                  onChange={(e) => setFormData({...formData, msnv: e.target.value})}
                  placeholder="Nhập MSNV"
                  required
                  disabled={!!editingUser}
                />
              </div>
              
              <div>
                <Label htmlFor="hoTen">Họ và Tên *</Label>
                <Input
                  id="hoTen"
                  value={formData.hoTen}
                  onChange={(e) => setFormData({...formData, hoTen: e.target.value})}
                  placeholder="Nhập họ và tên"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="chucDanh">Chức Danh *</Label>
                <Input
                  id="chucDanh"
                  value={formData.chucDanh}
                  onChange={(e) => setFormData({...formData, chucDanh: e.target.value})}
                  placeholder="VD: Kỹ sư, Trưởng phòng..."
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="boPhan">Bộ Phận *</Label>
                <Select
                  value={formData.boPhan}
                  onValueChange={(value) => setFormData({...formData, boPhan: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn bộ phận" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="matKhau">Mật Khẩu {editingUser ? '(Để trống nếu không thay đổi)' : '*'}</Label>
                <div className="relative">
                  <Input
                    id="matKhau"
                    type={showPassword ? "text" : "password"}
                    value={formData.matKhau}
                    onChange={(e) => setFormData({...formData, matKhau: e.target.value})}
                    placeholder="Nhập mật khẩu"
                    required={!editingUser}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="vaiTro">Vai Trò *</Label>
                <Select
                  value={formData.vaiTro}
                  onValueChange={(value) => setFormData({...formData, vaiTro: value as SystemUser['role']})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="trangThai">Trạng Thái *</Label>
                <Select
                  value={formData.trangThai}
                  onValueChange={(value) => setFormData({...formData, trangThai: value as SystemUser['status']})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Hủy
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  {editingUser ? 'Cập Nhật' : 'Thêm Người Dùng'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Danh Sách Người Dùng</span>
            <Badge variant="secondary">{users.length} người dùng</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MSNV</TableHead>
                  <TableHead>Họ và Tên</TableHead>
                  <TableHead>Chức Danh</TableHead>
                  <TableHead>Bộ Phận</TableHead>
                  <TableHead>Vai Trò</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                  <TableHead className="text-right">Thao Tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Chưa có người dùng nào. Nhấn "Thêm Người Dùng Mới" để bắt đầu.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.msnv}>
                      <TableCell className="font-medium">{user.msnv}</TableCell>
                      <TableCell>{user.fullName}</TableCell>
                      <TableCell>{user.position}</TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>
                        <Badge className={getRoleColor(user.role)}>
                          {roles.find(r => r.value === user.role)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(user.status)}>
                          {statuses.find(s => s.value === user.status)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(user.msnv)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}