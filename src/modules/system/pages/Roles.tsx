import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, Save, RefreshCw, Search, AlertCircle, 
  User, Building2, SlidersHorizontal, Eye, Edit3, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';

const PERMISSION_GROUPS = {
  'Kho bãi (WMS)': [
    'nhap_kho', 'xuat_kho', 'chuyen_kho', 'xuat_dau', 
    'kiem_ke_kho', 'ton_kho', 'the_kho', 'lich_su_giao_dich',
  ],
  'Sản xuất (Manufacturing)': [
    'ke_hoach_san_xuat', 'nhat_ky_gia_cong', 'nhat_ky_qc', 
    'nhat_ky_bao_tri', 'theo_doi_tien_do',
  ],
  'Báo cáo & Dashboard': [
    'dashboard_tong_hop', 'bao_cao_kho', 'bao_cao_gia_cong', 
    'bao_cao_qc', 'bao_cao_bao_tri', 'hieu_suat_may', 'cho_duyet',
  ],
  'Quản lý Danh mục': ['chung_loai', 'kho', 'may_moc', 'du_an'],
  'Hệ thống': [
    'quan_ly_nguoi_dung', 'phan_quyen', 'audit_log', 
    'backup_restore', 'cai_dat_he_thong',
  ],
};

const PERMISSION_LABELS: Record<string, string> = {
  nhap_kho: 'Nhập kho', xuat_kho: 'Xuất kho', chuyen_kho: 'Chuyển kho',
  xuat_dau: 'Xuất dầu', kiem_ke_kho: 'Kiểm kê kho', ton_kho: 'Tồn kho',
  the_kho: 'Thẻ kho', lich_su_giao_dich: 'Lịch sử giao dịch',
  ke_hoach_san_xuat: 'Kế hoạch sản xuất', nhat_ky_gia_cong: 'Nhật ký gia công',
  nhat_ky_qc: 'Nhật ký QC', nhat_ky_bao_tri: 'Nhật ký bảo trì',
  theo_doi_tien_do: 'Theo dõi tiến độ', dashboard_tong_hop: 'Dashboard tổng hợp',
  bao_cao_kho: 'Báo cáo kho', bao_cao_gia_cong: 'Báo cáo gia công',
  bao_cao_qc: 'Báo cáo QC', bao_cao_bao_tri: 'Báo cáo bảo trì',
  hieu_suat_may: 'Hiệu suất máy', cho_duyet: 'Chờ duyệt',
  chung_loai: 'Chủng loại', kho: 'Kho', may_moc: 'Máy móc', du_an: 'Dự án',
  quan_ly_nguoi_dung: 'Quản lý người dùng', phan_quyen: 'Phân quyền',
  audit_log: 'Audit Log', backup_restore: 'Backup & Restore',
  cai_dat_he_thong: 'Cài đặt hệ thống',
};

