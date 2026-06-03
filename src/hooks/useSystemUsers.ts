/**
 * Hook for managing system users
 * Provides centralized user data that syncs across all components
 * Uses Supabase as source of truth
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabase';

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

const TABLE_NAME = 'users';

/**
 * Hook to manage system users
 * Automatically syncs with Supabase
 */
export function useSystemUsers() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load users from Supabase
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('fullName');

      if (fetchError) throw fetchError;

      setUsers(data || []);
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
  }, [loadUsers]);

  // Save users to Supabase
  const saveUsers = useCallback(async (newUsers: SystemUser[]) => {
    try {
      setLoading(true);
      // Xóa hết và chèn lại (upsert)
      const { error: upsertError } = await supabase
        .from(TABLE_NAME)
        .upsert(newUsers);

      if (upsertError) throw upsertError;

      setUsers(newUsers);
      setError(null);
    } catch (err) {
      console.error('Error saving users:', err);
      setError('Failed to save users');
    } finally {
      setLoading(false);
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
  const upsertUser = useCallback(async (user: SystemUser) => {
    try {
      setLoading(true);
      const index = users.findIndex(u => u.msnv === user.msnv);
      let newUsers: SystemUser[];

      if (index >= 0) {
        newUsers = [...users];
        newUsers[index] = { ...user, updatedAt: new Date().toISOString() };
      } else {
        newUsers = [...users, { ...user, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
      }

      // Cập nhật trên Supabase
      const { error: upsertError } = await supabase
        .from(TABLE_NAME)
        .upsert(newUsers[index >= 0 ? index : newUsers.length - 1]);

      if (upsertError) throw upsertError;

      setUsers(newUsers);
      setError(null);
    } catch (err) {
      console.error('Error upserting user:', err);
      setError('Failed to save user');
    } finally {
      setLoading(false);
    }
  }, [users]);

  // Delete a user
  const deleteUser = useCallback(async (msnv: string) => {
    try {
      setLoading(true);
      const { error: deleteError } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('msnv', msnv);

      if (deleteError) throw deleteError;

      const newUsers = users.filter(u => u.msnv !== msnv);
      setUsers(newUsers);
      setError(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    } finally {
      setLoading(false);
    }
  }, [users]);

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
 * Get all system users synchronously (fallback to localStorage)
 */
export function getSystemUsers(): SystemUser[] {
  try {
    const stored = localStorage.getItem(TABLE_NAME);
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
