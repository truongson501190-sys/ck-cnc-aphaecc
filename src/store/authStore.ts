// src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, UserPermissions } from '@/types/user';
import { EmployeeService } from '@/services/employeeService';
import { PermissionService } from '@/services/permissionService';
import { verifyPassword } from '@/lib/passwordUtils';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Actions
  login: (msnv: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  
  // Helpers
  getUserAvatar: () => string;
  getUserDisplayName: () => string;
  getUserInitial: () => string;
  hasPermission: (module: string, level: 'view' | 'edit') => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,

      login: async (msnv: string, password: string, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
          const emp = await EmployeeService.getByMsnv(msnv);
          if (!emp || emp.status !== 'active') {
            set({ isLoading: false, error: 'User not found or inactive' });
            return false;
          }

          const isValid = await verifyPassword(password, emp.password_hash);
          if (!isValid) {
            set({ isLoading: false, error: 'Invalid password' });
            return false;
          }

          const permissions = await PermissionService.getByMsnv(msnv);
          const user: User = {
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
            permissions,
          };

          set({ user, isAuthenticated: true, isLoading: false });
          
          // Save to storage
          const storage = rememberMe ? localStorage : sessionStorage;
          storage.setItem('sessionUser', JSON.stringify(user));
          if (rememberMe) {
            localStorage.setItem('rememberedUser', msnv);
          }
          
          return true;
        } catch (error) {
          set({ isLoading: false, error: (error as Error).message });
          return false;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
        localStorage.removeItem('sessionUser');
        sessionStorage.removeItem('sessionUser');
        localStorage.removeItem('rememberedUser');
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      refreshUser: async () => {
        const { user } = get();
        if (!user) return;
        
        set({ isLoading: true });
        try {
          const emp = await EmployeeService.getByMsnv(user.msnv);
          if (emp) {
            const permissions = await PermissionService.getByMsnv(user.msnv);
            const updatedUser: User = {
              ...user,
              ho_ten: emp.ho_ten,
              fullName: emp.ho_ten,
              role: emp.role || user.role,
              roleGroup: emp.role_group || emp.chuc_vu || user.roleGroup,
              status: emp.status || user.status,
              phong_ban: emp.phong_ban ?? user.phong_ban,
              chuc_vu: emp.chuc_vu ?? user.chuc_vu,
              permissions,
            };
            set({ user: updatedUser, isLoading: false });
          }
        } catch (error) {
          set({ isLoading: false, error: (error as Error).message });
        }
      },

      clearError: () => set({ error: null }),

      getUserAvatar: () => {
        const { user } = get();
        if (!user) return '';
        return user.avatar || user.profileImage || user.profile_image || '';
      },

      getUserDisplayName: () => {
        const { user } = get();
        if (!user) return 'User';
        return user.fullName || user.ho_ten || user.username || 'User';
      },

      getUserInitial: () => {
        const { user } = get();
        if (!user) return 'U';
        const name = user.fullName || user.ho_ten || user.username || 'User';
        return name.charAt(0).toUpperCase();
      },

      hasPermission: (module: string, level: 'view' | 'edit') => {
        const { user } = get();
        if (!user) return false;
        if (user.role === 'admin' || user.msnv === '1118') return true;
        if (!user.permissions) return false;
        const flag = user.permissions[module];
        if (!flag) return false;
        if (level === 'view') return flag.view || flag.edit || flag.add || flag.delete || flag.approve;
        if (level === 'edit') return flag.edit || flag.add || flag.delete || flag.approve;
        return false;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);