// Khởi tạo tất cả các quyền mặc định ở trạng thái ẩn chặn ('none')
const INITIAL_PERMISSIONS: Record<string, 'none' | 'view' | 'full'> = {};
Object.keys(PERMISSION_LABELS).forEach(key => {
  INITIAL_PERMISSIONS[key] = 'none';
});

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
  const [searchPermTerm, setSearchPermTerm] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<Record<string, 'none' | 'view' | 'full'>>({ ...INITIAL_PERMISSIONS });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setIsLoading(true);
    try {
      const savedUsers = localStorage.getItem('users');
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        const nonAdminUsers = parsedUsers.filter((u: any) => u.msnv !== '1118').map((u: any) => ({
          msnv: u.msnv,
          fullName: u.fullName,
          department: u.department,
          roleGroup: u.position || 'User'
        }));
        
        setUserList(nonAdminUsers);
        if (nonAdminUsers.length > 0 && !selectedUserMsnv) {
          const firstMsnv = nonAdminUsers[0].msnv;
          setSelectedUserMsnv(firstMsnv);
          loadUserPermissions(firstMsnv);
        }
      }
    } catch (error) {
      toast.error('Lỗi khi nạp danh sách người dùng.');
    } finally {
      setTimeout(() => setIsLoading(false), 200);
    }
  };

  const loadUserPermissions = (msnv: string) => {
    if (!msnv) return;
    const storedPerms = localStorage.getItem(`user_permissions_v2_${msnv}`);
    if (storedPerms) {
      try {
        setUserPermissions(JSON.parse(storedPerms));
      } catch (e) {
        setUserPermissions({ ...INITIAL_PERMISSIONS });
      }
    } else {
      setUserPermissions({ ...INITIAL_PERMISSIONS });
    }
  };

  const handleUserSelect = (msnv: string) => {
    setSelectedUserMsnv(msnv);
    loadUserPermissions(msnv);
  };

  const handleSetPermission = (permKey: string, level: 'none' | 'view' | 'full') => {
    setUserPermissions(prev => ({ ...prev, [permKey]: level }));
  };

  const handleBatchGroupPermission = (groupPermissions: string[], level: 'none' | 'view' | 'full') => {
    const updated = { ...userPermissions };
    groupPermissions.forEach(perm => { updated[perm] = level; });
    setUserPermissions(updated);
  };

  const handleSavePermissions = async () => {
    if (!selectedUserMsnv) return;
    setIsSaving(true);
    try {
      localStorage.setItem(`user_permissions_v2_${selectedUserMsnv}`, JSON.stringify(userPermissions));
      const selectedUser = userList.find(u => u.msnv === selectedUserMsnv);
      toast.success(`Đã lưu cấu hình phân quyền nâng cao cho ${selectedUser?.fullName}`);
    } catch (error) {
      toast.error('Lưu cấu hình thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = userList.filter(u =>
    u.msnv.toLowerCase().includes(searchUserTerm.toLowerCase()) ||
    u.fullName.toLowerCase().includes(searchUserTerm.toLowerCase())
  );

  const currentUser = userList.find(u => u.msnv === selectedUserMsnv);
  
  // Tính toán thống kê số lượng quyền
  const totalPermissions = Object.keys(INITIAL_PERMISSIONS).length;
  const viewOnlyCount = Object.values(userPermissions).filter(v => v === 'view').length;
  const fullAccessCount = Object.values(userPermissions).filter(v => v === 'full').length;

  return (
    <div className="w-full space-y-5">
      {/* Header Meta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
            <Shield className="w-5 h-5 text-indigo-600" />
            Ma trận Cấp quyền Hệ thống (3-Tier RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân định chi tiết giữa quyền Chỉ xem (Read-only) và quyền Chỉnh sửa (Write) cho từng phân hệ phần mềm.
          </p>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading || isSaving} className="h-9">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Đồng bộ dữ liệu
          </Button>
          <Button size="sm" onClick={handleSavePermissions} disabled={isSaving || !currentUser} className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-4">
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Lưu Ma trận Quyền
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* CỘT TRÁI: Tìm kiếm & Danh sách nhân viên */}
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
                <div className="text-center py-8 text-xs text-slate-400">Không tìm thấy nhân viên</div>
              ) : (
                filteredUsers.map(u => {
                  const isSelected = u.msnv === selectedUserMsnv;
                  return (
                    <button
                      key={u.msnv}
                      onClick={() => handleUserSelect(u.msnv)}
                      className={`w-full text-left p-2.5 rounded-lg transition-all flex items-center justify-between group ${
                        isSelected 
                          ? 'bg-indigo-50/80 border border-indigo-100/50 text-indigo-900' 
                          : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold font-mono ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`}>
                            {u.msnv}
                          </span>
                          <span className="text-xs text-slate-300">|</span>
                          <span className="text-sm font-semibold truncate block">{u.fullName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-0.5"><Building2 className="w-3 h-3" /> {u.department}</span>
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

        {/* CỘT PHẢI: Bảng ma trận điều khiển 3 trạng thái */}
        <div className="lg:col-span-8 space-y-4">
          {currentUser ? (
            <>
              {/* Profile Thống kê */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2 bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-200">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Đang thiết lập</span>
                    <h2 className="text-base font-bold text-slate-800 truncate">{currentUser.fullName}</h2>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">MSNV: {currentUser.msnv} • {currentUser.department}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-center items-center shadow-sm">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-amber-500" /> Chỉ xem
                  </span>
                  <div className="text-lg font-black text-slate-700">{viewOnlyCount} <span className="text-xs font-normal text-slate-400">quyền</span></div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-center items-center shadow-sm">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5 flex items-center gap-1">
                    <Edit3 className="w-3 h-3 text-emerald-500" /> Toàn quyền
                  </span>
                  <div className="text-lg font-black text-indigo-600">{fullAccessCount} <span className="text-xs font-normal text-slate-400">/ {totalPermissions}</span></div>
                </div>
              </div>

              {/* Ô lọc tính năng */}
              <div className="relative">
                <SlidersHorizontal className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Bộ lọc nhanh tên chức năng cần phân cấp..."
                  value={searchPermTerm}
                  onChange={e => setSearchPermTerm(e.target.value)}
                  className="pl-9 h-9 text-sm focus-visible:ring-indigo-500 bg-white border-slate-200 shadow-sm"
                />
              </div>

              {/* Danh sách các nhóm tính năng */}
              <div className="space-y-3 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
                {Object.entries(PERMISSION_GROUPS).map(([groupName, permKeys]) => {
                  const filteredKeys = permKeys.filter(key => 
                    (PERMISSION_LABELS[key] || key).toLowerCase().includes(searchPermTerm.toLowerCase())
                  );

                  if (filteredKeys.length === 0) return null;

                  return (
                    <Card key={groupName} className="border border-slate-200 shadow-sm overflow-hidden bg-white">
                      {/* Tiêu đề nhóm & Điều khiển nhanh hàng loạt */}
                      <div className="bg-slate-50/70 px-3.5 py-2.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm tracking-tight">{groupName}</h3>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-semibold mr-1">Chỉnh nhanh nhóm:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBatchGroupPermission(permKeys, 'none')}
                            className="h-6 text-[10px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-1.5"
                          >
                            Chặn hết
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBatchGroupPermission(permKeys, 'view')}
                            className="h-6 text-[10px] text-slate-500 hover:text-amber-600 hover:bg-amber-50 px-1.5"
                          >
                            Chỉ xem
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBatchGroupPermission(permKeys, 'full')}
                            className="h-6 text-[10px] text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 px-1.5"
                          >
                            Toàn quyền
                          </Button>
                        </div>
                      </div>

                      {/* Danh sách các quyền con cấu trúc 3 nút lựa chọn */}
                      <div className="divide-y divide-slate-100 bg-white">
                        {filteredKeys.map(permKey => {
                          const currentLevel = userPermissions[permKey] || 'none';
                          const label = PERMISSION_LABELS[permKey] || permKey;

                          return (
                            <div key={permKey} className="flex flex-col sm:flex-row sm:items-center justify-between px-3.5 py-2 hover:bg-slate-50/40 transition-all gap-2">
                              <span className="text-xs font-semibold text-slate-700">{label}</span>
                              
                              {/* Bộ chọn phân tầng 3 trạng thái (None - View - Full) */}
                              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 max-w-fit self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => handleSetPermission(permKey, 'none')}
                                  className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                                    currentLevel === 'none'
                                      ? 'bg-white text-rose-600 shadow-sm'
                                      : 'text-slate-400 hover:text-slate-600'
                                  }`}
                                >
                                  <ShieldAlert className="w-3 h-3" /> Khóa chặn
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetPermission(permKey, 'view')}
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
                  );
                })}
              </div>

              {/* Hướng dẫn nghiệp vụ */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2.5">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900 leading-normal font-medium">
                  <span className="font-bold">Cách áp dụng phía Client:</span> Tại trang chức năng nghiệp vụ (ví dụ: Nhật ký QC), nếu trạng thái là <span className="text-amber-700 font-bold">Chỉ xem</span>, hãy cấu hình code ẩn hoặc thêm thuộc tính `disabled` vào các nút bấm Thêm/Sửa/Xóa. Nếu trạng thái là <span className="text-rose-700 font-bold">Khóa chặn</span>, hãy chặn truy cập ngay từ tầng Route bảo vệ.
                </p>
              </div>
            </>
          ) : (
            <Card className="border border-dashed border-slate-300 rounded-xl p-12 text-center bg-white shadow-sm flex flex-col items-center justify-center h-64">
              <Shield className="w-8 h-8 text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-500 mt-2">Chưa có hồ sơ được chọn</p>
              <p className="text-xs text-slate-400 mt-0.5">Vui lòng chọn một nhân viên từ danh sách bên trái để thiết lập ma trận cấp quyền.</p>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}

export default Roles;
