import { migrateLegacyTransactionsToLedger } from '@/core/stock-ledger/legacyMigration';

let bootstrapped = false;

/** Run once per session: legacy localStorage → stock_ledger */
export async function bootstrapErpInventory(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;
  try {
    const result = await migrateLegacyTransactionsToLedger();
    if (result.migrated > 0) {
      console.log(
        `✅ ERP: migrated ${result.migrated} ledger lines (${result.skipped} skipped)`
      );
    }
  } catch (e) {
    console.warn('ERP inventory bootstrap:', e);
  }
}
