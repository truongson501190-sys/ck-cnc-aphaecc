import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import {
  ChevronDown,
  ChevronRight,
  LogOut,
} from 'lucide-react';

import {
  ERP_NAVIGATION,
  isNavItemVisible,
} from '@/modules/erp/routes';

import { useAuth } from '@/hooks/useAuth';

export function Sidebar() {

  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout } = useAuth();

  // MENU ĐANG MỞ
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  // TỰ MỞ MENU KHI ĐANG Ở TRANG CON
  useEffect(() => {

    ERP_NAVIGATION.forEach((group) => {

      const hasActiveChild = group.items.some(
        (item) => item.path === location.pathname
      );

      if (hasActiveChild && group.id !== 'main') {

        setOpenMenus((prev) => {

          if (!prev.includes(group.id)) {
            return [...prev, group.id];
          }

          return prev;
        });
      }
    });

  }, [location.pathname]);

  // ĐÓNG / MỞ MENU
  const toggleMenu = (menuId: string) => {

    setOpenMenus((prev) =>

      prev.includes(menuId)
        ? prev.filter((id) => id !== menuId)
        : [...prev, menuId]

    );
  };

  return (

    <div className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col">

      {/* HEADER */}
      <div className="p-4 border-b border-slate-200 shrink-0 space-y-3">

        <div>
          <h1 className="text-lg font-bold text-slate-800">
            ERP/WMS CNC
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            Quản lý xưởng cơ khí
          </p>
        </div>

        {/* USER INFO */}
        {user && (

          <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100">

            {/* AVATAR */}
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold shadow-sm shrink-0">

              {(user?.name || user?.username || 'U')
                .charAt(0)
                .toUpperCase()}

            </div>

            {/* INFO */}
            <div className="flex flex-col min-w-0 flex-1 justify-center">

              {/* NAME */}
              <div className="flex items-center gap-1">

                <span className="text-xs font-medium text-slate-800 truncate max-w-[140px]">

                  {user?.name ||
                    user?.fullName ||
                    user?.username ||
                    'Đang tải...'}

                </span>

                {user?.role === 'admin' && (

                  <span className="px-1 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-600 rounded shrink-0">
                    A
                  </span>

                )}

              </div>

              {/* MSNv + PHÒNG BAN */}
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 flex-wrap">

                <span className="text-blue-600">
                  Msnv:
                  {' '}
                  {user?.Mnv ||
                    user?.mnv ||
                    user?.username ||
                    user?.employeeCode ||
                    '---'}
                </span>

                <span className="text-slate-300">
                  |
                </span>

                <span className="text-slate-600">

                  {user?.department ||
                    user?.boPhan ||
                    user?.toBophan ||
                    'Tổ CNC'}

                </span>

              </div>

            </div>

          </div>

        )}

      </div>

      {/* MENU */}
      <div className="p-3 space-y-2 flex-1 overflow-y-auto">

        {ERP_NAVIGATION

          .sort((a, b) => {

            // THỨ TỰ MENU
            const order = [

              'main',            // Trang chủ
              'manufacturing',   // Sản xuất
              'warehouse',       // Kho bãi
              'reports',         // Báo cáo
              'masterData',      // Danh mục
              'system',          // Hệ thống
              'account',         // Tài khoản

            ];

            return order.indexOf(a.id) - order.indexOf(b.id);

          })

          .map((group) => {

            const isMainMenu = group.id === 'main';

            const mainMenuItem = isMainMenu
              ? group.items[0]
              : null;

            // LỌC THEO QUYỀN
            const visibleItems = group.items.filter(

              (item) =>

                isNavItemVisible(item, user) &&
                item.action !== 'logout'

            );

            // ẨN MENU KHÔNG CÓ QUYỀN
            if (visibleItems.length === 0 && !isMainMenu) {
              return null;
            }

            // ACTIVE
            const isGroupActive = isMainMenu

              ? location.pathname === '/' ||
                location.pathname === '/dashboard'

              : visibleItems.some(
                  (item) => item.path === location.pathname
                );

            // ĐANG MỞ
            const isExpanded =

              !isMainMenu &&
              openMenus.includes(group.id);

            return (

              <div
                key={group.id}
                className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm"
              >

                {/* MENU CHA */}
                <button

                  onClick={() => {

                    // TRANG CHỦ KHÔNG ĐÓNG MỞ
                    if (isMainMenu && mainMenuItem?.path) {

                      navigate(mainMenuItem.path);

                    }

                    // MENU KHÁC
                    else {

                      toggleMenu(group.id);

                    }

                  }}

                  className={`
                    w-full
                    flex
                    items-center
                    justify-between
                    px-3
                    py-2.5
                    transition-all
                    text-left

                    ${
                      isMainMenu && isGroupActive

                        ? 'bg-blue-500 text-white font-medium'

                        : isMainMenu

                          ? 'hover:bg-blue-500 hover:text-white text-slate-700'

                          : isGroupActive

                            ? 'bg-slate-50 text-blue-600 font-semibold'

                            : 'hover:bg-slate-50 text-slate-700'
                    }
                  `}
                >

                  {/* ICON + TEXT */}
                  <div className="flex items-center gap-2">

                    <group.icon

                      className={`
                        w-4 h-4

                        ${
                          isMainMenu && isGroupActive

                            ? 'text-white'

                            : isMainMenu

                              ? 'text-slate-500'

                              : isGroupActive

                                ? 'text-blue-600'

                                : 'text-slate-500'
                        }
                      `}
                    />

                    <span className="text-sm">
                      {group.label}
                    </span>

                  </div>

                  {/* ICON ĐÓNG MỞ */}
                  {!isMainMenu && (

                    isExpanded

                      ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )

                      : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )

                  )}

                </button>

                {/* MENU CON */}
                {isExpanded && !isMainMenu && (

                  <div className="px-2 pb-2 pt-1 space-y-1 bg-white border-t border-slate-50">

                    {visibleItems.map((item) => {

                      const active =
                        item.path === location.pathname;

                      return (

                        <button
                          key={item.id}

                          onClick={() => {

                            if (item.path) {
                              navigate(item.path);
                            }

                          }}

                          className={`
                            w-full
                            flex
                            items-center
                            gap-2
                            px-3
                            py-2
                            rounded-lg
                            text-sm
                            transition-all

                            ${
                              active

                                ? 'bg-blue-500 text-white font-medium shadow-sm'

                                : 'hover:bg-slate-100 text-slate-600'
                            }
                          `}
                        >

                          <item.icon
                            className={`
                              w-4 h-4

                              ${
                                active
                                  ? 'text-white'
                                  : 'text-slate-400'
                              }
                            `}
                          />

                          <span>
                            {item.label}
                          </span>

                        </button>

                      );
                    })}

                  </div>

                )}

              </div>

            );
          })}

      </div>

      {/* ĐĂNG XUẤT */}
      <div className="p-3 border-t border-slate-200 bg-white shrink-0">

        <button

          onClick={logout}

          className="
            w-full
            flex
            items-center
            justify-center
            gap-2
            px-4
            py-2.5
            rounded-xl
            text-sm
            font-medium
            text-white
            bg-red-500
            hover:bg-red-600
            active:bg-red-700
            transition-all
            shadow-sm
          "
        >

          <LogOut className="w-4 h-4" />

          <span>
            Đăng xuất tài khoản
          </span>

        </button>

      </div>

    </div>
  );
}