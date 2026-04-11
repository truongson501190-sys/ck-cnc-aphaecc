import { getSupabase, syncDataToSupabase, loadDataFromSupabase } from '@/lib/supabase';

// Data synchronization service
export class DataSyncService {
  private static instance: DataSyncService;
  private isOnline = false;

  private constructor() {
    this.checkConnection();
    this.watchLocalChanges();
    // Check connection every 15 seconds
    setInterval(() => this.checkConnection(), 15000);
    // Periodic full sync every 5 minutes if online
    setInterval(() => {
      if (this.isConnected) {
        console.log('🕒 Periodic background sync starting...');
        this.fullSync().catch(err => console.error('Periodic sync failed:', err));
      }
    }, 5 * 60 * 1000);
  }

  static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  private async checkConnection() {
    const client = getSupabase();
    if (!client) {
      this.isOnline = false;
      return;
    }

    try {
      const { data, error } = await client.from('users').select('*', { count: 'exact', head: true });
      this.isOnline = !error;
    } catch {
      this.isOnline = false;
    }
  }

  get isConnected(): boolean {
    return this.isOnline;
  }

  // Sync local data to Supabase
  async syncToCloud() {
    const client = getSupabase();
    if (!client) return false;

    try {
      console.log('🔄 Starting sync to cloud...');
      const tables = [
        { key: 'users', table: 'users' },
        { key: 'userRecords', table: 'user_records' },
        { key: 'inventoryItems', table: 'inventory_items' },
        { key: 'categoryTypes', table: 'category_types' },
        { key: 'category_items', table: 'inventory_items' },
        { key: 'category_warehouses', table: 'warehouse_locations' },
        { key: 'warehouseLocations', table: 'warehouse_locations' },
        { key: 'warehouseTransactions', table: 'warehouse_transactions' },
        { key: 'warehouseExports', table: 'warehouse_exports' },
        { key: 'warehouseImports', table: 'warehouse_imports' },
        { key: 'warehouseTransfers', table: 'warehouse_transfers' }
      ];

      for (const { key, table } of tables) {
        const localData = localStorage.getItem(key);
        if (localData) {
          const data = JSON.parse(localData);
          if (Array.isArray(data) && data.length > 0) {
            await syncDataToSupabase(table, data);
          }
        }
      }

      console.log('✅ All data synced to cloud');
      return true;
    } catch (error) {
      console.error('❌ Sync to cloud failed:', error);
      return false;
    }
  }

  // Load data from Supabase to local
  async syncFromCloud() {
    const client = getSupabase();
    if (!client) return false;

    try {
      console.log('🔄 Starting sync from cloud...');
      const tables = [
        { key: 'users', table: 'users' },
        { key: 'userRecords', table: 'user_records' },
        { key: 'inventoryItems', table: 'inventory_items' },
        { key: 'categoryTypes', table: 'category_types' },
        { key: 'category_items', table: 'inventory_items' },
        { key: 'category_warehouses', table: 'warehouse_locations' },
        { key: 'warehouseLocations', table: 'warehouse_locations' },
        { key: 'warehouseTransactions', table: 'warehouse_transactions' },
        { key: 'warehouseExports', table: 'warehouse_exports' },
        { key: 'warehouseImports', table: 'warehouse_imports' },
        { key: 'warehouseTransfers', table: 'warehouse_transfers' }
      ];

      for (const { key, table } of tables) {
        const cloudData = await loadDataFromSupabase(table);
        if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
          localStorage.setItem(key, JSON.stringify(cloudData));
        }
      }

      console.log('✅ All data synced from cloud');
      return true;
    } catch (error) {
      console.error('❌ Sync from cloud failed:', error);
      return false;
    }
  }

  // Bidirectional sync - IMPROVED
  async fullSync() {
    const client = getSupabase();
    if (!client) return false;

    console.log('🚀 Starting full bidirectional sync...');
    
    // 1. First push local changes to cloud to ensure we don't lose them
    // (Note: in a perfect system we'd merge, but for this app we push then pull)
    await this.syncToCloud();
    
    // 2. Then pull from cloud to get changes from other devices
    await this.syncFromCloud();

    return true;
  }

  // Auto-sync on data changes
  watchLocalChanges() {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key: string, value: string) => {
      originalSetItem.call(localStorage, key, value);

      // Auto-sync important data changes
      const syncKeys = [
        'users', 'userRecords', 'inventoryItems', 'warehouseTransactions', 
        'categoryTypes', 'category_items', 'category_warehouses',
        'warehouseLocations', 'warehouseExports', 'warehouseImports', 'warehouseTransfers'
      ];

      if (syncKeys.includes(key)) {
        if (this.isConnected) {
          console.log(`📡 Local change detected in ${key}, triggering sync...`);
          // Debounce slightly to avoid too many requests
          if ((this as any)._syncTimeout) clearTimeout((this as any)._syncTimeout);
          (this as any)._syncTimeout = setTimeout(() => this.syncToCloud(), 2000);
        }
      }
    };
  }
}
}

export const dataSync = DataSyncService.getInstance();