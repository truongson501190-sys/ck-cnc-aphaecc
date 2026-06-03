import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { User } from '@/types/user';

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

  // Initialize auth state from storage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        // Đảm bảo dữ liệu mặc định trong localStorage
        const usersStr = localStorage.getItem('users');
        const userRecordsStr = localStorage.getItem('userRecords');
        
        if (!usersStr || !userRecordsStr) {
          console.log('📦 Initializing localStorage with default data...');
          
          const defaultUser: User = {
            msnv: '1118',
            fullName: 'Nguyễn Trường Sơn',
            department: 'Admin',
            position: 'Quản trị viên hệ thống',
            role: 'admin',
            roleGroup: 'Admin',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          const defaultUserRecord = {
            msnv: '1118',
            fullName: 'Nguyễn Trường Sơn',
            department: 'Admin',
            position: 'Quản trị viên hệ thống',
            role: 'admin',
            status: true,
            passwordHash: '1118',
            createdAt: new Date().toISOString()
          };

          localStorage.setItem('users', JSON.stringify([defaultUser]));
          localStorage.setItem('userRecords', JSON.stringify([defaultUserRecord]));
          
          console.log('✅ Default data initialized');
        }

        // Try localStorage first (persistent login)
        const storedUser = localStorage.getItem('sessionUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log('✅ User loaded from localStorage:', parsedUser.msnv);
          setLoading(false);
          return;
        }

        // Try sessionStorage (temporary login)
        const sessionUser = sessionStorage.getItem('sessionUser');
        if (sessionUser) {
          const parsedUser = JSON.parse(sessionUser);
          setUser(parsedUser);
          console.log('✅ User loaded from sessionStorage:', parsedUser.msnv);
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
        // Lấy dữ liệu từ localStorage
        const userRecordsStr = localStorage.getItem('userRecords');
        const usersStr = localStorage.getItem('users');
        
        if (!userRecordsStr || !usersStr) {
          console.error('❌ No user data found in localStorage');
          return false;
        }

        const userRecords = parseJsonArray<any>(userRecordsStr);
        const users = parseJsonArray<User>(usersStr);

        const record = userRecords.find(r => r.msnv === inputMsnv && r.status);
        
        if (!record) {
          console.log('❌ User not found or inactive');
          return false;
        }

        // Kiểm tra mật khẩu
        const correctPassword = (record.passwordHash || record.msnv).toString().trim();
        let isPasswordCorrect = correctPassword === normalizedPassword;

        if (!isPasswordCorrect) {
          try {
            if (atob(correctPassword) === normalizedPassword) {
              isPasswordCorrect = true;
            }
          } catch {
            // Không phải mã hóa base64, bỏ qua
          }
        }

        if (!isPasswordCorrect) {
          console.log('❌ Password incorrect!');
          return false;
        }

        const userData = users.find(u => u.msnv === inputMsnv);
        
        if (!userData) {
          console.log('❌ User profile not found');
          return false;
        }

        console.log('✅ Login successful!', { userData });

        setUser(userData);
        if (rememberMe) {
          localStorage.setItem('sessionUser', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('sessionUser', JSON.stringify(userData));
        }

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
      
      // Cập nhật trong localStorage
      const usersStr = localStorage.getItem('users');
      if (usersStr) {
        const users = parseJsonArray<User>(usersStr);
        const updatedUsers = users.map(u => u.msnv === nextUser.msnv ? nextUser : u);
        localStorage.setItem('users', JSON.stringify(updatedUsers));
      }

      // Cập nhật lại trong phiên làm việc hiện tại
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