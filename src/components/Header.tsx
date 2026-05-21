import React, { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, User, ChevronDown, Settings, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { SyncStatus } from './SyncStatus';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = useCallback(() => {
    logout();
    toast.success('Đã đăng xuất thành công');
  }, [logout]);

  const getRoleIcon = useCallback((role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'manager':
        return <Users className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-green-500" />;
    }
  }, []);

  const getRoleLabel = useCallback((role: string) => {
    switch (role) {
      case 'admin':
        return 'Quản trị viên';
      case 'manager':
        return 'Quản lý';
      default:
        return 'Nhân viên';
    }
  }, []);

  const userName = useMemo(() => user?.name || user?.fullName || 'User', [user?.name, user?.fullName]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hệ thống Quản lý Kho
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Quản lý hiệu quả - Tối ưu 
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <SyncStatus compact />

          {user && (
            <>
              {/* User Menu Button and Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 bg-gray-50 hover:bg-gray-100 rounded-lg px-4 py-2 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(user.role)}
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {userName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getRoleLabel(user.role)}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {/* User Profile Section */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          {getRoleIcon(user.role)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{userName}</div>
                          {(user.username || user.msnv) && (
                            <div className="text-sm text-gray-500">@{user.username || user.msnv}</div>
                          )}
                          {user.email && (
                            <div className="text-xs text-gray-400">{user.email}</div>
                          )}
                        </div>
                      </div>
                      {user.department && (
                        <div className="mt-2 text-xs text-gray-500">
                          Phòng ban: {user.department}
                        </div>
                      )}
                      {user.lastLogin && (
                        <div className="mt-1 text-xs text-gray-400">
                          Đăng nhập lúc: {new Date(user.lastLogin).toLocaleString('vi-VN')}
                        </div>
                      )}
                    </div>

                    {/* Settings Button */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          // Add settings functionality here if needed
                        }}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Cài đặt</span>
                      </button>
                    </div>

                    {/* Logout Button */}
                    <div className="border-t border-gray-100 py-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Backdrop Overlay - Outside relative container */}
              {showUserMenu && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
