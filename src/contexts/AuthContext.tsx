import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { UserPermissions, User } from '@/types/user';

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
        // ... existing seeding logic ...
        const existingRecords = localStorage.getItem('userRecords');
        const existingUsers = localStorage.getItem('users');
        let needsSeeding = !existingRecords || !existingUsers;

        if (existingRecords && existingUsers) {
          try {
            const records = JSON.parse(existingRecords);
            const users = JSON.parse(existingUsers);
            const userRecord = records.find((u: any) => u.msnv === '1118');
            const user = users.find((u: any) => u.msnv === '1118');
            if (!userRecord || !user || atob(userRecord.passwordHash) !== 'admin123' || user.role !== 'admin') {
              needsSeeding = true;
            }
          } catch (error) {
            console.error('Error parsing auth seed data:', error);
            needsSeeding = true;
          }
        }

        if (needsSeeding) {
          console.log('🌱 Seeding/updating data...');
          const users = [
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
                'bao-cao-tong-hop': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ];
          const userRecords = [
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
          ];
          localStorage.setItem('users', JSON.stringify(users));
          localStorage.setItem('userRecords', JSON.stringify(userRecords));
          console.log('✅ Data seeded!');
        }

        // Restore session
        const local = localStorage.getItem("sessionUser");
        const session = sessionStorage.getItem("sessionUser");

        if (local) {
          setUser(JSON.parse(local));
        } else if (session) {
          setUser(JSON.parse(session));
        }

        // AUTO-SYNC on startup if user is logged in
        if (local || session) {
          try {
            const { dataSync } = await import('@/lib/dataSync');
            console.log('🔄 Triggering auto-sync on app startup...');
            dataSync.fullSync().catch(err => console.error('Startup sync failed:', err));
          } catch (err) {
            console.log('Sync not available at startup');
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []); // Empty dependency array to run only once

  // LOGIN
  const login = async (msnv: string, password: string, remember = false) => {
    console.log("🔐 Login attempt:", { msnv, password: "***" });
    
    try {
      // Get userRecords from localStorage
      let userRecordsJson = localStorage.getItem("userRecords");
      let usersJson = localStorage.getItem("users");
      
      // If not found, seed data first
      if (!userRecordsJson || !usersJson) {
        console.log("📋 Missing auth data, seeding now...");
        const seedUsers = [
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
              'bao-cao-tong-hop': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        const seedRecords = [
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
        ];
        localStorage.setItem('users', JSON.stringify(seedUsers));
        localStorage.setItem('userRecords', JSON.stringify(seedRecords));
        userRecordsJson = JSON.stringify(seedRecords);
        usersJson = JSON.stringify(seedUsers);
        console.log("✅ Auth data seeded");
      }

      const userRecords: UserRecord[] = JSON.parse(userRecordsJson);
      
      // Find user by msnv
      console.log("🔍 Looking for user:", msnv, "in records:", userRecords.map(u => u.msnv));
      const userRecord = userRecords.find((u: UserRecord) => u.msnv === msnv && u.status);
      
      if (!userRecord) {
        console.log("🚫 User not found or inactive:", msnv);
        console.log("Available users:", userRecords.map(u => ({ msnv: u.msnv, status: u.status })));
        return false;
      }

      // Verify password (stored as base64 for mock purposes)
      const storedPassword = atob(userRecord.passwordHash);
      console.log("🔑 Password check - stored:", storedPassword, "provided:", password);
      if (password !== storedPassword) {
        console.log("🚫 Wrong password");
        return false;
      }

      // Get full user data from users list
      const users: User[] = JSON.parse(usersJson);
      console.log("👥 Available users:", users.map(u => u.msnv));
      const fullUser = users.find((u: User) => u.msnv === msnv);

      if (!fullUser) {
        console.log("🚫 User details not found in users array");
        return false;
      }

      console.log("✅ Login successful, setting user:", fullUser);
      setUser(fullUser);

      if (remember) {
        localStorage.setItem("sessionUser", JSON.stringify(fullUser));
        console.log("💾 Saved to localStorage with remember");
      } else {
        sessionStorage.setItem("sessionUser", JSON.stringify(fullUser));
        console.log("💾 Saved to sessionStorage");
      }

      // Sync data after successful login
      try {
        const { dataSync } = await import('@/lib/dataSync');
        dataSync.fullSync().catch(err => console.error('Sync after login failed:', err));
      } catch (err) {
        console.log('Sync not available, continuing without sync');
      }

      return true;
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
      const usersJson = localStorage.getItem("users");
      if (!usersJson) return;

      const users: User[] = JSON.parse(usersJson);
      const updatedUser = users.find((u: User) => u.msnv === user.msnv);

      if (updatedUser) {
        setUser(updatedUser);
        localStorage.setItem("sessionUser", JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error("Error refreshing user:", err);
    }
  };

  // PERMISSION
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
      <div className="flex items-center justify-center h-screen">
        <div>Đang tải hệ thống...</div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}