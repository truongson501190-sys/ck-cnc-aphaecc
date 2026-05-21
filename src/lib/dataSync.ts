import {
  getSupabase,
  syncDataToSupabase,
  loadDataFromSupabase
} from '@/supabase';

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

    // Check connection mỗi 30s
    setInterval(() => this.checkConnection(), 30000);

    // Full sync mỗi 10 phút
    setInterval(() => {
      if (this.isConnected && navigator.onLine) {
        this.fullSync().catch(() => {});
      }
    }, 10 * 60 * 1000);
  }

  // ================= CONNECTION CHECK =================
  private async checkConnection() {
    // Check internet local
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
      // Use Supabase client query to check connection as requested
      const { error } = await client
        .from('users')
        .select('id')
        .limit(1);

      if (error) {
        // Handle 401 specifically for clarity
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
      const tables = [
        { key: 'users', table: 'users' },
        { key: 'userRecords', table: 'user_records' },
        { key: 'systemUsers', table: 'user_records' },
        { key: 'categoryTypes', table: 'categories' },
        { key: 'machines', table: 'machines' },
        { key: 'projects', table: 'projects' },
        { key: 'employees', table: 'users' },
        { key: 'warehouses', table: 'warehouses' },
        { key: 'productionReports', table: 'production_reports' },
        { key: 'maintenanceReports', table: 'maintenance_reports' },
        { key: 'qcReports', table: 'qc_reports' },
      ];

      for (const { key, table } of tables) {
        const localData = localStorage.getItem(key);

        if (!localData) continue;

        try {
          const data = JSON.parse(localData);

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
      const tables = [
        { key: 'users', table: 'users' },
        { key: 'userRecords', table: 'user_records' },
        { key: 'systemUsers', table: 'user_records' },
        { key: 'categoryTypes', table: 'categories' },
        { key: 'machines', table: 'machines' },
        { key: 'projects', table: 'projects' },
        { key: 'employees', table: 'users' },
        { key: 'warehouses', table: 'warehouses' },
        { key: 'productionReports', table: 'production_reports' },
        { key: 'maintenanceReports', table: 'maintenance_reports' },
        { key: 'qcReports', table: 'qc_reports' },
      ];

      for (const { key, table } of tables) {
        try {
          const cloudData = await loadDataFromSupabase(table);

          if (cloudData) {
            localStorage.setItem(key, JSON.stringify(cloudData));
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

    const client = getSupabase();
    if (!client) return false;

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
        'users',
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