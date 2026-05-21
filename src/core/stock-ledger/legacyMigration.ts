import { getSupabase } from '@/supabase';
import type { WarehouseTransaction, WarehouseTransactionItem } from '@/types/inventory';
import { resolveProductId, resolveWarehouseId } from './resolveIds';
import type { WarehouseMovementKind } from './types';

const MIGRATION_FLAG = 'erp_stock_ledger_migrated_v1';

type LegacyTx = WarehouseTransaction & {
  itemName?: string;
  itemId?: string;
  toLocation?: string;
  fromLocation?: string;
  operator?: string;
};

function isPostedStatus(status: string | undefined): boolean {
  return status === 'approved' || status === 'completed';
}

function movementKind(type: string): WarehouseMovementKind | null {
  switch (type) {
    case 'import':
      return 'IN';
    case 'export':
      return 'OUT';
    case 'transfer':
      return 'TRANSFER';
    case 'oil_export':
      return 'OIL_OUT';
    default:
      return null;
  }
}

function expandLines(tx: LegacyTx): Array<{
  productId: string;
  quantity: number;
  unitCost: number;
  lineId: string;
}> {
  const lines: Array<{
    productId: string;
    quantity: number;
    unitCost: number;
    lineId: string;
  }> = [];

  if (tx.items && tx.items.length > 0) {
    tx.items.forEach((item: WarehouseTransactionItem, idx) => {
      const productId = resolveProductId(
        item.category_id || item.itemName || ''
      );
      if (!productId) return;
      lines.push({
        productId,
        quantity: Number(item.quantity) || 0,
        unitCost: Number(item.price) || 0,
        lineId: item.id || `${tx.id}-line-${idx}`,
      });
    });
    return lines;
  }

  const productId = resolveProductId(
    tx.category_id || tx.itemId || tx.itemName || ''
  );
  const qty = Number(tx.quantity) || 0;
  if (productId && qty > 0) {
    lines.push({
      productId,
      quantity: qty,
      unitCost: Number(tx.price) || 0,
      lineId: `${tx.id}-line-0`,
    });
  }
  return lines;
}

/** One-time migration: localStorage warehouseTransactions → stock_ledger via RPC */
export async function migrateLegacyTransactionsToLedger(): Promise<{
  migrated: number;
  skipped: number;
}> {
  if (localStorage.getItem(MIGRATION_FLAG) === 'done') {
    return { migrated: 0, skipped: 0 };
  }

  const client = getSupabase();
  if (!client) {
    return { migrated: 0, skipped: 0 };
  }

  let raw: LegacyTx[] = [];
  try {
    const saved = localStorage.getItem('warehouseTransactions');
    if (saved) raw = JSON.parse(saved) as LegacyTx[];
  } catch {
    raw = [];
  }

  let migrated = 0;
  let skipped = 0;

  for (const tx of raw) {
    if (!isPostedStatus(tx.status)) {
      skipped++;
      continue;
    }
    const kind = movementKind(tx.type);
    if (!kind) {
      skipped++;
      continue;
    }

    const lines = expandLines(tx);
    if (lines.length === 0) {
      skipped++;
      continue;
    }

    const warehouseId = resolveWarehouseId(
      tx.warehouse_id || tx.toLocation || tx.fromLocation
    );
    const fromWh = resolveWarehouseId(tx.from_warehouse_id || tx.fromLocation);
    const toWh = resolveWarehouseId(tx.to_warehouse_id || tx.toLocation);
    const occurredAt = tx.transactionDate
      ? new Date(tx.transactionDate).toISOString()
      : new Date().toISOString();

    for (const line of lines) {
      const { error } = await client.rpc('post_warehouse_movement', {
        p_movement_kind: kind,
        p_product_id: line.productId,
        p_quantity: line.quantity,
        p_warehouse_id:
          kind === 'IN' ? toWh || warehouseId : kind === 'OUT' || kind === 'OIL_OUT' ? fromWh || warehouseId : null,
        p_from_warehouse_id: kind === 'TRANSFER' ? fromWh : null,
        p_to_warehouse_id: kind === 'TRANSFER' ? toWh : kind === 'IN' ? toWh || warehouseId : null,
        p_unit_cost: line.unitCost,
        p_reference: tx.referenceNumber || tx.id,
        p_legacy_transaction_id: `${tx.id}:${line.lineId}`,
        p_created_by: tx.created_by || tx.operator || null,
        p_notes: tx.notes || null,
        p_occurred_at: occurredAt,
      });

      if (error) {
        console.warn('Legacy migration row failed:', error.message, tx.id);
        skipped++;
      } else {
        migrated++;
      }
    }
  }

  if (migrated > 0 || raw.length === 0) {
    localStorage.setItem(MIGRATION_FLAG, 'done');
  }

  return { migrated, skipped };
}

export function resetLegacyMigrationFlag(): void {
  localStorage.removeItem(MIGRATION_FLAG);
}
