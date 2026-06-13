// dataSync.ts
import {
  getSupabase,
  syncDataToSupabase,
  loadDataFromSupabase
} from '../supabase';

type SyncTableConfig = {
  key: string;
  table: string;
  mapper?: (item: any) => any;
  reverseMapper?: (item: any) => any;
};

// ================= HELPERS =================
// Map camelCase (localStorage) -> snake_case (Supabase) cho bảng users
const mapUserToSnake = (user: any) => ({
  msnv: user.msnv,
  full_name: user.fullName,
  department: user.department,
  position: user.position,
  role: user.role || 'user',
  role_group: user.roleGroup || user.position || 'user',
  status: user.status || 'active',
  created_at: user.createdAt || new Date().toISOString(),
  updated_at: user.updatedAt || new Date().toISOString(),
});

// Map camelCase -> snake_case cho bảng user_records
const mapUserRecordToSnake = (record: any) => ({
  msnv: record.msnv,
  full_name: record.fullName,
  department: record.department,
  position: record.position,
  role: record.role || 'user',
  role_group: record.roleGroup || record.role_group || record.position || 'user',
  status: typeof record.status === 'boolean' ? record.status : record.status === 'active',
  password_hash: record.passwordHash || record.password_hash || record.msnv,
  created_at: record.createdAt || new Date().toISOString(),
  updated_at: record.updatedAt || new Date().toISOString(),
});

// Data synchronization service
export class DataSyncService {
  private static instance: DataSyncService;

  private _syncTimeout?: number;
  private isConnected = false;
  private isSyncingInternal = false;

  // ================= SINGLETON =================
  static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  // ================= CONSTRUCTOR =================
  private constructor() {
    this.checkConnection();
    this.watchLocalChanges();

    setInterval(() => this.checkConnection(), 30000);
    setInterval(() => {
      if (this.isConnected && navigator.onLine) {
        this.fullSync().catch(() => {});
      }
    }, 10 * 60 * 1000);
  }

