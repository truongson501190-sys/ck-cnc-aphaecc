import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/supabase';
import type { User } from '@/types/user';
import { dataSync } from '@/lib/dataSync';

// ================= CONTEXT =================
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (msnv: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
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
        if (!localStorage.getItem('userRecords')) {
          // (giữ nguyên logic khởi tạo dữ liệu mặc định bên dưới)
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
                'kho-tong': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
                'kho-co-khi': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
                'kho-cnc': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
                'kho-dau': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
                'bao-cao-tong-hop': { view: true, add: true, edit: true, delete: true, approve: true, export: true }
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
              passwordHash: 'admin123', // admin123
              createdAt: new Date().toISOString()
            }
          ];

          localStorage.setItem('users', JSON.stringify(defaultUsers));
          localStorage.setItem('userRecords', JSON.stringify(defaultUserRecords));
          
          console.log('✅ Default data initialized');
        }

        // Try localStorage first (persistent login)
        const storedUser = localStorage.getItem('sessionUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
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
          const userRecords = JSON.parse(userRecordsStr);
          const users = JSON.parse(usersStr);
          
          const record = userRecords.find((r: any) => r.msnv === msnv && r.status === true);
          
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
              const userData = users.find((u: any) => u.msnv === msnv);
              if (userData) {
                setUser(userData);
                if (rememberMe) {
                  localStorage.setItem('sessionUser', JSON.stringify(userData));
                } else {
                  sessionStorage.setItem('sessionUser', JSON.stringify(userData));
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
          // Get user record for auth
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
              // Get full user profile
              const { data: userData, error: err2 } = await supabase
                .from('users')
                .select('*')
                .eq('msnv', msnv)
                .single();

              if (!err2 && userData) {
                setUser(userData);
                if (rememberMe) {
                  localStorage.setItem('sessionUser', JSON.stringify(userData));
                } else {
                  sessionStorage.setItem('sessionUser', JSON.stringify(userData));
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

  const logout = useCallback(() => {
    console.log('🚪 Logout');
    setUser(null);
    localStorage.removeItem('sessionUser');
    sessionStorage.removeItem('sessionUser');
    localStorage.removeItem('rememberedLogin');
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
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