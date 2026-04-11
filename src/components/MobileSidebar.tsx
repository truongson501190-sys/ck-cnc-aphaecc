import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Factory,
  Package,
  PackageOpen,
  Droplets,
  ArrowRightLeft,
  FolderTree,
  BarChart3,
  LogOut,
  Wrench,
  ClipboardCheck,
  Users,
  User,
  X,
  Menu,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { UserPermissions } from '@/types/user';

interface MobileSidebarProps {
  activeSection: string | null;
  onSectionChange: (section: string | null) => void;
}

const SECTION_MODULE: Record<string, keyof UserPermissions> = {
  import: 'kho-tong',
  export: 'kho-tong',
  transfer: 'kho-tong',
  oil: 'kho-dau',
  production: 'kho-tong',
  reports: 'bao-cao-tong-hop',
  inventory: 'bao-cao-tong-hop',
};

export function MobileSidebar({ activeSection, onSectionChange }: MobileSidebarProps) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const canView = (sectionId: string | null): boolean => {
    if (!user) return false;
    if (!sectionId) return true;
    const key = SECTION_MODULE[sectionId];
    if (!key) return true;
    return !!user.permissions?.[key]?.view;
  };

  // Đóng sidebar khi thay đổi section
  useEffect(() => {
    setIsOpen(false);
  }, [activeSection]);

  // Ngăn cuộn body khi sidebar mở
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleLogout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      logout();
      toast.success('👋 Đăng xuất thành công');
      navigate('/login');
      setIsOpen(false);
    }
  };

  // Menu items
  const baseItems = [
    { id: null, label: 'Trang chủ', icon: Home },
    { id: 'import', label: 'Nhập kho', icon: Package },
    { id: 'export', label: 'Xuất kho', icon: PackageOpen },
    { id: 'transfer', label: 'Chuyển kho', icon: ArrowRightLeft },
    { id: 'oil', label: 'Xuất dầu', icon: Droplets },
    { id: 'reports', label: 'Thống kê báo cáo', icon: BarChart3 },
    { id: 'inventory', label: 'Tồn kho', icon: BarChart3 },
  ];

  const filteredItems = baseItems.filter((item) => canView(item.id || null));

  // Admin menu
  const adminItems =
    user?.role === 'admin'
      ? [
          { id: 'categories', label: 'Quản lý danh mục', icon: FolderTree },
          { id: 'users', label: 'Quản lý người dùng', icon: Users },
        ]
      : [];

  return (
    <>
      {/* Nút menu mobile thu gọn */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed top-3 left-3 z-50 md:hidden bg-white border border-gray-200 shadow-md hover:bg-gray-50 text-gray-700 hover:text-gray-900 h-8 px-2"
        size="sm"
      >
        <Menu className="w-3 h-3 mr-1" />
        <span className="text-xs font-medium">Menu</span>
      </Button>

      {/* Lớp phủ */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsOpen(false)} />}

      {/* Sidebar mobile thu gọn */}
      <div
        className={`fixed top-0 left-0 h-full w-64 z-50 md:hidden transform transition-all duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-white shadow-xl`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                  <Factory className="w-3 h-3 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Xưởng CK-CNC</h2>
                  <p className="text-xs text-gray-500">Quản lý</p>
                </div>
              </div>
              <Button onClick={() => setIsOpen(false)} variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700 p-1 h-6 w-6">
                <X className="w-3 h-3" />
              </Button>
            </div>

            {/* Thông tin người dùng */}
            {user && (
              <div className="bg-gray-50 rounded-md p-2 border border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="text-xs font-medium text-gray-900 truncate">
                        {user.fullName || (user as any).name || 'Admin'}
                      </span>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs px-1 py-0 h-3">
                        {user.role === 'admin' ? 'A' : 'U'}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">{user.msnv || ''}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Menu điều hướng */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredItems.map((item) => {
              const ItemIcon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <Button
                  key={item.id || 'home'}
                  variant="ghost"
                  className={`w-full justify-start text-left p-2 h-auto ${
                    isActive ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => item.id === 'inventory' ? navigate('/ton-kho') : onSectionChange(item.id || null)}
                >
                  <ItemIcon className="w-3 h-3 mr-2" />
                  <span className="text-xs font-medium">{item.label}</span>
                  <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />
                </Button>
              );
            })}

            {adminItems.map((item) => {
              const ItemIcon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`w-full justify-start text-left p-2 h-auto ${
                    isActive ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => onSectionChange(item.id)}
                >
                  <ItemIcon className="w-3 h-3 mr-2" />
                  <span className="text-xs font-medium">{item.label}</span>
                  <ChevronRight className="w-3 h-3 ml-auto text-gray-400" />
                </Button>
              );
            })}
          </nav>

          {/* Nút đăng xuất */}
          <div className="p-2 border-t border-gray-200">
            <Button
              variant="ghost"
              className="w-full justify-start text-left p-2 h-auto text-gray-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleLogout}
            >
              <LogOut className="w-3 h-3 mr-2" />
              <span className="text-xs font-medium">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
