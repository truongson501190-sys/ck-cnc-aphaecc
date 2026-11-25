import { getSupabase } from '@/supabase';
import { resolveProductId, resolveWarehouseId } from './resolveIds';
import type { PostWarehouseMovementInput, WarehouseMovementKind } from './types';

async function rpcPostMovement(params: Record<string, unknown>): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  const { error } = await client.rpc('post_warehouse_movement_weighted_average', params);
  if (error) {
    console.error('post_warehouse_movement_weighted_average RPC failed:', error.message);
    return false;
  }
  return true;
}

/** Direct insert fallback when RPC/migration not yet applied on Supabase */
async function fallbackInsertLedger(
  input: PostWarehouseMovementInput
): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  const occurredAt = input.occurredAt || new Date().toISOString();
  const rows: Array<Record<string, unknown>> = [];

  for (const line of input.lines) {
    const productId = resolveProductId(line.productId);
    const qty = Math.abs(line.quantity);
    const lineId = line.lineId || productId;

    if (!productId) {
      console.warn(
        'fallbackInsertLedger: skip line — cannot resolve productId',
        line.productId
      );
      continue;
    }
    if (qty <= 0) {
      console.warn('fallbackInsertLedger: skip line — qty <= 0', line.quantity);
      continue;
    }

    const base = {
      product_id: productId,
      unit_cost: line.unitCost ?? 0,
      document_type: input.kind,
      document_id: input.documentId ?? null,
      document_line_id: line.lineId ?? null,
      reference: input.reference,
      legacy_transaction_id: input.legacyTransactionId,
      created_by: input.createdBy ?? null,
      notes: input.notes ?? null,
      occurred_at: occurredAt,
    };

    if (input.kind === 'IN') {
      const wh = resolveWarehouseId(input.warehouseId || input.toWarehouseId);
      if (!wh || wh === 'default') {
        console.warn('fallbackInsertLedger: skip IN — cannot resolve warehouse');
        continue;
      }
      rows.push({
        ...base,
        warehouse_id: wh,
        movement_type: 'IN',
        qty_delta: qty,
        // ⚠️ PHẢI khớp công thức SQL: 'in:' || legacy_tx || ':' || product_id
        // SQL nhận legacy_transaction_id = "<txId>:<lineId>"
        // → key SQL = 'in:<txId>:<lineId>:<productId>'
        idempotency_key: `in:${input.legacyTransactionId}:${lineId}:${productId}`,
      });
    } else if (input.kind === 'OUT' || input.kind === 'OIL_OUT') {
      const wh = resolveWarehouseId(input.warehouseId || input.fromWarehouseId);
      if (!wh || wh === 'default') {
        console.warn('fallbackInsertLedger: skip OUT — cannot resolve warehouse');
        continue;
      }
      rows.push({
        ...base,
        warehouse_id: wh,
        movement_type: input.kind === 'OIL_OUT' ? 'OIL_OUT' : 'OUT',
        qty_delta: -qty,
        idempotency_key: `out:${input.legacyTransactionId}:${lineId}:${productId}`,
      });
    } else if (input.kind === 'TRANSFER') {
      const fromWh = resolveWarehouseId(input.fromWarehouseId);
      const toWh = resolveWarehouseId(input.toWarehouseId);
      if (!fromWh || fromWh === 'default' || !toWh || toWh === 'default') {
        console.warn('fallbackInsertLedger: skip TRANSFER — cannot resolve warehouses');
        continue;
      }
      rows.push({
        ...base,
        warehouse_id: fromWh,
        movement_type: 'TRANSFER_OUT',
        qty_delta: -qty,
        idempotency_key: `trf-out:${input.legacyTransactionId}:${lineId}:${productId}`,
      });
      rows.push({
        ...base,
        warehouse_id: toWh,
        movement_type: 'TRANSFER_IN',
        qty_delta: qty,
        idempotency_key: `trf-in:${input.legacyTransactionId}:${lineId}:${productId}`,
      });
    }
  }

  if (rows.length === 0) return false;

  const { error } = await client.from('stock_ledger').upsert(rows, {
    onConflict: 'idempotency_key',
    ignoreDuplicates: true,
  });

  if (error) {
    console.error('stock_ledger fallback insert failed:', error.message);
    return false;
  }
  return true;
}

export async function postWarehouseMovementToLedger(
  input: PostWarehouseMovementInput
): Promise<boolean> {
  if (input.lines.length === 0) return false;

  let allOk = true;

  for (const line of input.lines) {
    const productId = resolveProductId(line.productId);
    const qty = Math.abs(line.quantity);
    if (!productId || qty <= 0) continue;

    const lineId = line.lineId || productId;

    const params: Record<string, unknown> = {
      p_movement_kind: input.kind,
      p_product_id: productId,
      p_quantity: qty,
      p_unit_cost: line.unitCost ?? 0,
      p_reference: input.reference,
      // ⚠️ GHÉP lineId vào đây — SQL sẽ ghép thêm ':' || product_id ở cuối
      // → key SQL = 'in:<txId>:<lineId>:<productId>' — khớp với fallback
      p_legacy_transaction_id: `${input.legacyTransactionId}:${lineId}`,
      p_document_id: input.documentId ?? null,
      p_document_line_id: line.lineId ?? null,
      p_created_by: input.createdBy ?? null,
      p_notes: input.notes ?? null,
      p_occurred_at: input.occurredAt || new Date().toISOString(),
    };

    if (input.kind === 'IN') {
      params.p_warehouse_id = resolveWarehouseId(
        input.warehouseId || input.toWarehouseId
      );
    } else if (input.kind === 'OUT' || input.kind === 'OIL_OUT') {
      params.p_warehouse_id = resolveWarehouseId(
        input.warehouseId || input.fromWarehouseId
      );
    } else if (input.kind === 'TRANSFER') {
      params.p_from_warehouse_id = resolveWarehouseId(input.fromWarehouseId);
      params.p_to_warehouse_id = resolveWarehouseId(input.toWarehouseId);
    }

    const ok = await rpcPostMovement(params);
    if (!ok) {
      const fallbackOk = await fallbackInsertLedger({
        ...input,
        lines: [line],
      });
      if (!fallbackOk) allOk = false;
    }
  }

  return allOk;
}

export function mapTransactionTypeToKind(type: string): WarehouseMovementKind | null {
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