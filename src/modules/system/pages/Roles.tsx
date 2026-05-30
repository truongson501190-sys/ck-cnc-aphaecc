import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Shield, Save, RefreshCw, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_PERMISSIONS } from '@/types/user';

const PERMISSION_GROUPS = {
  'Kho bãi (WMS)': [
    'nhap_kho',
    'xuat_kho',
    'chuyen_kho',
    'xuat_dau',
    'kiem_ke_kho',
    'ton_kho',
    'the_kho',
    'lich_su_giao_dich',
  ],
  'Sản xuất (Manufacturing)': [
    'ke_hoach_san_xuat',
    'nhat_ky_gia_cong',
    'nhat_ky_qc',
    'nhat_ky_bao_tri',
    'theo_doi_tien_do',
  ],
  'Báo cáo & Dashboard': [
    'dashboard_tong_hop',
    'bao_cao_kho',
    'bao_cao_gia_cong',
    'bao_cao_qc',
    'bao_cao_bao_tri',
    'hieu_suat_may',
    'cho_duyet',
  ],
  'Quản lý Danh mục': ['chung_loai', 'kho', 'may_moc', 'du_an'],
  'Hệ thống': [
    'quan_ly_nguoi_dung',
    'phan_quyen',
    'audit_log',
    'backup_restore',
    'cai_dat_he_thong',
  ],
};

const PERMISSION_LABELS: Record<string, string> = {
  nhap_kho: 'Nhập kho',
  xuat_kho: 'Xuất kho',
  chuyen_kho: 'Chuyển kho',
  xuat_dau: 'Xuất dầu',
  kiem_ke_kho: 'Kiểm kê kho',
  ton_kho: 'Tồn kho',
  the_kho: 'Thẻ kho',
  lich_su_giao_dich: 'Lịch sử giao dịch',
  ke_hoach_san_xuat: 'Kế hoạch sản xuất',
  nhat_ky_gia_cong: 'Nhật ký gia công',
  nhat_ky_qc: 'Nhật ký QC',
  nhat_ky_bao_tri: 'Nhật ký bảo trì',
  theo_doi_tien_do: 'Theo dõi tiến độ',
  dashboard_tong_hop: 'Dashboard tổng hợp',
  bao_cao_kho: 'Báo cáo kho',
  bao_cao_gia_cong: 'Báo cáo gia công',
  bao_cao_qc: 'Báo cáo QC',
  bao_cao_bao_tri: 'Báo cáo bảo trì',
  hieu_suat_may: 'Hiệu suất máy',
  cho_duyet: 'Chờ duyệt',
  chung_loai: 'Chủng loại',
  kho: 'Kho',
  may_moc: 'Máy móc',
  du_an: 'Dự án',
  quan_ly_nguoi_dung: 'Quản lý người dùng',
  phan_quyen: 'Phân quyền',
  audit_log: 'Audit Log',
  backup_restore: 'Backup & Restore',
  cai_dat_he_thong: 'Cài đặt hệ thống',
};

interface UserProfile {
  msnv: string;
  fullName: string;
  department: string;
  roleGroup: string;
}

