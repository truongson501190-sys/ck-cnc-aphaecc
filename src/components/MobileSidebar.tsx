import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Factory,
  LogOut,
  User,
  X,
  Menu,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { ERPNavItem, ERP_NAVIGATION, ERP_ROUTE, isNavItemVisible } from '@/modules/erp/routes';

export function MobileSidebar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
      navigate(ERP_ROUTE.login);
      setIsOpen(false);
    }
  };

  const handleMenuItemClick = (item: ERPNavItem) => {
    if (item.action === 'logout') {
      handleLogout();
      return;
    }
    if (item.path) {
      navigate(item.path);
      setIsOpen(false);
    }
  };

  const menuItems = ERP_NAVIGATION.flatMap((group) => group.items || []);
  const filteredItems = menuItems.filter((item) => isNavItemVisible(item, user as any));

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
        className={`fixed top-0 left-0 h-full w-[calc(100vw-1rem)] max-w-xs z-50 md:hidden transform transition-all duration-300 ease-out ${
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
                        {user.fullName || user.name || 'Admin'}
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
              const isActive = location.pathname === item.path;

              return (
                <Button
                  key={item.id || 'home'}
                  variant="ghost"
                  className={`w-full justify-start text-left p-2 h-auto ${
                    isActive ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => handleMenuItemClick(item)}
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
