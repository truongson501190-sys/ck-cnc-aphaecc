// src/modules/system/pages/Roles.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Save,
  RefreshCw,
  Search,
  AlertCircle,
  User,
  Building2,
  SlidersHorizontal,
  Eye,
  Edit3,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/supabase';
import {
  PERMISSION_GROUPS as CANONICAL_PERMISSION_GROUPS,
  PERMISSION_LABELS as CANONICAL_PERMISSION_LABELS,
  coercePermissionsToLevels,
  createPermissionLevelMap,
  getLegacyWmsUserPermissionsStorageKey,
  getUserPermissionsStorageKey,
  permissionsToLevels,
  type PermissionLevel,
  type UserPermissions,
} from '@/lib/permissions';
import { PermissionService } from '@/services/permissionService';
import { useAuth } from '@/contexts/AuthContext';

const PERMISSION_GROUPS = CANONICAL_PERMISSION_GROUPS;
const PERMISSION_LABELS = CANONICAL_PERMISSION_LABELS;
const INITIAL_PERMISSIONS = createPermissionLevelMap('none');

interface EmployeeProfile {
  msnv: string;
  hoTen: string;
  department: string;
  roleGroup: string;
}

const isSchemaError = (error: any): boolean => {
  if (!error) return false;
  const code = error?.code;
  const message = error?.message || '';
  const details = error?.details || '';
  return (
    code === 'PGRST301' ||
    code === '42P01' ||
    message.includes('relation') ||
    message.includes('does not exist') ||
    details.includes('relation') ||
    details.includes('does not exist')
  );
};

const savePermissionsLocal = (msnv: string, permissions: Record<string, PermissionLevel>) => {
  const serialized = JSON.stringify(permissions);
  localStorage.setItem(getUserPermissionsStorageKey(msnv), serialized);
  localStorage.setItem(getLegacyWmsUserPermissionsStorageKey(msnv), serialized);
};

