import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Save, RefreshCw, User, Users, Search } from 'lucide-react';
import { toast } from 'sonner';

const APP_MENU_TREE = {
  'Kho bãi (WMS)': ['Nhập kho', 'Xuất kho', 'Chuyển kho', 'Xuất dầu', 'Kiểm kê kho', 'Tồn kho', 'Thẻ kho', 'Lịch sử giao dịch'],
  'Sản xuất (Manufacturing)': ['Kế hoạch sản xuất', 'Nhật ký gia công', 'Nhật ký QC', 'Nhật ký bảo trì', 'Theo dõi tiến độ'],
  'Báo cáo & Dashboard': ['Dashboard tổng hợp', 'Báo cáo kho', 'Báo cáo gia công', 'Báo cáo QC', 'Báo cáo bảo trì', 'Hiệu suất máy', 'Chờ duyệt'],
  'Quản lý Danh mục': ['Chủng loại', 'Kho', 'Máy móc', 'Dự án'],
  'Hệ thống': ['Quản lý người dùng', 'Phân quyền', 'Audit Log', 'Backup & Restore', 'Cài đặt hệ thống']
};

interface UserProfile { msnv: string; fullName: string; department: string; roleGroup: string; }

export function Roles() {
  const [permissionType, setPermissionType] = useState<'role' | 'user'>('role');
  const [selectedRole, setSelectedRole] = useState<string>('Thợ CNC');
  const [selectedUserMsnv, setSelectedUserMsnv] = useState<string>('');
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [searchUserTerm, setSearchUserTerm] = useState<string>('');
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const currentTargetKey = permissionType === 'role' ? selectedRole : selectedUserMsnv;

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setIsLoading(true);
    try {
      const savedUsers = localStorage.getItem('wms_users');
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        setUserList(parsedUsers);
        if (parsedUsers.length > 0 && !selectedUserMsnv) setSelectedUserMsnv(parsedUsers[0].msnv);
      }

      const savedPerms = localStorage.getItem('wms_permissions');
      if (savedPerms) {
        setPermissionsMatrix(JSON.parse(savedPerms));
      } else {
        const defaultMatrix: Record<string, Record<string, boolean>> = {
          'Thợ CNC': { 'Nhật ký gia công': true, 'Nhật ký bảo trì': true, 'Theo dõi tiến độ': true, 'Báo cáo gia công': true },
          'Quản lý kho': { 'Nhập kho': true, 'Xuất kho': true, 'Chuyển kho': true, 'Xuất dầu': true, 'Kiểm kê kho': true, 'Tồn kho': true, 'Thẻ kho': true, 'Lịch sử giao dịch': true, 'Báo cáo kho': true },
          'Admin': {}
        };
        localStorage.setItem('wms_permissions', JSON.stringify(defaultMatrix));
        setPermissionsMatrix(defaultMatrix);
      }
    } catch (error) {
      toast.error('Lỗi khi nạp cấu hình dữ liệu.');
    } finally {
      setTimeout(() => setIsLoading(false), 200);
    }
  };

  const handleTogglePermission = (feature: string, checked: boolean) => {
    if (!currentTargetKey) return;
    setPermissionsMatrix(prev => ({ ...prev, [currentTargetKey]: { ...(prev[currentTargetKey] || {}), [feature]: checked } }));
  };

  const handleToggleAllInGroup = (groupName: string, enable: boolean) => {
    if (!currentTargetKey) return;
    const features = APP_MENU_TREE[groupName as keyof typeof APP_MENU_TREE];
    const updatedGroupPerms = { ...(permissionsMatrix[currentTargetKey] || {}) };
    features.forEach(f => { updatedGroupPerms[f] = enable; });
    setPermissionsMatrix(prev => ({ ...prev, [currentTargetKey]: updatedGroupPerms }));
  };

  const handleSavePermissions = () => {
    if (!currentTargetKey) return;
    try {
      localStorage.setItem('wms_permissions', JSON.stringify(permissionsMatrix));
      const textLabel = permissionType === 'role' ? `nhóm [${selectedRole}]` : `nhân viên [${selectedUserMsnv}]`;
      toast.success(`Đã áp dụng và lưu cấu hình cho ${textLabel}!`);
    } catch (error) {
      toast.error('Lưu cấu hình thất bại.');
    }
  };

  const filteredUsersForSelect = userList.filter(u => u.msnv.toLowerCase().includes(searchUserTerm.toLowerCase()) || u.fullName.toLowerCase().includes(searchUserTerm.toLowerCase()));
  const currentSelectedUserInfo = userList.find(u => u.msnv === selectedUserMsnv);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-900 text-white p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2"><Shield className="w-5 h-5 text-blue-400" /> Thiết Lập Cấp Quyền Hệ Thống</CardTitle>
            <Tabs value={permissionType} onValueChange={(val) => setPermissionType(val as 'role' | 'user')} className="bg-slate-800 p-1 rounded-lg">
              <TabsList className="bg-transparent grid grid-cols-2 w-[320px] h-8 text-slate-300 p-0">
                <TabsTrigger value="role" className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Theo Nhóm Vai Trò</TabsTrigger>
                <TabsTrigger value="user" className="text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white flex items-center gap-1"><User className="w-3.5 h-3.5" /> Theo Từng Nhân Viên</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Separator className="bg-slate-800" />
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-800/60 p-3 rounded-lg">
            {permissionType === 'role' ? (
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-56 font-bold text-blue-400 bg-slate-900 border-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white text-gray-900"><SelectItem value="Thợ CNC">Nhóm Thợ CNC</SelectItem><SelectItem value="Quản lý kho">Nhóm Quản lý Kho</SelectItem><SelectItem value="QC">Nhóm Kiểm soát QC</SelectItem><SelectItem value="Duyệt">Ban Quản Đốc</SelectItem><SelectItem value="Admin">Admin tối cao</SelectItem></SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative w-48"><Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" /><Input placeholder="Lọc nhanh NV..." value={searchUserTerm} onChange={e => setSearchUserTerm(e.target.value)} className="h-8 pl-8 text-xs bg-slate-900 text-white border-slate-700" /></div>
                <Select value={selectedUserMsnv} onValueChange={setSelectedUserMsnv}>
                  <SelectTrigger className="w-64 font-bold text-amber-400 bg-slate-900 border-slate-700 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white text-gray-900">{filteredUsersForSelect.map(u => (<SelectItem key={u.msnv} value={u.msnv} className="text-xs">{u.msnv} - {u.fullName}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={loadData} className="text-slate-400 hover:text-white"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 bg-slate-50/40">
          {permissionType === 'role' && selectedRole === 'Admin' ? (
            <div className="p-6 bg-blue-50 border text-blue-950 rounded-xl text-sm font-medium">💡 Tài khoản thuộc nhóm <strong>[Admin]</strong> mặc định luôn luôn hiển thị 100% chức năng.</div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white p-3 rounded-lg border border-dashed border-gray-300 text-xs font-medium">
                Đang cấu hình quyền cho: <span className="text-blue-600 underline">{permissionType === 'role' ? selectedRole : currentSelectedUserInfo?.fullName + ` (${selectedUserMsnv})`}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(APP_MENU_TREE).map(([parentMenu, subMenus]) => {
                  const targetPerms = permissionsMatrix[currentTargetKey] || {};
                  const isAllChecked = subMenus.every(m => targetPerms[m]);
                  return (
                    <Card key={parentMenu} className="border shadow-sm bg-white">
                      <div className="bg-gray-100 px-4 py-2 text-xs font-bold flex justify-between items-center"><span>📂 {parentMenu}</span><Button variant="ghost" size="sm" className="h-6 text-[11px] text-blue-600" onClick={() => handleToggleAllInGroup(parentMenu, !isAllChecked)}>{isAllChecked ? 'Tắt hết' : 'Bật hết'}</Button></div>
                      <CardContent className="p-0 divide-y">
                        {subMenus.map((subMenu) => {
                          const hasAccess = targetPerms[subMenu] || false;
                          return (
                            <div key={subMenu} className="flex items-center justify-between p-3 px-4 hover:bg-slate-50">
                              <span className="text-xs text-gray-700">▪️ {subMenu}</span>
                              <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-bold ${hasAccess ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-50'} px-2 py-0.5 rounded border`}>{hasAccess ? 'ĐƯỢC VÀO' : 'ẨN CHẶN'}</span>
                                <Switch checked={hasAccess} onCheckedChange={(checked) => handleTogglePermission(subMenu, checked)} className="data-[state=checked]:bg-emerald-500" />
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="flex justify-end"><Button onClick={handleSavePermissions} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-5 px-8"><Save className="w-4 h-4 mr-2" /> Lưu & Áp dụng cấu hình</Button></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Roles;