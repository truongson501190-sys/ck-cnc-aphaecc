// src/contexts/AuthContext.tsx
import * as React from 'react';
const { createContext, useState, useCallback, useEffect } = React;
type ReactNode = React.ReactNode;
import type { User, UserPermissions } from '../types/user';
import { hasPermissionFlag } from '../lib/permissions';
import { verifyPassword } from '../lib/passwordUtils';
import { EmployeeService, type Employee } from '../services/employeeService';
import { PermissionService } from '../services/permissionService';

// Map Employee to User
function mapEmployeeToUser(emp: Employee, permissions: UserPermissions): User {
  return {
    msnv: emp.msnv,
    fullName: emp.ho_ten,
    role: emp.role || 'user',
    roleGroup: emp.role_group || emp.chuc_vu || 'User',
    status: emp.status || 'active',
    ho_ten: emp.ho_ten,
    phong_ban: emp.phong_ban ?? undefined,
    chuc_vu: emp.chuc_vu ?? undefined,
    username: emp.ho_ten,
    email: emp.email || undefined,
    avatar: (emp as any).avatar || (emp as any).profile_image || undefined,
    profileImage: (emp as any).profile_image || (emp as any).avatar || undefined,
    profile_image: (emp as any).profile_image || (emp as any).avatar || undefined,
    permissions
  };
}

// ================= CONTEXT =================
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (msnv: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updatedUser: Partial<User>) => void;
  hasPermission: (module: string, level: 'view' | 'edit') => boolean;
  refreshUser: () => Promise<void>;
  getUserAvatar: () => string;
  getUserDisplayName: () => string;
  getUserInitial: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ================= PROVIDER =================
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user permissions from Supabase
  const loadPermissions = useCallback(async (msnv: string): Promise<UserPermissions> => {
    const perms = await PermissionService.getByMsnv(msnv);
    console.log('📥 loadPermissions:', { msnv, perms: JSON.stringify(perms, null, 2) });
    return perms;
  }, []);

  // Refresh user data and permissions from Supabase
  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const emp = await EmployeeService.getByMsnv(user.msnv);
      if (emp) {
        const perms = await loadPermissions(user.msnv);
        const userData = mapEmployeeToUser(emp, perms);
        setUser(userData);
        const storage = localStorage.getItem('rememberedUser') ? localStorage : sessionStorage;
        storage.setItem('sessionUser', JSON.stringify(userData));
      }
    } catch (e) {
      console.error('❌ Failed to refresh user:', e);
    }
  }, [user, loadPermissions]);

  // Load session user on mount
  useEffect(() => {
    const init = async () => {
      try {
        const storedMsnv = localStorage.getItem('rememberedUser');
        const storedSession = localStorage.getItem('sessionUser') || sessionStorage.getItem('sessionUser');

        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          const emp = await EmployeeService.getByMsnv(parsed.msnv);
          if (emp && emp.status === 'active') {
            const perms = await loadPermissions(parsed.msnv);
            const userData = mapEmployeeToUser(emp, perms);
            setUser(userData);
            console.log('✅ User loaded:', userData.msnv);
          } else {
            localStorage.removeItem('sessionUser');
            sessionStorage.removeItem('sessionUser');
          }
        }
      } catch (e) {
        console.error('❌ Init error:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [loadPermissions]);

  // ===== LOGIN =====
  const login = useCallback(
    async (msnv: string, password: string, rememberMe = false): Promise<boolean> => {
      console.log('🔐 Login attempt:', msnv);
      try {
        const emp = await EmployeeService.getByMsnv(msnv);
        if (!emp || emp.status !== 'active') {
          console.warn('❌ User not found or inactive');
          return false;
        }

        const ok = await verifyPassword(password, emp.password_hash);
        if (!ok) {
          console.warn('❌ Invalid password');
          return false;
        }

        const perms = await loadPermissions(msnv);
        const userData = mapEmployeeToUser(emp, perms);

        setUser(userData);
        const storage = rememberMe ? localStorage : sessionStorage;

        if (rememberMe) {
          localStorage.setItem('rememberedUser', msnv);
        } else {
          localStorage.removeItem('rememberedUser');
        }

        storage.setItem('sessionUser', JSON.stringify(userData));
        console.log('✅ Login success');
        return true;
      } catch (e) {
        console.error('❌ Login error:', e);
        return false;
      }
    },
    [loadPermissions]
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('sessionUser');
    sessionStorage.removeItem('sessionUser');
    console.log('🚪 Logout');
  }, []);

  const updateProfile = useCallback((updated: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updated } : null);
  }, []);

  const hasPermission = useCallback((module: string, level: 'view' | 'edit') => {
    if (!user) {
      console.log('❌ hasPermission: User not logged in');
      return false;
    }
    if (user.role === 'admin' || user.msnv === '1118') {
      console.log('✅ hasPermission: Admin or super user');
      return true;
    }
    if (!user.permissions) {
      console.log('❌ hasPermission: No permissions found');
      return false;
    }
    const modulePermissions = user.permissions[module];
    const result = hasPermissionFlag(modulePermissions as any, level);
    console.log(`🔍 hasPermission(${module}, ${level}):`, JSON.stringify({ modulePermissions }, null, 2), 'result:', result);
    return result;
  }, [user]);

  // Helper functions
  const getUserAvatar = useCallback((): string => {
    if (!user) return '';
    return user.avatar || user.profileImage || user.profile_image || '';
  }, [user]);

  const getUserDisplayName = useCallback((): string => {
    if (!user) return 'User';
    return user.fullName || user.ho_ten || user.username || 'User';
  }, [user]);

  const getUserInitial = useCallback((): string => {
    if (!user) return 'U';
    const name = user.fullName || user.ho_ten || user.username || 'User';
    return name.charAt(0).toUpperCase();
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.msnv === '1118',
    login,
    logout,
    updateProfile,
    hasPermission,
    refreshUser,
    getUserAvatar,
    getUserDisplayName,
    getUserInitial,
  };

  if (loading) {
    return React.createElement('div', { className: 'flex items-center justify-center h-screen' },
      React.createElement('div', { className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600' })
    );
  }

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};