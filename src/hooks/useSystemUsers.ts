/**
 * Hook for managing system users
 * Provides centralized user data that syncs across all components
 * Uses localStorage as source of truth
 */

import { useState, useEffect, useCallback } from 'react';

export interface SystemUser {
  msnv: string;
  fullName: string;
  department: string;
  position: string;
  role: 'user' | 'manager' | 'admin';
  status: 'active' | 'inactive';
  email?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'users';

/**
 * Hook to manage system users
 * Automatically syncs with localStorage
 */
export function useSystemUsers() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load users from localStorage on mount and when storage changes
  const loadUsers = useCallback(() => {
    try {
      setLoading(true);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUsers(Array.isArray(parsed) ? parsed : []);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load users on mount
  useEffect(() => {
    loadUsers();

    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadUsers();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadUsers]);

  // Save users to localStorage
  const saveUsers = useCallback((newUsers: SystemUser[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsers));
      setUsers(newUsers);
      setError(null);
    } catch (err) {
      console.error('Error saving users:', err);
      setError('Failed to save users');
    }
  }, []);

  // Get user by MSNV
  const getUserByMsnv = useCallback((msnv: string): SystemUser | undefined => {
    return users.find(u => u.msnv === msnv);
  }, [users]);

  // Get all active users
  const getActiveUsers = useCallback((): SystemUser[] => {
    return users.filter(u => u.status === 'active');
  }, [users]);

  // Get users by department
  const getUsersByDepartment = useCallback((department: string): SystemUser[] => {
    return users.filter(u => u.department === department && u.status === 'active');
  }, [users]);

  // Get users by role
  const getUsersByRole = useCallback((role: 'user' | 'manager' | 'admin'): SystemUser[] => {
    return users.filter(u => u.role === role && u.status === 'active');
  }, [users]);

  // Add or update a user
  const upsertUser = useCallback((user: SystemUser) => {
    const index = users.findIndex(u => u.msnv === user.msnv);
    let newUsers: SystemUser[];

    if (index >= 0) {
      newUsers = [...users];
      newUsers[index] = { ...user, updatedAt: new Date().toISOString() };
    } else {
      newUsers = [...users, { ...user, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    }

    saveUsers(newUsers);
  }, [users, saveUsers]);

  // Delete a user
  const deleteUser = useCallback((msnv: string) => {
    const newUsers = users.filter(u => u.msnv !== msnv);
    saveUsers(newUsers);
  }, [users, saveUsers]);

  return {
    users,
    loading,
    error,
    loadUsers,
    saveUsers,
    getUserByMsnv,
    getActiveUsers,
    getUsersByDepartment,
    getUsersByRole,
    upsertUser,
    deleteUser
  };
}

/**
 * Get all system users synchronously (for contexts and non-hook components)
 */
export function getSystemUsers(): SystemUser[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (err) {
    console.error('Error getting system users:', err);
    return [];
  }
}

/**
 * Get active system users synchronously
 */
export function getActiveSystemUsers(): SystemUser[] {
  return getSystemUsers().filter(u => u.status === 'active');
}

/**
 * Get user by MSNV synchronously
 */
export function getSystemUserByMsnv(msnv: string): SystemUser | undefined {
  return getSystemUsers().find(u => u.msnv === msnv);
}

/**
 * Get users by department synchronously
 */
export function getSystemUsersByDepartment(department: string): SystemUser[] {
  return getSystemUsers().filter(u => u.department === department && u.status === 'active');
}