export function Roles() {
  // ✅ KIỂM TRA AN TOÀN - TRÁNH LỖI useAuth OUTSIDE PROVIDER
  let user = null;
  let refreshUser = async () => {};
  let authError = false;

  try {
    const auth = useAuth();
    user = auth.user;
    refreshUser = auth.refreshUser;
  } catch (error) {
    authError = true;
    console.warn('Roles: AuthContext not available yet');
  }

  const [userList, setUserList] = useState<EmployeeProfile[]>([]);
  const [selectedUserMsnv, setSelectedUserMsnv] = useState<string>('');
  const [searchUserTerm, setSearchUserTerm] = useState<string>('');
  const [searchPermTerm, setSearchPermTerm] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<Record<string, PermissionLevel>>({ ...INITIAL_PERMISSIONS });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const hasSupabaseConfig = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
  const [useFallback, setUseFallback] = useState<boolean>(!hasSupabaseConfig);
  const [schemaError, setSchemaError] = useState<string>('');

  // Nếu lỗi auth, hiển thị loading
  if (authError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">Đang tải dữ liệu...</h3>
          <p className="text-sm text-slate-400">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  const filteredUsers = useMemo(() => {
    if (!searchUserTerm.trim()) return userList;
    const lowerSearch = searchUserTerm.toLowerCase();
    return userList.filter(
      u => u.msnv.toLowerCase().includes(lowerSearch) || u.hoTen.toLowerCase().includes(lowerSearch)
    );
  }, [userList, searchUserTerm]);

  const currentUser = useMemo(() => userList.find(u => u.msnv === selectedUserMsnv), [userList, selectedUserMsnv]);

  const viewOnlyCount = useMemo(() => Object.values(userPermissions).filter(v => v === 'view').length, [userPermissions]);
  const fullAccessCount = useMemo(() => Object.values(userPermissions).filter(v => v === 'full').length, [userPermissions]);
  const totalPermissions = Object.keys(INITIAL_PERMISSIONS).length;

  const filteredGroups = useMemo(() => {
    return Object.entries(PERMISSION_GROUPS)
      .map(([groupName, permKeys]) => {
        const filteredKeys = searchPermTerm.trim()
          ? permKeys.filter(key => (PERMISSION_LABELS[key] || key).toLowerCase().includes(searchPermTerm.toLowerCase()))
          : permKeys;
        return { groupName, filteredKeys };
      })
      .filter(g => g.filteredKeys.length > 0);
  }, [searchPermTerm]);

  // ===== LOAD USER PERMISSIONS =====
  const loadUserPermissions = useCallback(
    async (msnv: string) => {
      if (!msnv) return;
      try {
        if (useFallback) {
          const storedPerms =
            localStorage.getItem(getUserPermissionsStorageKey(msnv)) ||
            localStorage.getItem(getLegacyWmsUserPermissionsStorageKey(msnv));
          if (storedPerms) {
            try {
              setUserPermissions(coercePermissionsToLevels(JSON.parse(storedPerms)));
            } catch {
              setUserPermissions({ ...INITIAL_PERMISSIONS });
            }
          } else {
            setUserPermissions({ ...INITIAL_PERMISSIONS });
          }
        } else {
          // ✅ Lấy permissions từ database
          const perms = await PermissionService.getByMsnv(msnv);
          const permMap = permissionsToLevels(perms);
          setUserPermissions(permMap);
          setSchemaError('');
        }
      } catch (error: any) {
        console.error('Error loading permissions:', error);
        if (error?.code && isSchemaError(error)) {
          setSchemaError(`Bảng 'user_permissions' không tồn tại. Vui lòng tạo bảng theo migration.`);
          setUseFallback(true);
        }
        const storedPerms =
          localStorage.getItem(getUserPermissionsStorageKey(msnv)) ||
          localStorage.getItem(getLegacyWmsUserPermissionsStorageKey(msnv));
        if (storedPerms) {
          try {
            setUserPermissions(coercePermissionsToLevels(JSON.parse(storedPerms)));
          } catch {
            setUserPermissions({ ...INITIAL_PERMISSIONS });
          }
        } else {
          setUserPermissions({ ...INITIAL_PERMISSIONS });
        }
        if (!useFallback && !isSchemaError(error)) {
          setUseFallback(true);
          toast.warning('Không thể kết nối database, chuyển sang chế độ offline.');
        }
      }
    },
    [useFallback]
  );

  // ===== INITIALIZE USER LIST =====
  const initializeUserList = useCallback(
    (users: EmployeeProfile[], defaultMsnv?: string) => {
      setUserList(users);
      if (users.length > 0) {
        const newDefault = defaultMsnv || selectedUserMsnv || users[0].msnv;
        setSelectedUserMsnv(newDefault);
        return newDefault;
      }
      return '';
    },
    [selectedUserMsnv]
  );

  // ===== LOAD DATA =====
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (useFallback) {
        const storedUsers = localStorage.getItem('wms_users');
        if (storedUsers) {
          const parsedUsers = JSON.parse(storedUsers);
          const nonAdminUsers: EmployeeProfile[] = parsedUsers
            .filter((u: any) => u.msnv !== '1118')
            .map((u: any) => ({
              msnv: u.msnv,
              hoTen: u.fullName || u.hoTen || u.full_name || '',
              department: u.department || '',
              roleGroup: u.position || u.roleGroup || 'User',
            }));
          const defaultMsnv = initializeUserList(nonAdminUsers);
          if (defaultMsnv) await loadUserPermissions(defaultMsnv);
        }
      } else {
        const { data: employees, error } = await supabase
          .from('employees')
          .select('msnv, ho_ten, department, position')
          .order('msnv', { ascending: true });

        if (error) {
          if (isSchemaError(error)) {
            setSchemaError(`Bảng 'employees' chưa được tạo. Vui lòng chạy migration tạo bảng employees.`);
            setUseFallback(true);
            const storedUsers = localStorage.getItem('wms_users');
            if (storedUsers) {
              const parsedUsers = JSON.parse(storedUsers);
              const nonAdminUsers = parsedUsers.filter((u: any) => u.msnv !== '1118').map((u: any) => ({
                msnv: u.msnv,
                hoTen: u.fullName || u.hoTen || u.full_name || '',
                department: u.department || '',
                roleGroup: u.position || u.roleGroup || 'User',
              }));
              initializeUserList(nonAdminUsers);
              if (nonAdminUsers.length > 0) await loadUserPermissions(nonAdminUsers[0].msnv);
            }
          }
          throw error;
        }

        const nonAdminUsers: EmployeeProfile[] = (employees as any[])
          .filter(emp => emp.msnv !== '1118')
          .map(emp => ({
            msnv: emp.msnv,
            hoTen: emp.ho_ten || emp.hoTen || '',
            department: emp.department || '',
            roleGroup: emp.position || 'User',
          }));

        const defaultMsnv = initializeUserList(nonAdminUsers);
        if (defaultMsnv) await loadUserPermissions(defaultMsnv);
        setSchemaError('');
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      if (!useFallback && !isSchemaError(error)) {
        setUseFallback(true);
        toast.warning('Không thể kết nối server. Dùng dữ liệu offline.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [useFallback, initializeUserList, loadUserPermissions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== HANDLERS =====
  const handleUserSelect = useCallback(
    async (msnv: string) => {
      setSelectedUserMsnv(msnv);
      await loadUserPermissions(msnv);
    },
    [loadUserPermissions]
  );

  const handleSetPermission = useCallback((permKey: string, level: PermissionLevel) => {
    setUserPermissions(prev => ({ ...prev, [permKey]: level }));
  }, []);

  const handleBatchGroupPermission = useCallback(
    (groupPermissions: string[], level: PermissionLevel) => {
      setUserPermissions(prev => {
        const updated = { ...prev };
        groupPermissions.forEach(perm => {
          updated[perm] = level;
        });
        return updated;
      });
    },
    []
  );

  // ===== SAVE PERMISSIONS - SỬA DỨT ĐIỂM =====
  const handleSavePermissions = useCallback(async () => {
    if (!selectedUserMsnv) return;
    setIsSaving(true);

    const previousPermissions = { ...userPermissions };

    try {
      // Kiểm tra employee tồn tại
      if (!useFallback) {
        const { data, error } = await supabase
          .from('employees')
          .select('msnv')
          .eq('msnv', selectedUserMsnv)
          .maybeSingle();
        if (error || !data) {
          toast.error(`Nhân viên ${selectedUserMsnv} chưa có trong danh sách. Vui lòng tạo nhân viên trước.`);
          setIsSaving(false);
          return;
        }
      }

      // ✅ GỬI TRỰC TIẾP userPermissions (PermissionLevel map)
      // PermissionService.saveForMsnv sẽ tự động chuyển đổi sang format database
      await PermissionService.saveForMsnv(selectedUserMsnv, userPermissions);
      
      // Backup local
      savePermissionsLocal(selectedUserMsnv, userPermissions);
      toast.success(`Lưu ma trận quyền thành công cho ${currentUser?.hoTen || selectedUserMsnv}`);
      
      // ✅ Nếu đang sửa chính user đăng nhập → refresh context
      if (user?.msnv === selectedUserMsnv) {
        await refreshUser();
        toast.info('Đã cập nhật quyền của bạn. Các thay đổi có hiệu lực ngay.');
      }
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      
      // Xử lý lỗi foreign key constraint
      if (error?.message?.includes('23503') || error?.message?.includes('foreign key')) {
        toast.error(`Nhân viên ${selectedUserMsnv} không tồn tại. Vui lòng tạo nhân viên trước khi phân quyền.`);
      } else if (error?.message?.includes('406') || error?.status === 406) {
        toast.error(`Nhân viên ${selectedUserMsnv} không tồn tại trong database. Vui lòng tạo nhân viên trước.`);
      } else if (!useFallback) {
        setUserPermissions(previousPermissions);
        savePermissionsLocal(selectedUserMsnv, previousPermissions);
        toast.error(error.message || 'Lưu thất bại');
      } else {
        savePermissionsLocal(selectedUserMsnv, userPermissions);
        toast.success('Đã lưu vào bộ nhớ cục bộ (offline).');
      }
    } finally {
      setIsSaving(false);
    }
  }, [selectedUserMsnv, userPermissions, useFallback, currentUser, user, refreshUser]);

  // ===== RENDER =====
  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
            <Shield className="w-5 h-5 text-indigo-600" /> Phân quyền hệ thống
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân định chi tiết giữa quyền Chỉ xem (Read-only) và quyền Chỉnh sửa (Write) cho từng phân hệ.
          </p>
          {useFallback && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Đang sử dụng chế độ offline (localStorage)
            </p>
          )}
          {schemaError && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{schemaError}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading || isSaving}
            className="h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button
            size="sm"
            onClick={handleSavePermissions}
            disabled={isSaving || !currentUser}
            className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-4"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {isSaving ? 'Đang lưu...' : 'Lưu Ma trận Quyền'}
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* User List - Left Panel */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="border-slate-200 shadow-sm h-[calc(100vh-180px)] flex flex-col overflow-hidden bg-white">
            <div className="p-3 bg-slate-50/70 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Tìm tên, mã nhân viên..."
                  value={searchUserTerm}
                  onChange={e => setSearchUserTerm(e.target.value)}
                  className="pl-8 bg-white h-9 text-sm focus-visible:ring-indigo-500 border-slate-200"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1.5 space-y-0.5">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  {searchUserTerm ? 'Không tìm thấy nhân viên' : 'Danh sách trống'}
                </div>
              ) : (
                filteredUsers.map(u => {
                  const isSelected = u.msnv === selectedUserMsnv;
                  return (
                    <button
                      key={u.msnv}
                      onClick={() => handleUserSelect(u.msnv)}
                      disabled={isSaving}
                      className={`w-full text-left p-2.5 rounded-lg transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-indigo-50/80 border border-indigo-100/50 text-indigo-900'
                          : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                      } ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold font-mono ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`}>
                            {u.msnv}
                          </span>
                          <span className="text-xs text-slate-300">|</span>
                          <span className="text-sm font-semibold truncate block">{u.hoTen}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-0.5">
                            <Building2 className="w-3 h-3" /> {u.department}
                          </span>
                          <span>•</span>
                          <span>{u.roleGroup}</span>
                        </div>
                      </div>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Permissions Matrix - Right Panel */}
        <div className="lg:col-span-8 space-y-4">
          {currentUser ? (
            <>
              {/* User Info */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2 bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                      Đang thiết lập
                    </span>
                    <h2 className="text-base font-bold text-slate-800 truncate">{currentUser.hoTen}</h2>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      MSNV: {currentUser.msnv} • {currentUser.department}
                    </p>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-center items-center shadow-sm">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-amber-500" /> Chỉ xem
                  </span>
                  <div className="text-lg font-black text-slate-700">
                    {viewOnlyCount} <span className="text-xs font-normal text-slate-400">quyền</span>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-center items-center shadow-sm">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5 flex items-center gap-1">
                    <Edit3 className="w-3 h-3 text-emerald-500" /> Toàn quyền
                  </span>
                  <div className="text-lg font-black text-indigo-600">
                    {fullAccessCount} <span className="text-xs font-normal text-slate-400">/{totalPermissions}</span>
                  </div>
                </div>
              </div>

              {/* Search Filter */}
              <div className="relative">
                <SlidersHorizontal className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Bộ lọc nhanh tên chức năng cần phân cấp..."
                  value={searchPermTerm}
                  onChange={e => setSearchPermTerm(e.target.value)}
                  className="pl-9 h-9 text-sm focus-visible:ring-indigo-500 bg-white border-slate-200 shadow-sm"
                />
              </div>

              {/* Permission Groups */}
              <div className="space-y-3 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
                {filteredGroups.map(({ groupName, filteredKeys }) => (
                  <Card key={groupName} className="border border-slate-200 shadow-sm overflow-hidden bg-white">
                    <div className="bg-slate-50/70 px-3.5 py-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="font-bold text-slate-800 text-sm tracking-tight">{groupName}</h3>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-semibold mr-1">Chỉnh nhanh nhóm:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBatchGroupPermission(PERMISSION_GROUPS[groupName], 'none')}
                          className="h-6 text-[10px] text-slate-500 hover:text-red-600 hover:bg-red-50 px-1.5"
                          disabled={isSaving}
                        >
                          Khóa hết
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBatchGroupPermission(PERMISSION_GROUPS[groupName], 'view')}
                          className="h-6 text-[10px] text-slate-500 hover:text-amber-600 hover:bg-amber-50 px-1.5"
                          disabled={isSaving}
                        >
                          Chỉ xem
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBatchGroupPermission(PERMISSION_GROUPS[groupName], 'full')}
                          className="h-6 text-[10px] text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 px-1.5"
                          disabled={isSaving}
                        >
                          Toàn quyền
                        </Button>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100 bg-white">
                      {filteredKeys.map(permKey => {
                        const currentLevel = userPermissions[permKey] || 'none';
                        const label = PERMISSION_LABELS[permKey] || permKey;
                        return (
                          <div
                            key={permKey}
                            className="flex flex-col sm:flex-row sm:items-center justify-between px-3.5 py-2 hover:bg-slate-50/40 transition-all gap-2"
                          >
                            <span className="text-xs font-semibold text-slate-700">{label}</span>
                            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 max-w-fit self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handleSetPermission(permKey, 'none')}
                                disabled={isSaving}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                                  currentLevel === 'none'
                                    ? 'bg-white text-red-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                <ShieldAlert className="w-3 h-3" /> Khóa chặn
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetPermission(permKey, 'view')}
                                disabled={isSaving}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                                  currentLevel === 'view'
                                    ? 'bg-white text-amber-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                <Eye className="w-3 h-3" /> Chỉ xem
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetPermission(permKey, 'full')}
                                disabled={isSaving}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                                  currentLevel === 'full'
                                    ? 'bg-white text-emerald-600 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                <Edit3 className="w-3 h-3" /> Toàn quyền
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2.5">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-normal font-medium">
                  <span className="font-bold">Cách áp dụng phía Client:</span> Tại trang nghiệp vụ, nếu trạng
                  thái phân quyền là <span className="text-amber-700 font-bold">Chỉ xem</span>, bạn hãy cấu
                  hình code ẩn hoặc thêm thuộc tính `disabled` vào các nút bấm Thêm/Sửa/Xóa. Nếu là{' '}
                  <span className="text-rose-700 font-bold">Khóa chặn</span>, hãy chặn truy cập ngay từ tầng
                  Guard Route bảo vệ.
                </p>
              </div>
            </>
          ) : (
            <Card className="border border-dashed border-slate-300 rounded-xl p-12 text-center bg-white shadow-sm flex flex-col items-center justify-center h-64">
              <Shield className="w-8 h-8 text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-500 mt-2">Chưa có hồ sơ được chọn</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Vui lòng chọn một nhân viên từ danh sách bên trái để thiết lập ma trận cấp quyền.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default Roles;