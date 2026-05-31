import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, ChevronLeft, Menu, LogOut } from 'lucide-react';
import { ERP_NAVIGATION, isNavItemVisible } from '@/modules/erp/routes';
import { useAuth } from '@/hooks/useAuth';

// Định nghĩa kiểu dữ liệu Props nhận từ Layout tổng truyền xuống
interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  // State quản lý ID của menu đang mở Accordion nội bộ
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Tự động mở menu chứa trang hiện tại khi đường dẫn URL thay đổi
  useEffect(() => {
    const activeGroup = ERP_NAVIGATION.find((group) =>
      group.items.some((item) => item.path === location.pathname)
    );
    setOpenMenuId(activeGroup && activeGroup.id !== 'main' ? activeGroup.id : null);
  }, [location.pathname]);

  const toggleMenu = (menuId: string) => {
    setOpenMenuId((prev) => (prev === menuId ? null : menuId));
  };

  return (
    <>
      {/* NÚT ĐIỀU KHIỂN ĐÓNG/MỞ - Thiết kế trượt đồng bộ theo mép khung Sidebar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-4 z-50 p-2 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-all duration-300 ease-in-out ${
          isOpen ? 'left-[238px]' : 'left-4'
        }`}
        title={isOpen ? "Thu gọn menu" : "Mở rộng menu"}
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* KHUNG SIDEBAR CHÍNH - Chuyển sang h-full để khớp trọn vẹn vào khối cha div w-64/w-0 của MainLayout */}
      <div 
        className={`h-full w-64 bg-white flex flex-col select-none transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* CỤM TIÊU ĐỀ & THÔNG TIN USER */}
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
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-slate-800 truncate">
                    {user?.fullName || user?.name || 'Đang tải...'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                  <span className="text-blue-600 font-medium">Msnv: {user?.msnv || '---'}</span>
                  <span className="text-slate-300">|</span>
                  <span className="truncate">{user?.department || 'Tổ CNC'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DANH SÁCH MENU ĐIỀU HƯỚNG */}
        <div className="p-3 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          {ERP_NAVIGATION.sort((a, b) => {
            const order = ['main', 'manufacturing', 'warehouse', 'reports', 'masterData', 'system', 'account'];
            return order.indexOf(a.id) - order.indexOf(b.id);
          }).map((group) => {
            const isMainMenu = group.id === 'main';
            const mainMenuItem = isMainMenu ? group.items[0] : null;
            const visibleItems = group.items.filter((item) => isNavItemVisible(item, user as any) && item.action !== 'logout');

            if (visibleItems.length === 0 && !isMainMenu) return null;

            const isGroupActive = isMainMenu 
              ? location.pathname === '/' || location.pathname === '/dashboard'
              : visibleItems.some((item) => item.path === location.pathname);

            const isExpanded = !isMainMenu && openMenuId === group.id;

            return (
              <div key={group.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => isMainMenu && mainMenuItem?.path ? navigate(mainMenuItem.path) : toggleMenu(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 transition-all text-left ${
                    isMainMenu && isGroupActive ? 'bg-blue-500 text-white' : 
                    isGroupActive ? 'bg-slate-50 text-blue-600 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <group.icon className={`w-4 h-4 ${isMainMenu && isGroupActive ? 'text-white' : 'text-slate-500'}`} />
                    <span className="text-sm">{group.label}</span>
                  </div>
                  {!isMainMenu && (
                    isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isExpanded && !isMainMenu && (
                  <div className="px-2 pb-2 pt-1 space-y-1 bg-white border-t border-slate-50">
                    {visibleItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => item.path && navigate(item.path)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                          item.path === location.pathname ? 'bg-blue-500 text-white font-medium' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* NÚT ĐĂNG XUẤT */}
        <div className="p-3 border-t border-slate-200 bg-white shrink-0">
          <button 
            onClick={logout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-all"
          >
            <LogOut className="w-4 h-4" /> <span>Đăng xuất tài khoản</span>
          </button>
        </div>
      </div>
    </>
  );
}