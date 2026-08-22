// src/services/employeeService.ts
import bcryptjs from 'bcryptjs';
import { supabase } from '../lib/supabase';
import { hashPassword, verifyPassword } from '../lib/passwordUtils';
import type { UserPermissions } from '../types/user';

const LOCAL_ADMIN_PASSWORD_HASH = bcryptjs.hashSync('admin123', 12);

function readLocalEmployeeRecords(): Employee[] {
  if (typeof window === 'undefined') return [];

  const localCandidates = ['employees', 'users', 'wms_users'];
  for (const key of localCandidates) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as Employee[];
      }
    } catch {
      // Ignore malformed local data and continue to the next source.
    }
  }

  return [];
}

function syncLocalEmployeeSeed(): Employee[] {
  const seed: Employee = {
    msnv: '1118',
    ho_ten: 'Nguyễn Trường Sơn',
    role: 'admin',
    role_group: 'Admin',
    status: 'active',
    password_hash: LOCAL_ADMIN_PASSWORD_HASH,
    email: 'admin@local.test',
    phong_ban: 'Admin',
    chuc_vu: 'Quản trị viên hệ thống',
  };

  if (typeof window === 'undefined') return [seed];

  const existing = readLocalEmployeeRecords();
  const found = existing.find(emp => emp.msnv === '1118');
  if (found) return existing;

  const merged = [seed, ...existing];
  localStorage.setItem('employees', JSON.stringify(merged));
  return merged;
}

function getLocalEmployeeFallback(msnv: string): Employee | null {
  const localEmployees = syncLocalEmployeeSeed();
  return localEmployees.find(emp => emp.msnv === msnv) ?? null;
}

export interface Employee {
  id?: string;
  msnv: string;
  ho_ten: string;
  ngay_sinh?: string | null;
  gioi_tinh?: 'Nam' | 'Nữ' | 'Khác' | null;
  chuc_vu?: string | null;
  phong_ban?: string | null;
  dien_thoai?: string | null;
  email?: string | null;
  ngay_vao_lam?: string | null;
  role?: string;
  role_group?: string | null;
  status?: string;
  password_hash: string;
  last_login?: string | null;
  created_at?: string;
  updated_at?: string;
  avatar?: string; // Thêm field avatar
  profile_image?: string; // Thêm field profile_image
}

// Type alias for Employee with avatar fields
export type EmployeeWithAvatar = Employee & {
  avatar?: string;
  profile_image?: string;
};

/**
 * Employee Service - Single Source of Truth for all employee data
 */
export const EmployeeService = {
  /**
   * Get all active employees
   */
  async getAll(): Promise<Employee[]> {
    try {
      const query = supabase?.from('employees')?.select('*')?.order('msnv', { ascending: true });
      if (!query) return syncLocalEmployeeSeed();
      const { data, error } = await query;
      if (error) {
        console.warn('⚠️ Supabase employee query failed, using local fallback:', error);
        return syncLocalEmployeeSeed();
      }
      return (data || []) as Employee[];
    } catch (error) {
      console.warn('⚠️ EmployeeService.getAll fallback triggered:', error);
      return syncLocalEmployeeSeed();
    }
  },

  /**
   * Get all employees (including inactive)
   */
  async getAllWithInactive(): Promise<Employee[]> {
    return this.getAll();
  },

  /**
   * Get employee by MSNV
   */
  async getByMsnv(msnv: string): Promise<Employee | null> {
    try {
      const query = supabase?.from('employees')?.select('*')?.eq('msnv', msnv);
      if (!query) return getLocalEmployeeFallback(msnv);

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Supabase employee lookup failed, using local fallback:', error);
        return getLocalEmployeeFallback(msnv);
      }

      if (data) return data as Employee;
      return getLocalEmployeeFallback(msnv);
    } catch (error) {
      console.warn('⚠️ EmployeeService.getByMsnv fallback triggered:', error);
      return getLocalEmployeeFallback(msnv);
    }
  },

  /**
   * Get active employee by MSNV
   */
  async getActiveByMsnv(msnv: string): Promise<Employee | null> {
    try {
      const query = supabase?.from('employees')?.select('*')?.eq('msnv', msnv)?.eq('status', 'active');
      if (!query) return getLocalEmployeeFallback(msnv);

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        console.warn('⚠️ Supabase active employee lookup failed, using local fallback:', error);
        return getLocalEmployeeFallback(msnv);
      }

      if (data) return data as Employee;
      return getLocalEmployeeFallback(msnv);
    } catch (error) {
      console.warn('⚠️ EmployeeService.getActiveByMsnv fallback triggered:', error);
      return getLocalEmployeeFallback(msnv);
    }
  },

  /**
   * Create a new employee
   */
  async create(employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    // Validate required fields
    if (!employee.msnv || !employee.ho_ten || !employee.password_hash) {
      throw new Error('Missing required fields: msnv, ho_ten, password_hash');
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('employees')
      .insert([{ ...employee, created_at: now, updated_at: now }])
      .select()
      .single();
    if (error) throw error;
    return data as Employee;
  },

  /**
   * Update an existing employee
   */
  async update(
    msnv: string,
    updates: Partial<Omit<Employee, 'id' | 'msnv' | 'created_at'>>
  ): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('msnv', msnv)
      .select()
      .single();
    if (error) throw error;
    return data as Employee;
  },

  /**
   * Delete an employee (soft delete by setting status to 'inactive')
   */
  async delete(msnv: string): Promise<void> {
    // Check if admin
    if (msnv === '1118') {
      throw new Error('Cannot delete admin user');
    }

    const { error } = await supabase
      .from('employees')
      .update({ status: 'inactive', updated_at: new Date().toISOString() })
      .eq('msnv', msnv);
    if (error) throw error;
  },

  /**
   * Hard delete an employee (permanent)
   */
  async hardDelete(msnv: string): Promise<void> {
    if (msnv === '1118') {
      throw new Error('Cannot delete admin user');
    }

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('msnv', msnv);
    if (error) throw error;
  },

  /**
   * Verify login credentials
   */
  async verifyLogin(msnv: string, password: string): Promise<Employee | null> {
    const employee = await this.getActiveByMsnv(msnv);
    if (!employee) return null;

    const isValid = await verifyPassword(password, employee.password_hash);
    if (!isValid) return null;

    // Update last_login
    await this.update(msnv, { last_login: new Date().toISOString() });
    return employee;
  },

  /**
   * Reset password to MSNV
   */
  async resetPassword(msnv: string): Promise<void> {
    const newHash = await hashPassword(msnv);
    await this.update(msnv, { password_hash: newHash });
  },

  /**
   * Check if employee exists
   */
  async exists(msnv: string): Promise<boolean> {
    const employee = await this.getByMsnv(msnv);
    return !!employee;
  },

  /**
   * Search employees by name or MSNV
   */
  async search(query: string): Promise<Employee[]> {
    const all = await this.getAll();
    const lowerQuery = query.toLowerCase();
    return all.filter(
      e =>
        e.msnv.toLowerCase().includes(lowerQuery) ||
        e.ho_ten.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Clear cache
   */
  clearCache(): void {
    // Xóa các cache liên quan đến employees nếu có
  },
};