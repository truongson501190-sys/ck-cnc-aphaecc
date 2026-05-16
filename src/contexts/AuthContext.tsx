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

  // Initialize auth state from storage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        // Initialize default data if localStorage is empty
        if (!localStorage.getItem('userRecords')) {
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
              passwordHash: 'YWRtaW4xMjM=', // admin123
              createdAt: new Date().toISOString()
            }
          ];

          localStorage.setItem('users', JSON.stringify(defaultUsers));
          localStorage.setItem('userRecords', JSON.stringify(defaultUserRecords));
          
          console.log('✅ Default data initialized');
          console.log('📝 Test credentials: MSNV: 1118, Password: admin123');
        }

        // Try localStorage first (persistent login)
        const storedUser = localStorage.getItem('sessionUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log('✅ User loaded from localStorage:', parsedUser.msnv);
          
          // Trigger sync on startup if logged in
          dataSync.fullSync().catch(err => console.error('Startup sync failed:', err));
          return;
        }

        // Try sessionStorage (temporary login)
        const sessionUser = sessionStorage.getItem('sessionUser');
        if (sessionUser) {
          const parsedUser = JSON.parse(sessionUser);
          setUser(parsedUser);
          console.log('✅ User loaded from sessionStorage:', parsedUser.msnv);
          
          // Trigger sync on startup if logged in
          dataSync.fullSync().catch(err => console.error('Startup sync failed:', err));
          return;
        }

        console.log('ℹ️ No stored user session found');
      } catch (error) {
        console.error('❌ Error loading stored user:', error);
        localStorage.removeItem('sessionUser');
        sessionStorage.removeItem('sessionUser');
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (msnv: string, password: string, rememberMe = false): Promise<boolean> => {
    console.log('🔐 Login attempt for:', msnv);

    try {
      // Try Supabase first if configured (with 2 second timeout)
      if (supabase) {
        try {
          const supabasePromise = (async () => {
            // 1. Check user_records table (password)
            const { data: record, error: err1 } = await supabase
              .from('user_records')
              .select('*')
              .eq('msnv', msnv)
              .eq('status', true)
              .single();

            if (err1 || !record) {
              console.error('❌ Supabase: User record not found');
              throw new Error('User not found');
            }

            // Verify password
            try {
              const decodedPassword = atob(record.passwordHash);
              if (decodedPassword !== password) {
                console.error('❌ Password incorrect');
                return false;
              }
            } catch (e) {
              console.error('❌ Invalid password hash encoding');
              return false;
            }

            // 2. Get user information
            const { data: userData, error: err2 } = await supabase
              .from('users')
              .select('*')
              .eq('msnv', msnv)
              .single();

            if (err2 || !userData) {
              console.error('❌ Supabase: User not found');
              throw new Error('User not found');
            }

            return userData;
          })();

          // Wait for Supabase with 2 second timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Supabase timeout')), 2000)
          );

          const userData = await Promise.race([supabasePromise, timeoutPromise]);

          if (userData === false) {
            return false; // Password incorrect
          }

          // 3. Save session
          setUser(userData);

          if (rememberMe) {
            localStorage.setItem('sessionUser', JSON.stringify(userData));
            localStorage.removeItem('rememberedLogin');
          } else {
            sessionStorage.setItem('sessionUser', JSON.stringify(userData));
            localStorage.removeItem('sessionUser');
          }

          console.log('✅ Login successful via Supabase');
          
          // Trigger sync after login
          dataSync.fullSync().catch(err => console.error('Post-login sync failed:', err));
          
          return true;
        } catch (err) {
          console.log('⚠️ Supabase failed, falling back to localStorage:', err);
          // Fall through to localStorage backup
        }
      }

      // Fallback: Use localStorage
      console.log('📦 Using localStorage fallback mode');
      const userRecordsStr = localStorage.getItem('userRecords');
      if (!userRecordsStr) {
        console.error('❌ No userRecords found in localStorage');
        return false;
      }

      const userRecords = JSON.parse(userRecordsStr);
      const record = userRecords.find((r: any) => r.msnv === msnv && r.status === true);

      if (!record) {
        console.error('❌ User record not found in localStorage');
        return false;
      }

      // Verify password
      try {
        const decodedPassword = atob(record.passwordHash);
        if (decodedPassword !== password) {
          console.error('❌ Password incorrect');
          return false;
        }
      } catch (e) {
        console.error('❌ Invalid password hash encoding');
        return false;
      }

      // Get user information
      const usersStr = localStorage.getItem('users');
      if (!usersStr) {
        console.error('❌ No users found in localStorage');
        return false;
      }

      const users = JSON.parse(usersStr);
      const userData = users.find((u: any) => u.msnv === msnv);

      if (!userData) {
        console.error('❌ User not found in localStorage');
        return false;
      }

      // Save session
      setUser(userData);

      if (rememberMe) {
        localStorage.setItem('sessionUser', JSON.stringify(userData));
        localStorage.removeItem('rememberedLogin');
      } else {
        sessionStorage.setItem('sessionUser', JSON.stringify(userData));
        localStorage.removeItem('sessionUser');
      }

      console.log('✅ Login successful via localStorage');
      
      // Trigger sync after login (to push local changes if any)
      dataSync.fullSync().catch(err => console.error('Post-login sync failed:', err));
      
      return true;
    } catch (err) {
      console.error('💥 Login error:', err);
      return false;
    }
  }, []);

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