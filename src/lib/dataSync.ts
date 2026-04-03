import { getSupabase, syncDataToSupabase, loadDataFromSupabase } from '@/lib/supabase';

// Data synchronization service
export class DataSyncService {
  private static instance: DataSyncService;
  private isOnline = false;

  private constructor() {
    this.checkConnection();
    // Check connection every 30 seconds
    setInterval(() => this.checkConnection(), 30000);
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
      const { error } = await client.from('users').select('count').limit(1);
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
      const tables = [
        { key: 'users', table: 'users' },
        { key: 'userRecords', table: 'user_records' },
        { key: 'inventoryItems', table: 'inventory_items' },
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
          await syncDataToSupabase(table, Array.isArray(data) ? data : [data]);
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
      const tables = [
        { key: 'users', table: 'users' },
        { key: 'userRecords', table: 'user_records' },
        { key: 'inventoryItems', table: 'inventory_items' },
        { key: 'warehouseLocations', table: 'warehouse_locations' },
        { key: 'warehouseTransactions', table: 'warehouse_transactions' },
        { key: 'warehouseExports', table: 'warehouse_exports' },
        { key: 'warehouseImports', table: 'warehouse_imports' },
        { key: 'warehouseTransfers', table: 'warehouse_transfers' }
      ];

      for (const { key, table } of tables) {
        const cloudData = await loadDataFromSupabase(table);
        if (cloudData && cloudData.length > 0) {
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

  // Bidirectional sync
  async fullSync() {
    const client = getSupabase();
    if (!client) return false;

    // First sync from cloud to get latest data
    await this.syncFromCloud();
    // Then sync local changes to cloud
    await this.syncToCloud();

    return true;
  }

  // Auto-sync on data changes
  watchLocalChanges() {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = (key: string, value: string) => {
      originalSetItem.call(localStorage, key, value);

      // Auto-sync important data changes
      if (['users', 'userRecords', 'inventoryItems', 'warehouseTransactions'].includes(key)) {
        if (this.isOnline) {
          setTimeout(() => this.syncToCloud(), 1000); // Debounce sync
        }
      }
    };
  }
}

export const dataSync = DataSyncService.getInstance();