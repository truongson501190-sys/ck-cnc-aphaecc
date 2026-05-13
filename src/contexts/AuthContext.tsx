import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/supabase';
import type { User } from '@/types/user';

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
        // Try localStorage first (persistent login)
        const storedUser = localStorage.getItem('sessionUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log('✅ User loaded from localStorage:', parsedUser.msnv);
          return;
        }

        // Try sessionStorage (temporary login)
        const sessionUser = sessionStorage.getItem('sessionUser');
        if (sessionUser) {
          const parsedUser = JSON.parse(sessionUser);
          setUser(parsedUser);
          console.log('✅ User loaded from sessionStorage:', parsedUser.msnv);
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
      if (!supabase) {
        console.error('❌ Supabase not configured');
        return false;
      }

      // 1. Check user_records table (password)
      const { data: record, error: err1 } = await supabase
        .from('user_records')
        .select('*')
        .eq('msnv', msnv)
        .eq('status', true)
        .single();

      if (err1 || !record) {
        console.error('❌ User record not found');
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

      // 2. Get user information
      const { data: userData, error: err2 } = await supabase
        .from('users')
        .select('*')
        .eq('msnv', msnv)
        .single();

      if (err2 || !userData) {
        console.error('❌ User not found');
        return false;
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

      console.log('✅ Login successful');
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