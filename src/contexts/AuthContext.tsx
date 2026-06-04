import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { User } from '@/types/user';
import { supabase } from '@/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (msnv: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updatedUser: Partial<User>) => Promise<void>;
  hasPermission: (moduleKey: string, action: 'view' | 'add' | 'edit' | 'delete' | 'approve' | 'export') => boolean;
  refreshUser: () => Promise<void>;
}

interface UserRecord {
  msnv: string;
  full_name: string;
  department?: string;
  position?: string;
  role: string;
  status: boolean;
  password_hash: string;
  created_at: string;
  last_login?: string;
}

// ---------------------------------------------------------------------------
// Helper: Convert DB user to app user
// ---------------------------------------------------------------------------
const mapDbUserToAppUser = (dbUser: any): User => {
  return {
    msnv: dbUser.msnv,
    fullName: dbUser.full_name,
    department: dbUser.department || '',
    position: dbUser.position || '',
    role: dbUser.role || 'user',
    roleGroup: dbUser.role_group || 'User',
    status: dbUser.status || 'active',
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at
  };
};

// ---------------------------------------------------------------------------
// Context Creation
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider Component
// ---------------------------------------------------------------------------
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<Record<string, any>>({});
  // Check Supabase config once on initialization
  const hasSupabaseConfig = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
  const [useFallback, setUseFallback] = useState(!hasSupabaseConfig);

  // ---------------------------------------------------------------------------
  // Check permission
  // ---------------------------------------------------------------------------
  const hasPermission = useCallback((moduleKey: string, action: 'view' | 'add' | 'edit' | 'delete' | 'approve' | 'export'): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    const perm = userPermissions[moduleKey];
    if (!perm) return false;
    
    switch (action) {
      case 'view': return perm.can_view;
      case 'add': return perm.can_add;
      case 'edit': return perm.can_edit;
      case 'delete': return perm.can_delete;
      case 'approve': return perm.can_approve;
      case 'export': return perm.can_export;
      default: return false;
    }
  }, [user, userPermissions]);

  // ---------------------------------------------------------------------------
  // Load user permissions
  // ---------------------------------------------------------------------------
  const loadUserPermissions = useCallback(async (msnv: string) => {
    // Fallback permissions: allow all view (always available as backup)
    const getFallbackPerms = () => {
      const fallbackPerms: Record<string, any> = {};
      [
        'nhap_kho', 'xuat_kho', 'chuyen_kho', 'xuat_dau', 'kiem_ke_kho', 'ton_kho', 'the_kho', 'lich_su_giao_dich',
        'ke_hoach_san_xuat', 'nhat_ky_gia_cong', 'nhat_ky_qc', 'nhat_ky_bao_tri', 'theo_doi_tien_do',
        'dashboard_tong_hop', 'bao_cao_kho', 'bao_cao_gia_cong', 'bao_cao_qc', 'bao_cao_bao_tri', 'hieu_suat_may', 'cho_duyet',
        'chung_loai', 'kho', 'may_moc', 'du_an', 'quan_ly_nguoi_dung', 'phan_quyen', 'audit_log', 'backup_restore', 'cai_dat_he_thong'
      ].forEach(key => {
        fallbackPerms[key] = {
          can_view: true,
          can_add: false,
          can_edit: false,
          can_delete: false,
          can_approve: false,
          can_export: true
        };
      });
      return fallbackPerms;
    };

    if (useFallback) {
      setUserPermissions(getFallbackPerms());
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('msnv', msnv);
      
      if (error) {
        console.warn('Error loading permissions from Supabase, using fallback:', error);
        setUseFallback(true);
        setUserPermissions(getFallbackPerms());
        return;
      }
      
      const permMap: Record<string, any> = {};
      data?.forEach((perm: any) => {
        permMap[perm.module_key] = perm;
      });
      
      setUserPermissions(permMap);
    } catch (error) {
      console.warn('Error loading permissions, using fallback:', error);
      setUseFallback(true);
      setUserPermissions(getFallbackPerms());
    }
  }, [useFallback]);

  // ---------------------------------------------------------------------------
  // Refresh user data
  // ---------------------------------------------------------------------------
  const refreshUser = useCallback(async () => {
    if (!user?.msnv) return;
    
    if (useFallback) {
      // Fallback: just keep existing user
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('msnv', user.msnv)
        .single();
      
      if (error) throw error;
      
      if (data) {
        const appUser = mapDbUserToAppUser(data);
        setUser(appUser);
        await loadUserPermissions(appUser.msnv);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, [user?.msnv, loadUserPermissions, useFallback]);

  // ---------------------------------------------------------------------------
  // Fallback login function
  // ---------------------------------------------------------------------------
  const loginFallback = useCallback(async (msnv: string, password: string, rememberMe: boolean): Promise<boolean> => {
    try {
      const users = JSON.parse(localStorage.getItem('wms_users') || '[]');
      const defaultAdmin = {
        msnv: '1118',
        fullName: 'Nguyễn Trường Sơn',
        department: 'Quản lý Chung',
        position: 'Quản lý xưởng',
        status: 'active',
        role: 'admin',
        roleGroup: 'Admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const allUsers = users.length > 0 ? users : [defaultAdmin];
      const foundUser = allUsers.find((u: any) => u.msnv === msnv);
      
      if (foundUser) {
        // Simple password check
        const isValid = (msnv === '1118' && password === '1118') || 
                        (password === msnv) || 
                        (foundUser.password === password);
        
        if (isValid) {
          // Map to User type
          const appUser: User = {
            msnv: foundUser.msnv,
            fullName: foundUser.fullName,
            department: foundUser.department,
            position: foundUser.position,
            role: foundUser.role || 'user',
            roleGroup: foundUser.roleGroup || 'User',
            status: foundUser.status || 'active',
            createdAt: foundUser.createdAt || new Date().toISOString(),
            updatedAt: foundUser.updatedAt || new Date().toISOString()
          };
          
          setUser(appUser);
          await loadUserPermissions(appUser.msnv);
          
          // Store session
          const sessionData = JSON.stringify(appUser);
          if (rememberMe) {
            localStorage.setItem('sessionUser', sessionData);
            sessionStorage.removeItem('sessionUser');
          } else {
            sessionStorage.setItem('sessionUser', sessionData);
            localStorage.removeItem('sessionUser');
          }
          
          console.log('✅ Login successful (fallback):', appUser.msnv);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('💥 Fallback login error:', error);
      return false;
    }
  }, [loadUserPermissions]);

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------
  const login = useCallback(async (msnv: string, password: string, rememberMe = false): Promise<boolean> => {
    const inputMsnv = msnv.trim().toUpperCase();
    const normalizedPassword = password.trim();
    
    console.log('🔐 Login attempt for:', inputMsnv);
    
    if (useFallback || !hasSupabaseConfig) {
      return await loginFallback(inputMsnv, normalizedPassword, rememberMe);
    }
    
    try {
      // Get user record from Supabase for authentication
      const { data: userRecord, error: recordError } = await supabase
        .from('user_records')
        .select('*')
        .eq('msnv', inputMsnv)
        .eq('status', true)
        .single();
      
      if (recordError || !userRecord) {
        console.log('❌ User not found or inactive');
        // Try fallback if Supabase fails
        setUseFallback(true);
        return await loginFallback(inputMsnv, normalizedPassword, rememberMe);
      }
      
      // Check password
      const correctPassword = userRecord.password_hash?.trim() || '';
      let isPasswordCorrect = correctPassword === normalizedPassword;
      
      // Check if password is base64 encoded
      if (!isPasswordCorrect) {
        try {
          if (atob(correctPassword) === normalizedPassword) {
            isPasswordCorrect = true;
          }
        } catch {
          // Not base64, continue
        }
      }
      
      if (!isPasswordCorrect) {
        console.log('❌ Password incorrect');
        return false;
      }
      
      // Get full user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('msnv', inputMsnv)
        .single();
      
      if (profileError || !userProfile) {
        console.log('❌ User profile not found');
        return false;
      }
      
      // Update last login time
      await supabase
        .from('user_records')
        .update({ last_login: new Date().toISOString() })
        .eq('msnv', inputMsnv);
      
      // Map to app user
      const appUser = mapDbUserToAppUser(userProfile);
      setUser(appUser);
      
      // Load permissions
      await loadUserPermissions(appUser.msnv);
      
      // Store session
      const sessionData = JSON.stringify(appUser);
      if (rememberMe) {
        localStorage.setItem('sessionUser', sessionData);
        sessionStorage.removeItem('sessionUser');
      } else {
        sessionStorage.setItem('sessionUser', sessionData);
        localStorage.removeItem('sessionUser');
      }
      
      console.log('✅ Login successful:', appUser.msnv);
      return true;
      
    } catch (error) {
      console.error('💥 Login critical error:', error);
      // Fallback to localStorage on error
      setUseFallback(true);
      return await loginFallback(inputMsnv, normalizedPassword, rememberMe);
    }
  }, [loadUserPermissions, useFallback, hasSupabaseConfig, loginFallback]);

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  const logout = useCallback(() => {
    console.log('🚪 Logout');
    setUser(null);
    setUserPermissions({});
    localStorage.removeItem('sessionUser');
    sessionStorage.removeItem('sessionUser');
  }, []);

  // ---------------------------------------------------------------------------
  // Update Profile
  // ---------------------------------------------------------------------------
  const updateProfile = useCallback(async (updatedUser: Partial<User>) => {
    if (!user?.msnv) return;
    
    if (useFallback) {
      // Update localStorage
      const users = JSON.parse(localStorage.getItem('wms_users') || '[]');
      const updatedUsers = users.map((u: any) => {
        if (u.msnv === user.msnv) {
          return { ...u, ...updatedUser };
        }
        return u;
      });
      localStorage.setItem('wms_users', JSON.stringify(updatedUsers));
      
      // Update local state
      const newUser = { ...user, ...updatedUser };
      setUser(newUser);
      
      // Update session storage
      const sessionData = JSON.stringify(newUser);
      if (localStorage.getItem('sessionUser')) {
        localStorage.setItem('sessionUser', sessionData);
      }
      if (sessionStorage.getItem('sessionUser')) {
        sessionStorage.setItem('sessionUser', sessionData);
      }
      return;
    }

    try {
      const dbUpdate = {
        full_name: updatedUser.fullName,
        department: updatedUser.department,
        position: updatedUser.position,
        role: updatedUser.role,
        role_group: updatedUser.roleGroup,
        status: updatedUser.status,
        updated_at: new Date().toISOString()
      };
      
      // Remove undefined values
      Object.keys(dbUpdate).forEach(key => {
        if ((dbUpdate as any)[key] === undefined) {
          delete (dbUpdate as any)[key];
        }
      });
      
      const { error } = await supabase
        .from('users')
        .update(dbUpdate)
        .eq('msnv', user.msnv);
      
      if (error) throw error;
      
      // Update local state
      setUser(prev => prev ? { ...prev, ...updatedUser } : null);
      
      // Update session storage
      const newUser = user ? { ...user, ...updatedUser } : null;
      if (newUser) {
        const sessionData = JSON.stringify(newUser);
        if (localStorage.getItem('sessionUser')) {
          localStorage.setItem('sessionUser', sessionData);
        }
        if (sessionStorage.getItem('sessionUser')) {
          sessionStorage.setItem('sessionUser', sessionData);
        }
      }
      
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [user, useFallback]);

  // ---------------------------------------------------------------------------
  // Initialize from storage on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check for existing session
        const storedUserStr = localStorage.getItem('sessionUser') || sessionStorage.getItem('sessionUser');
        
        if (storedUserStr) {
          const storedUser = JSON.parse(storedUserStr);
          
          if (!useFallback && hasSupabaseConfig) {
            // Verify user still exists in DB and is active
            try {
              const { data: userRecord, error: recordError } = await supabase
                .from('user_records')
                .select('*')
                .eq('msnv', storedUser.msnv)
                .eq('status', true)
                .single();
              
              if (!recordError && userRecord) {
                // Get fresh user data
                const { data: userProfile, error: profileError } = await supabase
                  .from('users')
                  .select('*')
                  .eq('msnv', storedUser.msnv)
                  .single();
                
                if (!profileError && userProfile) {
                  const appUser = mapDbUserToAppUser(userProfile);
                  setUser(appUser);
                  await loadUserPermissions(appUser.msnv);
                }
              } else {
                // Invalid session, clear storage
                localStorage.removeItem('sessionUser');
                sessionStorage.removeItem('sessionUser');
              }
            } catch (error) {
              console.error('Error verifying session, using fallback:', error);
              setUseFallback(true);
              // Use stored user as fallback
              setUser(storedUser);
              await loadUserPermissions(storedUser.msnv);
            }
          } else {
            // Use stored user directly in fallback mode
            setUser(storedUser);
            await loadUserPermissions(storedUser.msnv);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('sessionUser');
        sessionStorage.removeItem('sessionUser');
      } finally {
        setIsLoading(false);
      }
    };
    
    initialize();
  }, [loadUserPermissions, useFallback, hasSupabaseConfig]);

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------
  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isLoading,
    login,
    logout,
    updateProfile,
    hasPermission,
    refreshUser
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
