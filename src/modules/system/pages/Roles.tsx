import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { loadArrayFromStorage, saveArrayToStorage, buildLocalId } from '@/lib/localStorage';
import { toast } from 'sonner';

type PermissionAction = 'view' | 'add' | 'edit' | 'delete' | 'approve';

type SystemModuleId = 'kho' | 'qc' | 'bao-tri' | 'bao-cao' | 'he-thong';

interface RolePermissions {
  [module: string]: Record<PermissionAction, boolean>;
}

interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: RolePermissions;
  createdAt: string;
}

const PERMISSION_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'view', label: 'View' },
  { key: 'add', label: 'Add' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'approve', label: 'Approve' },
];

const MODULES: { id: SystemModuleId; label: string }[] = [
  { id: 'kho', label: 'Kho' },
  { id: 'qc', label: 'QC' },
  { id: 'bao-tri', label: 'Bảo trì' },
  { id: 'bao-cao', label: 'Báo cáo' },
  { id: 'he-thong', label: 'Hệ thống' },
];

const defaultPermissions = () =>
  MODULES.reduce((acc, module) => {
    acc[module.id] = { view: false, add: false, edit: false, delete: false, approve: false };
    return acc;
  }, {} as RolePermissions);

const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'role-admin',
    name: 'Admin',
    description: 'Toàn quyền hệ thống và truy cập mọi module.',
    permissions: MODULES.reduce((acc, module) => {
      acc[module.id] = { view: true, add: true, edit: true, delete: true, approve: true };
      return acc;
    }, {} as RolePermissions),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'role-qc',
    name: 'Người QC',
    description: 'Chỉ quản lý quyền QC và xem báo cáo.',
    permissions: MODULES.reduce((acc, module) => {
      acc[module.id] = { view: module.id === 'qc' || module.id === 'bao-cao', add: module.id === 'qc', edit: module.id === 'qc', delete: false, approve: module.id === 'qc' };
      return acc;
    }, {} as RolePermissions),
    createdAt: new Date().toISOString(),
  },
];

const STORAGE_KEY = 'erp-role-definitions';

function createEmptyRole() {
  return {
    id: '',
    name: '',
    description: '',
    permissions: defaultPermissions(),
    createdAt: new Date().toISOString(),
  };
}

export default function Roles() {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState<RoleDefinition>(createEmptyRole());

  useEffect(() => {
    const persisted = loadArrayFromStorage<RoleDefinition>(STORAGE_KEY);
    setRoles(persisted.length ? persisted : DEFAULT_ROLES);
  }, []);

  useEffect(() => {
    if (roles.length) {
      saveArrayToStorage(STORAGE_KEY, roles);
    }
  }, [roles]);

  const filteredRoles = useMemo(() => {
    if (!search) return roles;
    const normalized = search.toLowerCase();
    return roles.filter((role) => role.name.toLowerCase().includes(normalized) || role.description.toLowerCase().includes(normalized));
  }, [roles, search]);

  const summary = useMemo(() => {
    const permissionsByModule = MODULES.map((module) => ({
      module: module.label,
      assignedCount: roles.filter((role) => Object.values(role.permissions[module.id]).some(Boolean)).length,
    }));
    return {
      totalRoles: roles.length,
      moduleStats: permissionsByModule,
    };
  }, [roles]);

  const openDialogToCreate = () => {
    setSelectedRoleId(null);
    setFormState(createEmptyRole());
    setDialogOpen(true);
  };

  const openDialogToEdit = (role: RoleDefinition) => {
    setSelectedRoleId(role.id);
    setFormState(role);
    setDialogOpen(true);
  };

  const handleTogglePermission = (moduleId: SystemModuleId, action: PermissionAction) => {
    setFormState((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: {
          ...prev.permissions[moduleId],
          [action]: !prev.permissions[moduleId][action],
        },
      },
    }));
  };

  const handleSaveRole = () => {
    if (!formState.name.trim()) {
      toast.error('Tên vai trò không được để trống');
      return;
    }

    if (selectedRoleId) {
      setRoles((current) => current.map((role) => (role.id === selectedRoleId ? { ...formState, id: selectedRoleId } : role)));
      toast.success('Cập nhật vai trò thành công');
    } else {
      const newRole = { ...formState, id: buildLocalId('role'), createdAt: new Date().toISOString() };
      setRoles((current) => [newRole, ...current]);
      toast.success('Tạo vai trò mới thành công');
    }
    setDialogOpen(false);
  };

  const handleDeleteRole = (roleId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa vai trò này?')) return;
    setRoles((current) => current.filter((role) => role.id !== roleId));
    toast.success('Đã xóa vai trò');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Phân quyền</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Quản lý role và phân quyền module cho hệ thống ERP/WMS.</p>
          </div>
          <Button onClick={openDialogToCreate}>Tạo role mới</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Tổng số role</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{summary.totalRoles}</p>
            </CardContent>
          </Card>
          {summary.moduleStats.map((stat) => (
            <Card key={stat.module}>
              <CardHeader>
                <CardTitle>{stat.module}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{stat.assignedCount}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Role có quyền ít nhất một hành động</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
              <div>
                <CardTitle>Danh sách role</CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tìm kiếm theo tên hoặc mô tả.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input placeholder="Tìm kiếm role..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogContent className="sm:max-w-3xl w-full">
                    <DialogHeader>
                      <DialogTitle>{selectedRoleId ? 'Chỉnh sửa role' : 'Tạo role mới'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="role-name">Tên role</Label>
                          <Input
                            id="role-name"
                            value={formState.name}
                            onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="role-description">Mô tả</Label>
                          <Input
                            id="role-description"
                            value={formState.description}
                            onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                          <thead className="bg-slate-100 dark:bg-slate-800">
                            <tr>
                              <th className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Module</th>
                              {PERMISSION_ACTIONS.map((action) => (
                                <th key={action.key} className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                                  {action.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {MODULES.map((module) => (
                              <tr key={module.id}>
                                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{module.label}</td>
                                {PERMISSION_ACTIONS.map((action) => (
                                  <td key={action.key} className="px-4 py-3">
                                    <Checkbox
                                      checked={formState.permissions[module.id][action.key]}
                                      onCheckedChange={() => handleTogglePermission(module.id, action.key)}
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleSaveRole}>{selectedRoleId ? 'Lưu thay đổi' : 'Tạo role'}</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên Role</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead>Quyền hoạt động</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400">
                        Không tìm thấy role phù hợp.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>{role.name}</TableCell>
                        <TableCell>{role.description}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {MODULES.map((module) => {
                              const count = Object.values(role.permissions[module.id]).filter(Boolean).length;
                              return count ? (
                                <Badge key={module.id} variant="secondary">{module.label}: {count}</Badge>
                              ) : null;
                            })}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(role.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => openDialogToEdit(role)}>Sửa</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteRole(role.id)}>Xóa</Button>
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

        <Card>
          <CardHeader>
            <CardTitle>Biểu đồ quyền theo module</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.moduleStats} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="module" tick={{ fill: 'var(--muted-foreground)' }} />
                  <YAxis tick={{ fill: 'var(--muted-foreground)' }} />
                  <Tooltip formatter={(value) => [`${value} role`, 'Số role']} />
                  <Bar dataKey="assignedCount" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