  // ================= CONNECTION CHECK =================
  private async checkConnection() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.isConnected = false;
      return;
    }

    const client = getSupabase();

    if (!client) {
      this.isConnected = false;
      return;
    }

    try {
      const { error } = await client
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        if (error.code === '401' || error.message?.includes('401') || error.code === 'PGRST301') {
          console.error('❌ Supabase connection error: 401 Unauthorized. Please check your Anon Key in .env');
        } else {
          console.error('❌ Supabase connection error:', error.message);
        }
        this.isConnected = false;
      } else {
        this.isConnected = true;
        console.log('✅ Supabase connected');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('❌ Connection failed:', errorMessage);
      this.isConnected = false;
    }
  }

  // ================= GETTER =================
  get connected(): boolean {
    return this.isConnected;
  }

  // ================= SYNC TO CLOUD =================
  async syncToCloud() {
    if (!navigator.onLine) return false;

    const client = getSupabase();
    if (!client) return false;

    console.log('🔄 Starting sync to cloud...');

    let allSuccess = true;

    try {
      const tables: SyncTableConfig[] = [
        { key: 'wms_users', table: 'users', mapper: mapUserToSnake },
        { key: 'userRecords', table: 'user_records', mapper: mapUserRecordToSnake },
        { key: 'systemUsers', table: 'user_records', mapper: mapUserRecordToSnake },
        { key: 'categoryTypes', table: 'categories' },
        { key: 'machines', table: 'machines' },
        { key: 'projects', table: 'projects' },
        { key: 'employees', table: 'users', mapper: mapUserToSnake },
        { key: 'warehouses', table: 'warehouses' },
        { key: 'productionReports', table: 'production_reports' },
        { key: 'maintenanceReports', table: 'maintenance_reports' },
        { key: 'qcReports', table: 'qc_reports' },
      ];

      for (const { key, table, mapper } of tables) {
        const localData = localStorage.getItem(key);

        if (!localData) continue;

        try {
          let data = JSON.parse(localData);

          // Áp dụng mapper nếu có
          if (mapper && Array.isArray(data)) {
            data = data.map(mapper);
          }

          if (Array.isArray(data) && data.length > 0) {
            const success = await syncDataToSupabase(table, data);

            if (!success) {
              allSuccess = false;
            }
          }
        } catch (e) {
          console.error(`❌ Error syncing ${key}:`, e);
          allSuccess = false;
        }
      }

      return allSuccess;
    } catch (error) {
      console.error('❌ syncToCloud error:', error);
      return false;
    }
  }

  // ================= SYNC FROM CLOUD =================
  async syncFromCloud() {
    if (!navigator.onLine) return false;

    const client = getSupabase();
    if (!client) return false;

    this.isSyncingInternal = true;

    try {
      // Các bảng cần đồng bộ, map ngược lại camelCase nếu muốn lưu localStorage theo camelCase
      // Ở đây tôi giữ nguyên dữ liệu nhận được (snake_case) và lưu thẳng vào localStorage,
      // nhưng các component khác có thể đọc theo camelCase → cần map lại.
      // Để đơn giản, ta map snake_case -> camelCase trước khi lưu.
      const tables: SyncTableConfig[] = [
        { key: 'wms_users', table: 'users', reverseMapper: (u: any) => ({
          msnv: u.msnv,
          fullName: u.full_name,
          department: u.department,
          position: u.position,
          roleGroup: u.role_group,
          status: u.status,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        })},
        { key: 'userRecords', table: 'user_records', reverseMapper: (r: any) => ({
          msnv: r.msnv,
          fullName: r.full_name,
          department: r.department,
          position: r.position,
          role: r.role,
          roleGroup: r.role_group || '',
          status: r.status,
          passwordHash: r.password_hash,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })},
        { key: 'systemUsers', table: 'user_records', reverseMapper: (r: any) => ({
          msnv: r.msnv,
          fullName: r.full_name,
          department: r.department,
          position: r.position,
          role: r.role,
          roleGroup: r.role_group || '',
          status: r.status,
          passwordHash: r.password_hash,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })},
        { key: 'categoryTypes', table: 'categories' },
        { key: 'machines', table: 'machines' },
        { key: 'projects', table: 'projects' },
        { key: 'employees', table: 'users', reverseMapper: (u: any) => ({
          msnv: u.msnv,
          fullName: u.full_name,
          department: u.department,
          position: u.position,
          roleGroup: u.role_group,
          status: u.status,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        })},
        { key: 'warehouses', table: 'warehouses' },
        { key: 'productionReports', table: 'production_reports' },
        { key: 'maintenanceReports', table: 'maintenance_reports' },
        { key: 'qcReports', table: 'qc_reports' },
      ];

      for (const { key, table, reverseMapper } of tables) {
        try {
          const cloudData = await loadDataFromSupabase(table);

          if (cloudData) {
            // Map ngược về camelCase trước khi lưu vào localStorage
            if (reverseMapper && Array.isArray(cloudData)) {
              localStorage.setItem(key, JSON.stringify(cloudData.map(reverseMapper)));
            } else {
              localStorage.setItem(key, JSON.stringify(cloudData));
            }
          }
        } catch (e) {
          console.error(`❌ Error loading ${table}:`, e);
        }
      }

      return true;
    } finally {
      this.isSyncingInternal = false;
    }
  }

  // ================= FULL SYNC =================
  async fullSync() {
    if (!navigator.onLine) return false;

    // 1. Push local changes
    try {
      await this.syncToCloud();
    } catch (e) {
      console.warn('Sync to cloud failed, trying pull anyway');
    }

    // 2. Pull from cloud
    const success = await this.syncFromCloud();

    if (success) {
      window.dispatchEvent(new CustomEvent('app-data-synced'));
    }

    return success;
  }

  // ================= WATCH LOCAL STORAGE =================
  watchLocalChanges() {
    if (typeof window === 'undefined') return;

    const originalSetItem = localStorage.setItem;

    localStorage.setItem = (key: string, value: string) => {
      originalSetItem.call(localStorage, key, value);

      const syncKeys = [
        'wms_users',
        'userRecords',
        'categoryTypes',
        'machines',
        'projects',
        'warehouses',
        'productionReports',
        'maintenanceReports',
        'qcReports',
      ];

      if (
        syncKeys.includes(key) &&
        navigator.onLine &&
        !this.isSyncingInternal
      ) {
        if (this._syncTimeout) {
          clearTimeout(this._syncTimeout);
        }

        this._syncTimeout = window.setTimeout(() => {
          this.syncToCloud().catch(() => {});
        }, 5000);
      }
    };
  }
}

export const dataSync = DataSyncService.getInstance();