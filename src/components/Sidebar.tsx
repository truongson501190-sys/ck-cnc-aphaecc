import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  ChevronUp,
  User,
  Factory,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { ERP_NAVIGATION, ERP_ROUTE, ERPNavItem, isNavItemVisible } from '@/modules/erp/routes';

export function Sidebar() {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['warehouse', 'manufacturing', 'reports', 'masterData']);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      logout();
      toast.success('👋 Đăng xuất thành công');
      navigate(ERP_ROUTE.login);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]));
  };

  const handleMenuItemClick = (item: ERPNavItem) => {
    if (item.action === 'logout') {
      handleLogout();
      return;
    }
    if (item.path) {
      navigate(item.path);
    }
  };

  const isActiveRoute = (path?: string) => !!path && (location.pathname === path || location.pathname.startsWith(`${path}/`));
  const menuGroups = ERP_NAVIGATION;

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
                  {user.fullName || user.name || 'Admin'}
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
              const isActive = isActiveRoute(item.path);

              return (
                <div key={group.id}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-left p-2 h-auto ${
                      isActive ? 'bg-blue-200/50 text-blue-800 border-l-2 border-blue-500' : 'text-blue-700 hover:bg-blue-100/50'
                    }`}
                    onClick={() => {
                      if (item.path) navigate(item.path);
                    }}
                  >
                    <ItemIcon className="w-3 h-3 mr-2" />
                    {!isCollapsed && <span className="text-xs font-medium">{item.label}</span>}
                  </Button>
                </div>
              );
            }

            const visibleItems = group.items.filter((item) => isNavItemVisible(item, user));
            if (visibleItems.length === 0) {
              return null;
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
                      {visibleItems.length > 1 && (
                        <div className="ml-1">{isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</div>
                      )}
                    </>
                  )}
                </Button>

                {/* Group Items */}
                {!isCollapsed && (isExpanded || visibleItems.length === 1) && (
                  <div className="ml-3 mt-1 space-y-1">
                    {visibleItems.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = isActiveRoute(item.path);

                      return (
                        <Button
                          key={item.id || 'item'}
                          variant="ghost"
                          className={`w-full justify-start text-left p-1.5 h-auto text-xs ${
                            isActive ? 'bg-blue-200/50 text-blue-800 border-l-2 border-blue-500' : 'text-blue-600 hover:bg-blue-100/50'
                          }`}
                          onClick={() => handleMenuItemClick(item)}
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