import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { DEFAULT_PERMISSIONS } from '@/types/user';
import type { UserPermissions, User } from '@/types/user';
import { getSupabase } from '@/lib/supabase';

const REQUIRED_PERSONNEL_USERS = [
  {
    id: '2001',
    msnv: '2001',
    hoTen: 'Trần Văn A',
    fullName: 'Trần Văn A',
    department: 'Kho',
    position: 'Nhân viên nhập kho',
    role: 'user',
    vaiTro: 'NguoiNhap',
    status: 'active',
    permissions: DEFAULT_PERMISSIONS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2002',
    msnv: '2002',
    hoTen: 'Lê Thị B',
    fullName: 'Lê Thị B',
    department: 'Kho',
    position: 'Nhân viên xuất kho',
    role: 'user',
    vaiTro: 'NguoiXuat',
    status: 'active',
    permissions: DEFAULT_PERMISSIONS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2003',
    msnv: '2003',
    hoTen: 'Phạm Văn C',
    fullName: 'Phạm Văn C',
    department: 'Sản xuất',
    position: 'Người nhận vật tư',
    role: 'user',
    vaiTro: 'NguoiNhan',
    status: 'active',
    permissions: DEFAULT_PERMISSIONS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const REQUIRED_PERSONNEL_RECORDS = [
  {
    id: '2',
    msnv: '2001',
    fullName: 'Trần Văn A',
    department: 'Kho',
    position: 'Nhân viên nhập kho',
    role: 'user',
    status: true,
    passwordHash: btoa('123456'),
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    msnv: '2002',
    fullName: 'Lê Thị B',
    department: 'Kho',
    position: 'Nhân viên xuất kho',
    role: 'user',
    status: true,
    passwordHash: btoa('123456'),
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    msnv: '2003',
    fullName: 'Phạm Văn C',
    department: 'Sản xuất',
    position: 'Người nhận vật tư',
    role: 'user',
    status: true,
    passwordHash: btoa('123456'),
    createdAt: new Date().toISOString()
  }
];

const normalizeStoredUser = (user: any) => {
  const normalizedMsnv = user.msnv || user.employee_code || user.id || '';
  const normalizedRole = ['admin', 'manager', 'user'].includes(user.role) ? user.role : 'user';

  return {
    ...user,
    id: user.id || normalizedMsnv || `${user.fullName || user.hoTen || 'user'}-${Math.random().toString(36).slice(2, 8)}`,
    msnv: normalizedMsnv,
    fullName: user.fullName || user.hoTen || user.name || user.username || normalizedMsnv,
    hoTen: user.hoTen || user.fullName || user.name || user.username || normalizedMsnv,
    position: user.position || user.chucDanh || '',
    role: normalizedRole as any,
    status: user.status || 'active',
    permissions: user.permissions || DEFAULT_PERMISSIONS,
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: user.updatedAt || new Date().toISOString()
  };
};

const ensureRequiredPersonnelUsers = (users: any[]) => {
  const normalizedUsers = users.map(normalizeStoredUser);
  const existingMsnv = new Set(normalizedUsers.map((user) => user.msnv));
  const mergedUsers = [...normalizedUsers];

  for (const requiredUser of REQUIRED_PERSONNEL_USERS) {
    if (!existingMsnv.has(requiredUser.msnv)) {
      mergedUsers.push(requiredUser);
    }
  }

  return mergedUsers;
};

const ensureRequiredPersonnelRecords = (records: any[]) => {
  const existingMsnv = new Set(records.map((record) => record.msnv));
  const mergedRecords = [...records];

  for (const requiredRecord of REQUIRED_PERSONNEL_RECORDS) {
    if (!existingMsnv.has(requiredRecord.msnv)) {
      mergedRecords.push(requiredRecord);
    }
  }

  return mergedRecords;
};

interface UserRecord {
  id: string;
  msnv: string;
  fullName: string;
  department: string;
  position: string;
  role: string;
  status: boolean;
  passwordHash: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  login: (msnv: string, password: string, remember?: boolean) => Promise<boolean>;
  logout: () => void;
  isAdmin: () => boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session and sync data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Restore session from localStorage or sessionStorage
        const local = localStorage.getItem("sessionUser");
        const session = sessionStorage.getItem("sessionUser");

        if (local) {
          setUser(JSON.parse(local));
        } else if (session) {
          setUser(JSON.parse(session));
        }

        // Seed data if not present (Offline first approach)
        const existingRecords = localStorage.getItem('userRecords');
        const existingUsers = localStorage.getItem('users');
        let resolvedUsers: any[] = [];
        let resolvedRecords: any[] = [];

        if (!existingUsers) {
          console.log('🌱 Seeding initial auth data...');
          resolvedUsers = ensureRequiredPersonnelUsers([
            {
              id: '1118',
              msnv: '1118',
              fullName: 'Nguyễn Trường Sơn',
              department: 'Admin',
              position: 'Quản trị viên hệ thống',
              role: 'admin',
              status: 'active',
              permissions: {
                'kho-tong': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
                'kho-co-khi': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
                'kho-cnc': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
                'kho-dau': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
                'bao-cao-tong-hop': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ]);
        } else {
          try {
            const parsedUsers = JSON.parse(existingUsers);
            if (Array.isArray(parsedUsers)) {
              resolvedUsers = ensureRequiredPersonnelUsers(parsedUsers.map(normalizeStoredUser));
            } else {
              resolvedUsers = ensureRequiredPersonnelUsers([]);
            }
          } catch {
            resolvedUsers = ensureRequiredPersonnelUsers([]);
          }
        }

        if (!existingRecords) {
          resolvedRecords = ensureRequiredPersonnelRecords([
            {
              id: '1',
              msnv: '1118',
              fullName: 'Nguyễn Trường Sơn',
              department: 'Admin',
              position: 'Quản trị viên hệ thống',
              role: 'admin',
              status: true,
              passwordHash: btoa('admin123'),
              createdAt: new Date().toISOString()
            }
          ]);
        } else {
          try {
            const parsedRecords = JSON.parse(existingRecords);
            if (Array.isArray(parsedRecords)) {
              resolvedRecords = ensureRequiredPersonnelRecords(parsedRecords);
            } else {
              resolvedRecords = ensureRequiredPersonnelRecords([]);
            }
          } catch {
            resolvedRecords = ensureRequiredPersonnelRecords([]);
          }
        }

        localStorage.setItem('users', JSON.stringify(resolvedUsers));
        localStorage.setItem('userRecords', JSON.stringify(resolvedRecords));

        // AUTO-SYNC on startup if user is logged in
        if (local || session) {
          try {
            const { dataSync } = await import('@/lib/dataSync');
            dataSync.fullSync().catch(err => console.error('Startup sync failed:', err));
          } catch (err) {
            console.log('Sync service not available at startup');
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // LOGIN
  const login = async (msnv: string, password: string, remember = false) => {
    console.log("🔐 Login attempt for:", msnv);
    
    try {
      // 1. Try local authentication first (Reliable offline)
      const userRecordsJson = localStorage.getItem("userRecords");
      const usersJson = localStorage.getItem("users");
      
      if (userRecordsJson && usersJson) {
        const userRecords: UserRecord[] = JSON.parse(userRecordsJson);
        const userRecord = userRecords.find((u: UserRecord) => u.msnv === msnv && u.status);
        
        if (userRecord && atob(userRecord.passwordHash) === password) {
          const users: User[] = JSON.parse(usersJson);
          const fullUser = users.find((u: User) => u.msnv === msnv);
          
          if (fullUser) {
            setUser(fullUser);
            if (remember) {
              localStorage.setItem("sessionUser", JSON.stringify(fullUser));
            } else {
              sessionStorage.setItem("sessionUser", JSON.stringify(fullUser));
            }
            
            // Trigger background sync after successful login
            import('@/lib/dataSync').then(({ dataSync }) => {
              dataSync.fullSync().catch(console.error);
            });
            
            return true;
          }
        }
      }

      // 2. Fallback to Supabase if online and local failed
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('user_records')
          .select('*')
          .eq('msnv', msnv)
          .eq('status', true)
          .single();

        if (!error && data && atob(data.passwordHash) === password) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('msnv', msnv)
            .single();

          if (userData) {
            setUser(userData);
            if (remember) {
              localStorage.setItem("sessionUser", JSON.stringify(userData));
            } else {
              sessionStorage.setItem("sessionUser", JSON.stringify(userData));
            }
            return true;
          }
        }
      }

      return false;
    } catch (err) {
      console.error("💥 Login error:", err);
      return false;
    }
  };

  // LOGOUT
  const logout = () => {
    setUser(null);
    localStorage.removeItem("sessionUser");
    sessionStorage.removeItem("sessionUser");
  };

  // REFRESH USER
  const refreshUser = async () => {
    if (!user) return;

    try {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('msnv', user.msnv)
          .single();

        if (!error && data) {
          setUser(data);
          localStorage.setItem("sessionUser", JSON.stringify(data));
          return;
        }
      }
      
      // Local fallback
      const usersJson = localStorage.getItem("users");
      if (usersJson) {
        const users: User[] = JSON.parse(usersJson);
        const updatedUser = users.find((u: User) => u.msnv === user.msnv);
        if (updatedUser) {
          setUser(updatedUser);
        }
      }
    } catch (err) {
      console.error("Refresh error:", err);
    }
  };

  const isAdmin = () => user?.role === "admin";

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAdmin,
    isAuthenticated: !!user,
    refreshUser
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-slate-600 font-medium">Đang tải hệ thống...</div>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
