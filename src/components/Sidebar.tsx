import { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  LogOut,
  Wrench,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Users,
  User,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { UserPermissions } from '@/types/user';

interface SidebarProps {
  activeSection: string | null;
  onSectionChange: (section: string | null) => void;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: MenuItem[];
}

interface MenuItem {
  id: string | null;
  label: string;
  icon: LucideIcon;
  available?: boolean;
}

const SECTION_MODULE: Record<string, keyof UserPermissions> = {
  import: 'kho-tong',
  export: 'kho-tong',
  transfer: 'kho-tong',
  oil: 'kho-dau',
  reports: 'bao-cao-tong-hop',
  inventory: 'bao-cao-tong-hop',
};

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['production', 'warehouse', 'reports', 'management']);
  const navigate = useNavigate();

  const canView = (sectionId: string | null): boolean => {
    if (!user) return false;
    if (!sectionId) return true;
    const key = SECTION_MODULE[sectionId];
    if (!key) return true;
    return !!user.permissions?.[key]?.view;
  };

  const handleLogout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      logout();
      toast.success('👋 Đăng xuất thành công');
      navigate('/login');
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]));
  };

  const isUserAdmin = user?.role === 'admin';

  const menuGroups: MenuGroup[] = [
    {
      id: 'main',
      label: 'Trang chủ',
      icon: Home,
      items: [
        {
          id: null,
          label: 'Trang chủ',
          icon: Home,
          available: true,
        },
      ],
    },
    {
      id: 'warehouse',
      label: 'Kho bãi',
      icon: Package,
      items: [
        {
          id: 'import',
          label: 'Nhập kho',
          icon: Package,
          available: canView('import'),
        },
        {
          id: 'export',
          label: 'Xuất kho',
          icon: PackageOpen,
          available: canView('export'),
        },
        {
          id: 'transfer',
          label: 'Chuyển kho',
          icon: ArrowRightLeft,
          available: canView('transfer'),
        },
        {
          id: 'oil',
          label: 'Xuất dầu',
          icon: Droplets,
          available: canView('oil'),
        },
      ],
    },
    {
      id: 'reports',
      label: 'Báo cáo',
      icon: BarChart3,
      items: [
        {
          id: 'reports',
          label: 'Thống kê báo cáo',
          icon: BarChart3,
          available: canView('reports'),
        },
        {
          id: 'inventory',
          label: 'Tồn kho',
          icon: BarChart3,
          available: canView('inventory'),
        },
      ],
    },
  ];

  if (isUserAdmin) {
    menuGroups.push({
      id: 'management',
      label: 'Quản lý',
      icon: FolderTree,
      items: [
        {
          id: 'categories',
          label: 'Quản lý danh mục',
          icon: FolderTree,
          available: true,
        },
        {
          id: 'users',
          label: 'Quản lý người dùng',
          icon: Users,
          available: true,
        },
      ],
    });
  }

  return (
    <div
      className={`bg-blue-50/80 border-r border-blue-200/50 transition-all duration-300 ${
        isCollapsed ? 'w-12' : 'w-56'
      } min-h-screen flex flex-col`}
    >
      {/* Header thu gọn */}
      <div className="p-3 border-b border-blue-200/50">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
                <Factory className="w-3 h-3 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-blue-800">CNC-CK</h2>
                <p className="text-xs text-blue-600">Quản lý</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100/50 p-1 h-6 w-6"
          >
            {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {/* Thông tin người dùng thu gọn */}
      {!isCollapsed && user && (
        <div className="p-3 border-b border-blue-200/50 bg-blue-100/30">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-300 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-blue-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1 mb-1">
                <span className="text-xs font-medium text-blue-800 truncate">
                  {user.fullName || (user as any).name || 'Admin'}
                </span>
                <Badge
                  variant={user.role === 'admin' ? 'default' : 'secondary'}
                  className="text-xs px-1 py-0 h-3 bg-blue-500/20 text-blue-700 border-blue-400/30"
                >
                  {user.role === 'admin' ? 'A' : 'U'}
                </Badge>
              </div>
              <div className="text-xs text-blue-600">{user.msnv || ''}</div>
            </div>
          </div>
        </div>
      )}

      {/* Menu điều hướng thu gọn */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {menuGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.id);
            const GroupIcon = group.icon;

            // Nhóm main (Trang chủ)
            if (group.id === 'main') {
              const item = group.items[0];
              const ItemIcon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <div key={group.id}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-left p-2 h-auto ${
                      isActive ? 'bg-blue-200/50 text-blue-800 border-l-2 border-blue-500' : 'text-blue-700 hover:bg-blue-100/50'
                    }`}
                    onClick={() => onSectionChange(item.id)}
                  >
                    <ItemIcon className="w-3 h-3 mr-2" />
                    {!isCollapsed && <span className="text-xs font-medium">{item.label}</span>}
                  </Button>
                </div>
              );
            }

            return (
              <div key={group.id}>
                {/* Group Header */}
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left p-2 h-auto text-blue-700 hover:bg-blue-100/50"
                  onClick={() => !isCollapsed && toggleGroup(group.id)}
                >
                  <GroupIcon className="w-3 h-3 mr-2" />
                  {!isCollapsed && (
                    <>
                      <span className="text-xs font-medium flex-1">{group.label}</span>
                      {group.items.length > 1 && (
                        <div className="ml-1">{isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</div>
                      )}
                    </>
                  )}
                </Button>

                {/* Group Items */}
                {!isCollapsed && (isExpanded || group.items.length === 1) && (
                  <div className="ml-3 mt-1 space-y-1">
                    {group.items.map((item) => {
                      if (item.available === false) return null;

                      const ItemIcon = item.icon;
                      const isActive = activeSection === item.id;

                      return (
                        <Button
                          key={item.id || 'item'}
                          variant="ghost"
                          className={`w-full justify-start text-left p-1.5 h-auto text-xs ${
                            isActive ? 'bg-blue-200/50 text-blue-800 border-l-2 border-blue-500' : 'text-blue-600 hover:bg-blue-100/50'
                          }`}
                          onClick={() => item.id === 'inventory' ? navigate('/ton-kho') : onSectionChange(item.id)}
                        >
                          <ItemIcon className="w-3 h-3 mr-1.5" />
                          <span>{item.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Nút đăng xuất */}
      <div className="p-2 border-t border-blue-200/50">
        <Button
          variant="ghost"
          className="w-full justify-start text-left p-2 h-auto text-blue-600 hover:bg-red-100/50 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="w-3 h-3 mr-2" />
          {!isCollapsed && <span className="text-xs font-medium">Đăng xuất</span>}
        </Button>
      </div>
    </div>
  );
}