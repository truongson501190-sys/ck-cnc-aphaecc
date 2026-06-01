import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { User } from '@/types/user';
import { dataSync } from '@/lib/dataSync';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ================= PROVIDER =================
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Consistent permission keys used across app
  const PERMISSION_KEYS = [
    'nhap_kho', 'xuat_kho', 'chuyen_kho', 'xuat_dau', 'kiem_ke_kho', 'ton_kho', 'the_kho', 'lich_su_giao_dich',
    'ke_hoach_san_xuat', 'nhat_ky_gia_cong', 'nhat_ky_qc', 'nhat_ky_bao_tri', 'theo_doi_tien_do',
    'dashboard_tong_hop', 'bao_cao_kho', 'bao_cao_gia_cong', 'bao_cao_qc', 'bao_cao_bao_tri', 'hieu_suat_may', 'cho_duyet',
    'chung_loai', 'kho', 'may_moc', 'du_an',
    'quan_ly_nguoi_dung', 'phan_quyen', 'audit_log', 'backup_restore', 'cai_dat_he_thong'
  ];

  // Initialize auth state from storage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        // Ensure default data exists
        const userRecordsStr = localStorage.getItem('userRecords');
        const usersStr = localStorage.getItem('wms_users');

        console.log('📦 Đảm bảo dữ liệu mặc định...');

        if (!userRecordsStr || !usersStr) {
          console.log('📦 Initializing localStorage with default data...');

          const defaultUsers = [
            {
              msnv: '1118',
              fullName: 'Nguyễn Trường Sơn',
              department: 'Admin',
              position: 'Quản trị viên hệ thống',
              role: 'admin',
              roleGroup: 'Admin',
              status: 'active',
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
              passwordHash: '1118',
              createdAt: new Date().toISOString()
            }
          ];

          localStorage.setItem('wms_users', JSON.stringify(defaultUsers));
          localStorage.setItem('userRecords', JSON.stringify(defaultUserRecords));

          // Initialize permissions for admin
          const adminPerms: Record<string, string> = {};
          PERMISSION_KEYS.forEach(key => adminPerms[key] = 'full');
          localStorage.setItem('wms_user_permissions_1118', JSON.stringify(adminPerms));

          console.log('✅ Default data initialized');
        } else {
          const userRecords = parseJsonArray<UserRecord>(userRecordsStr);
          const users = parseJsonArray<User>(usersStr);

          // Ensure admin exists and reset password to 1118
          let adminRecord = userRecords.find((r) => r.msnv === '1118');
          if (!adminRecord) {
            console.log('📦 Adding missing admin user to local storage...');
            adminRecord = {
              id: 'admin-' + Date.now(),
              msnv: '1118',
              fullName: 'Nguyễn Trường Sơn',
              department: 'Admin',
              position: 'Quản trị viên hệ thống',
              role: 'admin',
              status: true,
              passwordHash: '1118',
              createdAt: new Date().toISOString()
            };
            userRecords.push(adminRecord);
            localStorage.setItem('userRecords', JSON.stringify(userRecords));
          } else {
            adminRecord.passwordHash = '1118';
            localStorage.setItem('userRecords', JSON.stringify(userRecords));
          }

          if (!users.find((u) => u.msnv === '1118')) {
            users.push({
              msnv: '1118',
              fullName: 'Nguyễn Trường Sơn',
              department: 'Admin',
              position: 'Quản trị viên hệ thống',
              role: 'admin',
              roleGroup: 'Admin',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            localStorage.setItem('wms_users', JSON.stringify(users));

            // Initialize admin permissions
            const adminPerms: Record<string, string> = {};
            PERMISSION_KEYS.forEach(key => adminPerms[key] = 'full');
            localStorage.setItem('wms_user_permissions_1118', JSON.stringify(adminPerms));
          }
        }

        // Try localStorage first (persistent login)
        const storedUser = localStorage.getItem('sessionUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log('✅ User loaded from localStorage:', parsedUser.msnv);

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
          setUser(parsedUser);
          console.log('✅ User loaded from sessionStorage:', parsedUser.msnv);

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
      const inputMsnv = msnv.trim().toLowerCase();
      const normalizedPassword = password.trim();
      console.log('🔐 Login attempt for:', inputMsnv);

      try {
        // Try local storage first
        const usersStr = localStorage.getItem('wms_users');
        const userRecordsStr = localStorage.getItem('userRecords');

        const users = parseJsonArray<User>(usersStr || '[]');
        const userRecords = parseJsonArray<UserRecord>(userRecordsStr || '[]');

        console.log("📦 Current data state:", {
          usersCount: users.length,
          userRecordsCount: userRecords.length,
          allUserRecordsMsnv: userRecords.map(r => r.msnv),
          allUsersMsnv: users.map(u => u.msnv)
        });

        // Find user in userRecords
        let record = userRecords.find(
          (r) => r.msnv.trim().toLowerCase() === inputMsnv && r.status === true
        );

        // If no record, try to create one from wms_users
        if (!record) {
          console.log("⚠️ User record not found, checking wms_users...");
          const wmsUser = users.find(u => u.msnv.trim().toLowerCase() === inputMsnv);
          if (wmsUser) {
            console.log("➕ Creating user record from wms_user...");
            record = {
              id: wmsUser.msnv,
              msnv: wmsUser.msnv,
              fullName: wmsUser.fullName,
              department: wmsUser.department,
              position: wmsUser.position || '',
              role: wmsUser.role || 'user',
              status: true,
              passwordHash: wmsUser.msnv, // Default password is MSNV
              createdAt: new Date().toISOString()
            };
            userRecords.push(record);
            localStorage.setItem('userRecords', JSON.stringify(userRecords));
          } else {
            console.log("❌ User not found in either place!");
            return false;
          }
        }

        console.log("👤 Found user record:", record);

        // Check password
        const correctPassword = (record.passwordHash || record.msnv).toString().trim();
        console.log("🔑 Checking password...", {
          inputPassword: normalizedPassword,
          storedPasswordHash: correctPassword,
          matches: correctPassword === normalizedPassword
        });

        let isPasswordCorrect = false;
        if (correctPassword === normalizedPassword) {
          isPasswordCorrect = true;
        } else {
          try {
            if (atob(correctPassword) === normalizedPassword) {
              isPasswordCorrect = true;
            }
          } catch {
            // Not base64 encoded, ignore
          }
        }

        if (!isPasswordCorrect) {
          console.log("❌ Password incorrect!");
          return false;
        }

        // Find the user object from wms_users
        let userData = users.find((u) => u.msnv.trim().toLowerCase() === inputMsnv);

        // If not found, create from record
        if (!userData) {
          console.log("⚠️ User not found in wms_users, creating...");
          userData = {
            msnv: record.msnv,
            fullName: record.fullName,
            department: record.department,
            roleGroup: record.role || 'User',
            position: record.position,
            role: record.role as 'user' | 'manager' | 'admin',
            status: 'active',
            createdAt: record.createdAt,
            updatedAt: new Date().toISOString()
          };
          const updatedUsers = [...users, userData];
          localStorage.setItem('wms_users', JSON.stringify(updatedUsers));
        } else {
          // Ensure userData has all required fields
          userData = {
            ...userData,
            roleGroup: userData.roleGroup || (record.role || 'User'),
            role: userData.role || (record.role as 'user' | 'manager' | 'admin')
          };
        }

        // Initialize permissions if they don't exist
        const permsKey = `wms_user_permissions_${record.msnv}`;
        const existingPerms = localStorage.getItem(permsKey);
        if (!existingPerms) {
          console.log("➕ Initializing user permissions...");
          const initialPerms: Record<string, string> = {};
          PERMISSION_KEYS.forEach(key => {
            initialPerms[key] = record.role === 'admin' ? 'full' : 'none';
          });
          localStorage.setItem(permsKey, JSON.stringify(initialPerms));
        }

        console.log("✅ Login successful!", { userData });

        setUser(userData);
        if (rememberMe) {
          localStorage.setItem('sessionUser', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('sessionUser', JSON.stringify(userData));
        }

        dataSync.fullSync().catch(err => console.error('Post-login sync failed:', err));
        return true;

      } catch (error) {
        console.error('💥 Login critical error:', error);
        return false;
      }
    },
    []
  );

  const updateProfile = useCallback((updatedUser: Partial<User>) => {
    setUser((currentUser) => {
      if (!currentUser) return currentUser;
      const nextUser = { ...currentUser, ...updatedUser };
      const usersStr = localStorage.getItem('wms_users');
      if (usersStr) {
        try {
          const users = parseJsonArray<User>(usersStr);
          const updatedUsers = users.map((userRecord) => (userRecord.msnv === nextUser.msnv ? nextUser : userRecord));
          localStorage.setItem('wms_users', JSON.stringify(updatedUsers));
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
    localStorage.removeItem('rememberedUser');
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    updateProfile,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ================= HOOK =================
export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
