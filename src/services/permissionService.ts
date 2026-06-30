// src/services/permissionService.ts
import { supabase } from '../lib/supabase';
import {
  type UserPermissions,
  type PermissionLevel,
  levelToFlag,
  flagToLevel,
  permissionsToLevels,
  levelsToPermissions,
  createDefaultPermissions as createDefaultPermissionLevels,
  PERMISSION_KEYS,
} from '../lib/permissions';

export interface UserPermission {
  id?: string;
  msnv: string;
  module_key: string;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_export: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Permission Service - Single Source of Truth for all permissions
 */
export const PermissionService = {
  /**
   * Get all permissions for an employee as UserPermissions (PermissionFlag format)
   */
  async getByMsnv(msnv: string): Promise<UserPermissions> {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('msnv', msnv);

    if (error) throw error;

    // Tạo map với tất cả keys có permission mặc định
    const result: UserPermissions = {};
    for (const key of PERMISSION_KEYS) {
      result[key] = { view: false, add: false, edit: false, delete: false, approve: false, export: false };
    }

    // Ghi đè với dữ liệu từ database
    for (const p of (data as UserPermission[])) {
      result[p.module_key] = {
        view: p.can_view,
        add: p.can_add,
        edit: p.can_edit,
        delete: p.can_delete,
        approve: p.can_approve,
        export: p.can_export,
      };
    }

    return result;
  },

  /**
   * Get all permissions for an employee as PermissionLevel map
   */
  async getLevelsByMsnv(msnv: string): Promise<Record<string, PermissionLevel>> {
    const permissions = await this.getByMsnv(msnv);
    return permissionsToLevels(permissions);
  },

  /**
   * Get all permissions grouped by employee MSNV
   */
  async getAllGrouped(): Promise<Record<string, UserPermission[]>> {
    const { data, error } = await supabase.from('user_permissions').select('*');
    if (error) throw error;

    const grouped: Record<string, UserPermission[]> = {};
    for (const perm of (data as UserPermission[])) {
      if (!grouped[perm.msnv]) grouped[perm.msnv] = [];
      grouped[perm.msnv].push(perm);
    }
    return grouped;
  },

  /**
   * Save permissions for an employee (replace all existing)
   * Accepts either UserPermissions (PermissionFlag) or PermissionLevel map
   */
  async saveForMsnv(
    msnv: string,
    permissions: UserPermissions | Record<string, PermissionLevel>
  ): Promise<void> {
    // Kiểm tra xem là PermissionFlag hay PermissionLevel
    const isLevelMap = Object.values(permissions).every(
      v => v === 'none' || v === 'view' || v === 'full'
    );

    let userPermissions: UserPermissions;
    if (isLevelMap) {
      userPermissions = levelsToPermissions(permissions as Record<string, PermissionLevel>);
    } else {
      userPermissions = permissions as UserPermissions;
    }

    // First delete existing
    const { error: deleteError } = await supabase
      .from('user_permissions')
      .delete()
      .eq('msnv', msnv);
    if (deleteError) throw deleteError;

    // Prepare insert data
    const now = new Date().toISOString();
    const toInsert: Omit<UserPermission, 'id' | 'created_at' | 'updated_at'>[] = [];

    for (const [module_key, flag] of Object.entries(userPermissions)) {
      toInsert.push({
        msnv,
        module_key,
        can_view: flag.view,
        can_add: flag.add,
        can_edit: flag.edit,
        can_delete: flag.delete,
        can_approve: flag.approve,
        can_export: flag.export,
      });
    }

    if (toInsert.length === 0) return;

    const { error: insertError } = await supabase
      .from('user_permissions')
      .insert(toInsert.map(p => ({ ...p, created_at: now, updated_at: now })));

    if (insertError) throw insertError;

    // Clear cache
    this.clearCache(msnv);
  },

  /**
   * Save permissions as PermissionLevel map
   */
  async saveLevelsForMsnv(
    msnv: string,
    levels: Record<string, PermissionLevel>
  ): Promise<void> {
    await this.saveLevelsForMsnv(msnv, permissions);
  },

  /**
   * Create default permissions for a new employee
   */
  async createDefaultPermissions(msnv: string): Promise<void> {
    const defaultLevels = createDefaultPermissionLevels();
    await this.saveLevelsForMsnv(msnv, defaultLevels);
  },

  /**
   * Check if employee has permission for a module
   */
  async checkPermission(
    msnv: string,
    moduleKey: string,
    required: 'view' | 'edit'
  ): Promise<boolean> {
    const permissions = await this.getByMsnv(msnv);
    const flag = permissions[moduleKey];
    if (!flag) return false;
    if (required === 'view') return flag.view || flag.edit || flag.add || flag.delete || flag.approve;
    if (required === 'edit') return flag.edit || flag.add || flag.delete || flag.approve;
    return false;
  },

  /**
   * Clear cache for an employee
   */
  clearCache(msnv: string): void {
    const keys = [
      `permissions_${msnv}`,
      `wms_permissions_${msnv}`,
    ];
    for (const key of keys) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  },

  /**
   * Clear all permission cache
   */
  clearAllCache(): void {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('permissions_') || key.startsWith('wms_permissions_')) {
        localStorage.removeItem(key);
      }
    }
  },
};

// Export helper functions for backward compatibility
export const loadPermissions = PermissionService.getByMsnv;
export const savePermissions = PermissionService.saveForMsnv;