export function Roles() {
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [selectedUserMsnv, setSelectedUserMsnv] = useState<string>('');
  const [searchUserTerm, setSearchUserTerm] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({ ...DEFAULT_PERMISSIONS });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setIsLoading(true);
    try {
      const savedUsers = localStorage.getItem('wms_users');
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        setUserList(parsedUsers);
        if (parsedUsers.length > 0 && !selectedUserMsnv) {
          setSelectedUserMsnv(parsedUsers[0].msnv);
        }
      }
    } catch (error) {
      toast.error('Lỗi khi nạp danh sách người dùng.');
      console.error(error);
    } finally {
      setTimeout(() => setIsLoading(false), 200);
    }
  };

  const loadUserPermissions = (msnv: string) => {
    if (!msnv) return;
    
    const storedPerms = localStorage.getItem(`user_permissions_${msnv}`);
    if (storedPerms) {
      try {
        const perms = JSON.parse(storedPerms);
        setUserPermissions(perms);
        console.log('📋 Loaded permissions for:', msnv);
      } catch (e) {
        setUserPermissions({ ...DEFAULT_PERMISSIONS });
        console.warn('Failed to parse permissions');
      }
    } else {
      setUserPermissions({ ...DEFAULT_PERMISSIONS });
    }
  };

  const handleUserSelect = (msnv: string) => {
    setSelectedUserMsnv(msnv);
    loadUserPermissions(msnv);
  };

  const handleTogglePermission = (permKey: string, checked: boolean) => {
    setUserPermissions(prev => ({
      ...prev,
      [permKey]: checked,
    }));
  };

  const handleToggleGroup = (groupPermissions: string[], enable: boolean) => {
    const updated = { ...userPermissions };
    groupPermissions.forEach(perm => {
      updated[perm] = enable;
    });
    setUserPermissions(updated);
  };

  const handleSavePermissions = async () => {
    if (!selectedUserMsnv) {
      toast.error('Chưa chọn người dùng');
      return;
    }

    setIsSaving(true);
    try {
      localStorage.setItem(`user_permissions_${selectedUserMsnv}`, JSON.stringify(userPermissions));
      
      const selectedUser = userList.find(u => u.msnv === selectedUserMsnv);
      const enabledCount = Object.values(userPermissions).filter(Boolean).length;
      
      toast.success(
        `✅ Đã lưu quyền cho ${selectedUser?.fullName} (${selectedUserMsnv}): ${enabledCount} chức năng được phép`
      );
      
      console.log(`💾 Permissions saved for ${selectedUserMsnv}:`, enabledCount, 'features enabled');
    } catch (error) {
      toast.error('Lưu cấu hình thất bại');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = userList.filter(u =>
    u.msnv.toLowerCase().includes(searchUserTerm.toLowerCase()) ||
    u.fullName.toLowerCase().includes(searchUserTerm.toLowerCase())
  );

  const currentUser = userList.find(u => u.msnv === selectedUserMsnv);
  const enabledPermissionsCount = Object.values(userPermissions).filter(Boolean).length;
  const totalPermissions = Object.keys(DEFAULT_PERMISSIONS).length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-400" />
            <div>
              <CardTitle className="text-2xl">Phân Quyền Tự Do Theo Từng Nhân Viên</CardTitle>
              <CardDescription className="text-slate-300 mt-1">
                Mở/Tắt các chức năng cho từng người dùng một cách độc lập
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 bg-slate-50/50 space-y-6">
          {/* User Selection */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Search className="w-4 h-4 text-slate-400" />
              Chọn Nhân Viên
            </div>
            <div className="relative">
              <Input
                placeholder="Lọc theo MSNV hoặc tên..."
                value={searchUserTerm}
                onChange={e => setSearchUserTerm(e.target.value)}
                className="mb-2"
              />
            </div>
            <Select value={selectedUserMsnv} onValueChange={handleUserSelect}>
              <SelectTrigger className="w-full font-semibold text-base">
                <SelectValue placeholder="-- Chọn người dùng --" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {filteredUsers.map(u => (
                  <SelectItem key={u.msnv} value={u.msnv}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-600">{u.msnv}</span>
                      <span className="text-slate-600">-</span>
                      <span>{u.fullName}</span>
                      <span className="text-xs text-slate-500">({u.department})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current User Info & Stats */}
          {currentUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Đang cấu hình quyền cho:</p>
                  <p className="text-lg font-bold text-blue-700 mt-1">{currentUser.fullName}</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    MSNV: <span className="font-mono font-semibold">{currentUser.msnv}</span>
                    {' • '}
                    Bộ phận: <span className="font-semibold">{currentUser.department}</span>
                  </p>
                </div>
                <div className="text-right bg-white px-3 py-2 rounded border border-slate-200">
                  <p className="text-xs text-slate-600">Chức năng được phép</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {enabledPermissionsCount}/{totalPermissions}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Permission Groups */}
          {currentUser && (
            <div className="space-y-4">
              {Object.entries(PERMISSION_GROUPS).map(([groupName, permKeys]) => {
                const groupEnabledCount = permKeys.filter(k => userPermissions[k]).length;
                const isAllEnabled = groupEnabledCount === permKeys.length;
                const isSomeEnabled = groupEnabledCount > 0 && groupEnabledCount < permKeys.length;

                return (
                  <Card key={groupName} className="border overflow-hidden">
                    <div className="bg-slate-100 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">📂</span>
                        <div>
                          <p className="font-semibold text-slate-900">{groupName}</p>
                          <p className="text-xs text-slate-600">
                            {groupEnabledCount}/{permKeys.length} được phép
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleGroup(permKeys, !isAllEnabled)}
                        className={`text-xs font-semibold ${
                          isAllEnabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : isSomeEnabled
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {isAllEnabled ? '✓ Tắt hết' : 'Bật hết'}
                      </Button>
                    </div>

                    <div className="divide-y">
                      {permKeys.map(permKey => {
                        const isEnabled = userPermissions[permKey] || false;
                        const label = PERMISSION_LABELS[permKey] || permKey;

                        return (
                          <div
                            key={permKey}
                            className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                          >
                            <span className="text-sm text-slate-700">
                              <span className="text-slate-400 mr-2">▪</span>
                              {label}
                            </span>
                            <div className="flex items-center gap-3">
                              <span
                                className={`text-xs font-bold px-2 py-1 rounded border ${
                                  isEnabled
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : 'bg-slate-100 text-slate-500 border-slate-300'
                                }`}
                              >
                                {isEnabled ? 'ĐƯỢC VÀO' : 'ẨN CHẶN'}
                              </span>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={checked =>
                                  handleTogglePermission(permKey, checked)
                                }
                                className="data-[state=checked]:bg-emerald-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Info & Actions */}
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Lưu ý:</span> Khi nhân viên đăng nhập lần tiếp theo, hệ thống sẽ tự động cập nhật quyền hạn mới. Nếu đã đăng nhập, họ cần đăng xuất và đăng nhập lại.
              </p>
            </div>

            {currentUser && (
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={loadData}
                  disabled={isLoading || isSaving}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Tải lại
                </Button>
                <Button
                  onClick={handleSavePermissions}
                  disabled={isSaving || !currentUser}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                  {isSaving ? 'Đang lưu...' : 'Lưu Quyền'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Roles;
