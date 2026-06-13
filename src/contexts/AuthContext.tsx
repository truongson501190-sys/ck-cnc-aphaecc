import * as React from 'react';
const { createContext, useState, useCallback, useEffect } = React;
type ReactNode = React.ReactNode;
import { supabase } from '../supabase';
import type { User } from '../types/user';
import { DEFAULT_PERMISSIONS } from '../types/user';
import { dataSync } from '../lib/dataSync';

type UserRecord = {
  id: string;
  msnv: string;
  fullName: string;
  department: string;
  position: string;
  role: string;
  status: boolean;
  passwordHash: string;
  createdAt: string;
  lastLogin?: string | Date;
  [key: string]: unknown;
};

function parseJsonArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ================= PROVIDER =================
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from storage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        // ... existing seeding logic ...
        const userRecordsStr = localStorage.getItem('userRecords');
        const usersStr = localStorage.getItem('users');
        
        // Chỉ seed dữ liệu mặc định khi localStorage chưa có dữ liệu
        console.log('📦 Đảm bảo dữ liệu mặc định...');
        const forceReset = false; // set false để giữ lại dữ liệu đã có
        
        if (!userRecordsStr || !usersStr || forceReset) {
          console.log('📦 Initializing localStorage with default data...');
          
          const defaultUsers = [
            {
              msnv: '1118',
              fullName: 'Nguyễn Trường Sơn',
              department: 'Admin',
              position: 'Quản trị viên hệ thống',
              role: 'admin',
              status: 'active',
              permissions: {
                nhap_kho: true,
                xuat_kho: true,
                chuyen_kho: true,
                xuat_dau: true,
                kiem_ke_kho: true,
                ton_kho: true,
                the_kho: true,
                lich_su_giao_dich: true,
                ke_hoach_san_xuat: true,
                nhat_ky_gia_cong: true,
                nhat_ky_qc: true,
                nhat_ky_bao_tri: true,
                theo_doi_tien_do: true,
                dashboard_tong_hop: true,
                bao_cao_kho: true,
                bao_cao_gia_cong: true,
                bao_cao_qc: true,
                bao_cao_bao_tri: true,
                hieu_suat_may: true,
                cho_duyet: true,
                chung_loai: true,
                kho: true,
                may_moc: true,
                du_an: true,
                quan_ly_nguoi_dung: true,
                phan_quyen: true,
                audit_log: true,
                backup_restore: true,
                cai_dat_he_thong: true,
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ];

          const defaultUserRecords = [
            {
              id: '1',
              msnv: '1118',
              fullName: 'Nguyễn Trường Sơn',
              department: 'Admin',
              position: 'Quản trị viên hệ thống',
              role: 'admin',
              status: true,
              passwordHash: 'admin123', // plain text for initial local check
              createdAt: new Date().toISOString()
            }
          ];

          localStorage.setItem('users', JSON.stringify(defaultUsers));
          localStorage.setItem('userRecords', JSON.stringify(defaultUserRecords));
          
          // 🔑 SEED PERMISSIONS CHO TẤT CẢ USERS
          defaultUsers.forEach(user => {
            localStorage.setItem(
              `user_permissions_${user.msnv}`,
              JSON.stringify(user.permissions || DEFAULT_PERMISSIONS)
            );
          });
          
          console.log('✅ Default data initialized with permissions');
        } else {
          // If storage exists, ensure 1118 exists and has permissions
          const userRecords = parseJsonArray<UserRecord>(userRecordsStr);
          const users = parseJsonArray<User>(usersStr);
          
          // Seed permissions cho tất cả existing users
          users.forEach(user => {
            const existingPerms = localStorage.getItem(`user_permissions_${user.msnv}`);
            if (!existingPerms) {
              localStorage.setItem(
                `user_permissions_${user.msnv}`,
                JSON.stringify(user.permissions || DEFAULT_PERMISSIONS)
              );
              console.log('📋 Seeded permissions for:', user.msnv);
            }
          });
          if (!userRecords.find((r) => r.msnv === '1118')) {
            console.log('📦 Adding missing admin user to local storage...');
            const adminRecord: UserRecord = {
              id: 'admin-' + Date.now(),
              msnv: '1118',
              fullName: 'Nguyễn Trường Sơn',
              department: 'Admin',
              position: 'Quản trị viên hệ thống',
              role: 'admin',
              status: true,
              passwordHash: 'admin123',
              createdAt: new Date().toISOString()
            };
            userRecords.push(adminRecord);
            localStorage.setItem('userRecords', JSON.stringify(userRecords));
            
            const users = parseJsonArray<User>(usersStr);
            if (!users.find((u) => u.msnv === '1118')) {
              users.push({
                msnv: '1118',
                fullName: 'Nguyễn Trường Sơn',
                department: 'Admin',
                position: 'Quản trị viên hệ thống',
                role: 'admin',
                roleGroup: 'Admin',
                status: 'active',
                permissions: {
                  nhap_kho: true,
                  xuat_kho: true,
                  chuyen_kho: true,
                  xuat_dau: true,
                  kiem_ke_kho: true,
                  ton_kho: true,
                  the_kho: true,
                  lich_su_giao_dich: true,
                  ke_hoach_san_xuat: true,
                  nhat_ky_gia_cong: true,
                  nhat_ky_qc: true,
                  nhat_ky_bao_tri: true,
                  theo_doi_tien_do: true,
                  dashboard_tong_hop: true,
                  bao_cao_kho: true,
                  bao_cao_gia_cong: true,
                  bao_cao_qc: true,
                  bao_cao_bao_tri: true,
                  hieu_suat_may: true,
                  cho_duyet: true,
                  chung_loai: true,
                  kho: true,
                  may_moc: true,
                  du_an: true,
                  quan_ly_nguoi_dung: true,
                  phan_quyen: true,
                  audit_log: true,
                  backup_restore: true,
                  cai_dat_he_thong: true,
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              localStorage.setItem('users', JSON.stringify(users));
              
              // 🔑 Seed admin permissions
              localStorage.setItem(
                'user_permissions_1118',
                JSON.stringify({
                  nhap_kho: true,
                  xuat_kho: true,
                  chuyen_kho: true,
                  xuat_dau: true,
                  kiem_ke_kho: true,
                  ton_kho: true,
                  the_kho: true,
                  lich_su_giao_dich: true,
                  ke_hoach_san_xuat: true,
                  nhat_ky_gia_cong: true,
                  nhat_ky_qc: true,
                  nhat_ky_bao_tri: true,
                  theo_doi_tien_do: true,
                  dashboard_tong_hop: true,
                  bao_cao_kho: true,
                  bao_cao_gia_cong: true,
                  bao_cao_qc: true,
                  bao_cao_bao_tri: true,
                  hieu_suat_may: true,
                  cho_duyet: true,
                  chung_loai: true,
                  kho: true,
                  may_moc: true,
                  du_an: true,
                  quan_ly_nguoi_dung: true,
                  phan_quyen: true,
                  audit_log: true,
                  backup_restore: true,
                  cai_dat_he_thong: true,
                })
              );
              console.log('📋 Admin permissions seeded');
            }
          }
        }

        // Try localStorage first (persistent login)
        const storedUser = localStorage.getItem('sessionUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          
          // Refresh permissions từ localStorage nếu có
          const userPermissionsStr = localStorage.getItem(`user_permissions_${parsedUser.msnv}`);
          if (userPermissionsStr) {
            try {
              const permissions = JSON.parse(userPermissionsStr);
              parsedUser.permissions = permissions;
              console.log('📋 Refreshed permissions for user:', parsedUser.msnv);
            } catch (e) {
              console.warn('⚠️ Failed to refresh permissions');
            }
          }
          
          setUser(parsedUser);
          console.log('✅ User loaded from localStorage:', parsedUser.msnv);
          
          // Trigger sync on startup if logged in
          setTimeout(() => {
            dataSync.fullSync()
              .then(() => console.log('🚀 Initial sync completed'))
              .catch(err => console.error('Startup sync failed:', err));
          }, 1000);
          
          setLoading(false);
          return;
        }

        // Try sessionStorage (temporary login)
        const sessionUser = sessionStorage.getItem('sessionUser');
        if (sessionUser) {
          const parsedUser = JSON.parse(sessionUser);
          
          // Refresh permissions từ localStorage nếu có
          const userPermissionsStr = localStorage.getItem(`user_permissions_${parsedUser.msnv}`);
          if (userPermissionsStr) {
            try {
              const permissions = JSON.parse(userPermissionsStr);
              parsedUser.permissions = permissions;
              console.log('📋 Refreshed permissions for user:', parsedUser.msnv);
            } catch (e) {
              console.warn('⚠️ Failed to refresh permissions');
            }
          }
          
          setUser(parsedUser);
          console.log('✅ User loaded from sessionStorage:', parsedUser.msnv);
          
          // Trigger sync on startup if logged in
          setTimeout(() => {
            dataSync.fullSync()
              .then(() => console.log('🚀 Initial sync completed'))
              .catch(err => console.error('Startup sync failed:', err));
          }, 1000);

          setLoading(false);
          return;
        }

        console.log('ℹ️ No stored user session found');
      } catch (error) {
        console.error('❌ Error loading stored user:', error);
        localStorage.removeItem('sessionUser');
        sessionStorage.removeItem('sessionUser');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(
    async (msnv: string, password: string, rememberMe = false): Promise<boolean> => {
      console.log('🔐 Login attempt for:', msnv);
      
      try {
        // Try LocalStorage fallback first (Offline reliable)
        const userRecordsStr = localStorage.getItem('userRecords');
        const usersStr = localStorage.getItem('users');
        
        console.log('📦 Checking local storage for user...');
        
        if (userRecordsStr && usersStr) {
          const userRecords = parseJsonArray<UserRecord>(userRecordsStr);
          const users = parseJsonArray<User>(usersStr);
          
          const record = userRecords.find((r) => r.msnv === msnv && r.status === true);
          
          if (record) {
            console.log('👤 User record found locally. Verifying password...');
            // Check password (handle both plain and base64)
            let isPasswordCorrect = false;
            if (record.passwordHash === password) {
              isPasswordCorrect = true;
            } else {
              try {
                if (atob(record.passwordHash) === password) {
                  isPasswordCorrect = true;
                }
              } catch (e) {
                // Not base64
              }
            }

            if (isPasswordCorrect) {
              const userData = users.find((u) => u.msnv === msnv);
              if (userData) {
                // Load permissions từ localStorage (nếu có)
                const userPermissionsStr = localStorage.getItem(`user_permissions_${msnv}`);
                let permissions = { ...DEFAULT_PERMISSIONS };
                
                if (userPermissionsStr) {
                  try {
                    permissions = JSON.parse(userPermissionsStr);
                    console.log('📋 User permissions loaded from localStorage:', Object.keys(permissions).filter(k => permissions[k]).length, 'permissions');
                  } catch (e) {
                    console.warn('⚠️ Failed to parse user permissions, using defaults');
                  }
                } else if (userData.role === 'admin') {
                  // Admin mặc định toàn quyền
                  Object.keys(permissions).forEach(key => {
                    permissions[key] = true;
                  });
                  console.log('👑 Admin user - granting full permissions');
                }
                
                const userWithPermissions = { ...userData, permissions };
                setUser(userWithPermissions);
                if (rememberMe) {
                  localStorage.setItem('sessionUser', JSON.stringify(userWithPermissions));
                } else {
                  sessionStorage.setItem('sessionUser', JSON.stringify(userWithPermissions));
                }
                console.log('✅ Login successful via localStorage');
                dataSync.fullSync().catch(err => console.error('Post-login sync failed:', err));
                return true;
              } else {
                console.warn('⚠️ User record exists but full user data is missing locally');
              }
            } else {
              console.warn('❌ Local password mismatch');
            }
          } else {
            console.log('ℹ️ User not found in local storage');
          }
        } else {
          console.warn('⚠️ Local storage is empty (no userRecords or users)');
        }

        // 2. Try Supabase if online or local failed
        if (supabase) {
          console.log('🌐 Attempting Supabase login for:', msnv);
          // Get user record for auth - Use correct DB column names
          const { data: record, error: err1 } = await supabase
            .from('user_records')
            .select('*')
            .eq('msnv', msnv)
            .eq('status', true)
            .single();

          if (err1) {
            if (err1.code === 'PGRST116') {
              console.warn('ℹ️ User not found in Supabase user_records');
            } else {
              console.error('❌ Supabase auth error:', err1.message, err1.code);
            }
          }

          if (!err1 && record) {
            console.log('👤 User record found in Supabase. Verifying password...');
            
            // Map DB fields to local expectations for the password check logic
            const dbPasswordHash = record.password_hash || record.passwordHash;
            
            let isPasswordCorrect = false;
            if (dbPasswordHash === password) {
              isPasswordCorrect = true;
            } else {
              try {
                if (atob(dbPasswordHash) === password) {
                  isPasswordCorrect = true;
                }
              } catch (e) {
                // Not base64
              }
            }

            if (isPasswordCorrect) {
              // Get full user profile - Use correct DB column names
              const { data: userData, error: err2 } = await supabase
                .from('users')
                .select('*')
                .eq('msnv', msnv)
                .single();

              if (!err2 && userData) {
                // Map back to expected User type if needed (fullName vs full_name)
                let normalizedUser: User = {
                  ...userData,
                  fullName: userData.full_name || userData.fullName,
                  msnv: userData.msnv
                };
                
                // Load permissions từ localStorage
                const userPermissionsStr = localStorage.getItem(`user_permissions_${msnv}`);
                let permissions = { ...DEFAULT_PERMISSIONS };
                
                if (userPermissionsStr) {
                  try {
                    permissions = JSON.parse(userPermissionsStr);
                    console.log('📋 User permissions loaded from localStorage:', Object.keys(permissions).filter(k => permissions[k]).length, 'permissions');
                  } catch (e) {
                    console.warn('⚠️ Failed to parse user permissions, using defaults');
                  }
                } else if (normalizedUser.role === 'admin') {
                  // Admin mặc định toàn quyền
                  Object.keys(permissions).forEach(key => {
                    permissions[key] = true;
                  });
                  console.log('👑 Admin user - granting full permissions');
                }
                
                normalizedUser = { ...normalizedUser, permissions };

                setUser(normalizedUser);
                if (rememberMe) {
                  localStorage.setItem('sessionUser', JSON.stringify(normalizedUser));
                } else {
                  sessionStorage.setItem('sessionUser', JSON.stringify(normalizedUser));
                }
                console.log('✅ Login successful via Supabase');
                dataSync.fullSync().catch(err => console.error('Post-login sync failed:', err));
                return true;
              } else {
                console.error('❌ Failed to fetch user profile from Supabase:', err2?.message);
              }
            } else {
              console.warn('❌ Supabase password mismatch');
            }
          }
        } else {
          console.warn('⚠️ Supabase client is not initialized (check your .env key)');
        }

        console.error('❌ Login failed: Invalid MSNV or password');
        return false;
      } catch (err) {
        console.error('💥 Login critical error:', err);
        return false;
      }
    },
    []
  );

  const updateProfile = useCallback((updatedUser: Partial<User>) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      const nextUser = { ...currentUser, ...updatedUser };
      const usersStr = localStorage.getItem('users');
      if (usersStr) {
        try {
          const users = parseJsonArray<User>(usersStr);
          const updatedUsers = users.map((userRecord) => (userRecord.msnv === nextUser.msnv ? nextUser : userRecord));
          localStorage.setItem('users', JSON.stringify(updatedUsers));
        } catch {
          // ignore local update failures
        }
      }
      if (localStorage.getItem('sessionUser')) {
        localStorage.setItem('sessionUser', JSON.stringify(nextUser));
      }
      if (sessionStorage.getItem('sessionUser')) {
        sessionStorage.setItem('sessionUser', JSON.stringify(nextUser));
      }
      return nextUser;
    });
  }, []);

  const logout = useCallback(() => {
    console.log('🚪 Logout');
    setUser(null);
    localStorage.removeItem('sessionUser');
    sessionStorage.removeItem('sessionUser');
    localStorage.removeItem('rememberedLogin');
    localStorage.removeItem('rememberedUser');
  }, []);

  const hasPermission = useCallback((module: string, level: 'view' | 'edit') => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (!user.permissions) return false;

    if (level === 'view') {
      return !!user.permissions[module];
    }

    if (level === 'edit') {
      return !!user.permissions[module];
    }

    return false;
  }, [user]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    updateProfile,
    hasPermission,
  };

  if (loading) {
    return React.createElement('div', { className: 'flex items-center justify-center h-screen' },
      React.createElement('div', { className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600' })
    );
  }

  return React.createElement(AuthContext.Provider, { value }, children);
};

// ================= HOOK =================
export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};