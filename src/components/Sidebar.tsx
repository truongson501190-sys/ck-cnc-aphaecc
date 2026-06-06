import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, ChevronLeft, Menu, LogOut } from 'lucide-react';
import { ERP_NAVIGATION, ERPNavItem } from '@/modules/erp/routes';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { canView } = usePermission();
  
  // State quản lý group đang mở (chỉ mở 1 group tại 1 thời điểm)
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  
  // State quản lý sub-menu đang mở trong group (chỉ mở 1 sub-menu)
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

  // Tự động mở group và sub-menu chứa trang hiện tại
  useEffect(() => {
    // 💡 NẾU QUAY VỀ TRANG CHỦ: Tự động thu gọn (gom) toàn bộ các menu khác lại ngay
    if (location.pathname === '/') {
      setOpenGroup(null);
      setOpenSubMenu(null);
      return; 
    }

    let foundGroupId: string | null = null;
    let foundParentId: string | null = null;
    
    for (const group of ERP_NAVIGATION) {
      // Bỏ qua kiểm tra items nếu là mục phẳng (Trang chủ) không có mảng con
      if (!group.items) continue;

      for (const item of group.items) {
        if (item.path === location.pathname) {
          foundGroupId = group.id;
          break;
        }
        if (item.children) {
          for (const child of item.children) {
            if (child.path === location.pathname) {
              foundGroupId = group.id;
              foundParentId = item.id;
              break;
            }
          }
        }
      }
      if (foundGroupId) break;
    }
    
    if (foundGroupId) {
      setOpenGroup(foundGroupId);
    }
    if (foundParentId) {
      setOpenSubMenu(foundParentId);
    }
  }, [location.pathname]);

  // Toggle group - đóng group khác nếu đang mở
  const toggleGroup = (groupId: string) => {
    if (openGroup === groupId) {
      setOpenGroup(null);
      setOpenSubMenu(null);
    } else {
      setOpenGroup(groupId);
      setOpenSubMenu(null);
    }
  };

  // Toggle sub-menu - đóng sub-menu khác nếu đang mở
  const toggleSubMenu = (menuId: string) => {
    setOpenSubMenu(prev => (prev === menuId ? null : menuId));
  };

  // Kiểm tra item có active không
  const isItemActive = (item: ERPNavItem): boolean => {
    if (item.path === location.pathname) return true;
    if (item.children) {
      return item.children.some(child => child.path === location.pathname);
    }
    return false;
  };

  // Lọc item theo quyền
  const getVisibleItems = (items: ERPNavItem[] | undefined): ERPNavItem[] => {
    if (!items) return [];
    return items.filter(item => {
      if (user?.role === 'admin') return true;
      if (item.action === 'logout') return false;
      if (!item.permissionKey) return true;
      return canView(item.permissionKey);
    });
  };

  // Xử lý click vào menu item
  const handleItemClick = (item: ERPNavItem) => {
    if (item.children && item.children.length > 0) {
      // Nếu có children -> toggle sub-menu
      toggleSubMenu(item.id);
    } else if (item.path) {
      // Nếu có path -> chuyển trang
      navigate(item.path);
    } else if (item.action === 'logout') {
      logout();
    }
  };

  return (
    <>
      {/* NÚT ĐIỀU KHIỂN ĐÓNG/MỞ SIDEBAR */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-4 z-50 p-2 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-all duration-300 ease-in-out ${
          isOpen ? 'left-[238px]' : 'left-4'
        }`}
        title={isOpen ? "Thu gọn menu" : "Mở rộng menu"}
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* SIDEBAR CHÍNH */}
      <div 
        className={`h-full w-64 bg-white flex flex-col select-none transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* HEADER & USER INFO */}
        <div className="p-4 border-b border-slate-200 shrink-0 space-y-3 pr-12">
          <div>
            <h1 className="text-lg font-bold text-slate-800 truncate">Xưởng CK-CNC</h1>
            <p className="text-xs text-slate-500 mt-0.5">ERP/WMS System</p>
          </div>
          
          {user && (
            <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold shadow-sm shrink-0">
                {(user?.fullName || user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-xs font-medium text-slate-800 truncate">
                  {user?.fullName || user?.name || 'Đang tải...'}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                  <span className="text-blue-600 font-medium">MSNV: {user?.msnv || '---'}</span>
                  <span className="text-slate-300">|</span>
                  <span className="truncate">{user?.department || 'Tổ CNC'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MENU NAVIGATION */}
        <div className="p-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          {ERP_NAVIGATION.map((group) => {
            
            // 💡 XỬ LÝ RIÊNG: Nếu là nhóm dạng phẳng không có items (như nút Trang chủ phẳng)
            if (!group.items || group.items.length === 0) {
              const isGroupActive = location.pathname === group.path;
              return (
                <div key={group.id} className="border-b border-slate-100 last:border-0 pb-1">
                  <button
                    onClick={() => {
                      // Click vào Trang chủ -> Gom sạch bách các group khác lại ngay lập tức
                      setOpenGroup(null);
                      setOpenSubMenu(null);
                      if (group.path) navigate(group.path);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all ${
                      isGroupActive
                        ? 'bg-blue-500 text-white font-medium shadow-sm'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <group.icon className={`w-5 h-5 ${isGroupActive ? 'text-white' : 'text-slate-500'}`} />
                    <span className="text-sm font-semibold">{group.label}</span>
                  </button>
                </div>
              );
            }

            // XỬ LÝ NHÓM THÔNG THƯỜNG (Có dropdown các items con)
            const visibleItems = getVisibleItems(group.items);
            if (visibleItems.length === 0) return null;
            
            const isGroupOpen = openGroup === group.id;

            return (
              <div key={group.id} className="border-b border-slate-100 last:border-0 pb-2">
                {/* GROUP HEADER */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <group.icon className="w-5 h-5 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">{group.label}</span>
                  </div>
                  {isGroupOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {/* GROUP CONTENT */}
                {isGroupOpen && (
                  <div className="mt-1 space-y-0.5 pl-2">
                    {visibleItems.map((item) => {
                      const hasChildren = item.children && item.children.length > 0;
                      const isSubMenuOpen = openSubMenu === item.id;
                      const isActive = isItemActive(item);

                      return (
                        <div key={item.id}>
                          {/* MENU ITEM */}
                          <button
                            onClick={() => handleItemClick(item)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                              isActive && !hasChildren
                                ? 'bg-blue-500 text-white'
                                : isActive && hasChildren
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <item.icon className={`w-4 h-4 ${isActive && !hasChildren ? 'text-white' : 'text-slate-400'}`} />
                              <span className="text-sm">{item.label}</span>
                            </div>
                            {hasChildren && (
                              isSubMenuOpen ? 
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : 
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>

                          {/* SUB-MENU ITEMS */}
                          {hasChildren && isSubMenuOpen && (
                            <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-2">
                              {item.children?.map((child) => {
                                const isChildActive = location.pathname === child.path;
                                return (
                                  <button
                                    key={child.id}
                                    onClick={() => child.path && navigate(child.path)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                                      isChildActive
                                        ? 'bg-blue-500 text-white'
                                        : 'hover:bg-slate-50 text-slate-500'
                                    }`}
                                  >
                                    <child.icon className="w-3.5 h-3.5" />
                                    <span>{child.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* LOGOUT BUTTON */}
        <div className="p-3 border-t border-slate-200 bg-white shrink-0">
          <button 
            onClick={logout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-all"
          >
            <LogOut className="w-4 h-4" /> 
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </>
  );
}