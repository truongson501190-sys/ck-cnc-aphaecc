import { getSupabase, syncDataToSupabase, loadDataFromSupabase } from '@/supabase';

// Data synchronization service
export class DataSyncService {
  private static instance: DataSyncService;
  private isOnline = false;
  private isSyncingInternal = false;

  private constructor() {
    this.checkConnection();
    this.watchLocalChanges();
    // Check connection every 30 seconds
    setInterval(() => this.checkConnection(), 30000);
    // Periodic full sync every 10 minutes if online
    setInterval(() => {
      if (this.isConnected && navigator.onLine) {
        this.fullSync().catch(() => {});
      }
    }, 10 * 60 * 1000);
  }

  static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  private async checkConnection() {
    // 1. Hardware check (fastest, no network call)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.isOnline = false;
      return;
    }

    const client = getSupabase();
    if (!client) {
      this.isOnline = false;
      return;
    }

    // 2. DNS Error Throttling: If we had a DNS error, don't retry for 30 seconds
    const now = Date.now();
    const lastDnsError = (this as any)._lastDnsError || 0;
    if (lastDnsError && (now - lastDnsError < 30000)) { // 30 seconds
      // Still check if we're back online via navigator
      if (typeof navigator !== 'undefined' && navigator.onLine) {
         // Maybe it's fixed? Let's try once if it's been at least 10s
         if (now - lastDnsError < 10000) return;
      } else {
        return;
      }
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        this.isOnline = false;
        return;
      }

      // 3. Silent check using fetch with short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`, { 
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      this.isOnline = response.ok || response.status === 401;
      (this as any)._lastDnsError = null;
    } catch (err: any) {
      this.isOnline = false;
      // Mark as DNS/Network error to silence future checks
      if (err?.name === 'TypeError' || err?.name === 'AbortError' || err?.message?.includes('net::ERR')) {
        (this as any)._lastDnsError = Date.now();
      }
    }
  }

  get isConnected(): boolean {
    return this.isOnline;
  }

  // Sync local data to Supabase
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
        { key: 'warehouseTransactions', table: 'warehouse_transactions' },
        { key: 'inventoryItems', table: 'categories' },
        { key: 'warehouseLocations', table: 'warehouses' },
        { key: 'warehouseExports', table: 'warehouse_transactions' },
        { key: 'warehouseImports', table: 'warehouse_transactions' },
        { key: 'warehouseTransfers', table: 'warehouse_transactions' }
      ];

      for (const { key, table } of tables) {
        const localData = localStorage.getItem(key);
        if (localData) {
          try {
            const data = JSON.parse(localData);
            if (Array.isArray(data) && data.length > 0) {
              const success = await syncDataToSupabase(table, data);
              if (!success) {
                console.warn(`⚠️ Sync to cloud failed for table ${table}`);
                allSuccess = false;
              }
            }
          } catch (e) {
            console.error(`❌ Error parsing/syncing ${key}:`, e);
            allSuccess = false;
          }
        }
      }

      if (allSuccess) console.log('✅ All data synced to cloud');
      return allSuccess;
    } catch (error) {
      console.error('❌ syncToCloud critical error:', error);
      return false;
    }
  }

  // Load data from Supabase to local
  async syncFromCloud() {
    if (!navigator.onLine) return false;
    const client = getSupabase();
    if (!client) return false;

    console.log('🔄 Starting sync from cloud...');
    let allSuccess = true;
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
        { key: 'warehouseTransactions', table: 'warehouse_transactions' },
        { key: 'inventoryItems', table: 'categories' },
        { key: 'warehouseLocations', table: 'warehouses' },
        { key: 'warehouseExports', table: 'warehouse_transactions' },
        { key: 'warehouseImports', table: 'warehouse_transactions' },
        { key: 'warehouseTransfers', table: 'warehouse_transactions' }
      ];

      for (const { key, table } of tables) {
        try {
          const cloudData = await loadDataFromSupabase(table);
          if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
            localStorage.setItem(key, JSON.stringify(cloudData));
          } else if (cloudData === null) {
            console.warn(`⚠️ Sync from cloud failed for table ${table}`);
            allSuccess = false;
          }
        } catch (e) {
          console.error(`❌ Error loading ${table}:`, e);
          allSuccess = false;
        }
      }

      if (allSuccess) console.log('✅ All data synced from cloud');
      return allSuccess;
    } catch (error) {
      console.error('❌ syncFromCloud critical error:', error);
      return false;
    } finally {
      this.isSyncingInternal = false;
    }
  }

  // Bidirectional sync - IMPROVED
  async fullSync() {
    if (!navigator.onLine) return false;
    
    const client = getSupabase();
    if (!client) return false;

    console.log('🚀 Starting full bidirectional sync...');
    
    // 1. Push local changes to cloud
    // We don't stop if this fails, we want to at least try to get new data
    try {
      await this.syncToCloud();
    } catch (e) {
      console.error('Push phase of fullSync failed:', e);
    }
    
    // 2. Pull from cloud to get changes from other devices
    let pullSuccess = false;
    try {
      pullSuccess = await this.syncFromCloud();
    } catch (e) {
      console.error('Pull phase of fullSync failed:', e);
    }

    // 3. Notify app that data has changed
    if (pullSuccess) {
      window.dispatchEvent(new CustomEvent('app-data-synced'));
    }

    return pullSuccess;
  }

  // Auto-sync on data changes
  watchLocalChanges() {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key: string, value: string) => {
      originalSetItem.call(localStorage, key, value);

      // Auto-sync important data changes
      const syncKeys = [
        'users', 'userRecords', 'systemUsers', 'categoryTypes', 'machines', 
        'projects', 'employees', 'warehouses', 'warehouseTransactions',
        'inventoryItems', 'warehouseLocations', 'warehouseExports', 'warehouseImports', 'warehouseTransfers'
      ];

      if (syncKeys.includes(key)) {
        if (navigator.onLine && !this.isSyncingInternal) {
          // Debounce slightly
          if ((this as any)._syncTimeout) clearTimeout((this as any)._syncTimeout);
          (this as any)._syncTimeout = setTimeout(() => {
            if (navigator.onLine && !this.isSyncingInternal) {
              this.syncToCloud().catch(() => {});
            }
          }, 5000); // 5 seconds debounce for less noise
        }
      }
    };
  }
}

export const dataSync = DataSyncService.getInstance();