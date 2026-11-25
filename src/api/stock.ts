import { getSupabase } from '@/supabase';
import {
  mapTransactionTypeToKind,
  postWarehouseMovementToLedger,
} from '@/core/stock-ledger/postingApi';
import { resolveProductId, resolveWarehouseId } from '@/core/stock-ledger/resolveIds';
import type { PostMovementLineInput, WarehouseMovementKind } from '@/core/stock-ledger/types';
import type { WarehouseTransaction } from '@/types/inventory';
import type { StockLedgerRow } from '@/core/stock-ledger/types';
import {
  getMovements,
  getOnHand,
  getOnHandByProduct,
  getValuation,
  type MovementFilter,
} from '@/core/inventory-engine';

export type StockDocumentInput = WarehouseTransaction & {
  itemName?: string;
  itemId?: string;
  toLocation?: string;
  fromLocation?: string;
  operator?: string;
};

function buildLines(tx: StockDocumentInput): PostMovementLineInput[] {
  if (tx.items && tx.items.length > 0) {
    return tx.items
      .map((item, idx) => ({
        productId: resolveProductId(item.category_id || item.itemId || item.itemName || ''),
        quantity: Number(item.quantity) || 0,
        unitCost: Number(item.price) || 0,
        lineId: item.id || `line-${idx}`,
      }))
      .filter((l) => l.productId && l.quantity > 0);
  }

  const productId = resolveProductId(tx.category_id || tx.itemId || tx.itemName || '');
  const qty = Number(tx.quantity) || 0;
  if (!productId || qty <= 0) return [];

  return [
    {
      productId,
      quantity: qty,
      unitCost: Number(tx.price) || 0,
      lineId: 'line-0',
    },
  ];
}

/**
 * UI → API → stock_ledger (ONLY mutation path for inventory quantity)
 *
 * ⚠️ Thứ tự quan trọng:
 *   1. POST LEDGER trước — đây là nguồn chân lý của tồn kho
 *   2. Nếu ledger OK → mới upsert stock_documents (metadata phiếu)
 *   3. Ghi stock_document_lines (chi tiết items)
 *   4. Nếu ledger fail → KHÔNG ghi document (tránh orphan)
 */
export async function postStockDocument(
  document: StockDocumentInput
): Promise<{ ok: boolean; documentId: string }> {
  const documentId =
    document.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const status = document.status || 'approved';
  const shouldPost = status === 'approved' || status === 'completed';

  if (!shouldPost) {
    return { ok: false, documentId };
  }

  const kind = mapTransactionTypeToKind(document.type);
  const lines = buildLines(document);
  if (!kind || lines.length === 0) {
    return { ok: false, documentId };
  }

  // Tính total_value từ lines (fallback nếu UI không set)
  const computedTotal = lines.reduce(
    (s, l) => s + l.quantity * (l.unitCost ?? 0),
    0
  );

  // ─────────────────────────────────────────────────────────────
  // BƯỚC 1: POST LEDGER TRƯỚC
  // ─────────────────────────────────────────────────────────────
  const posted = await postWarehouseMovementToLedger({
    kind,
    lines,
    warehouseId: resolveWarehouseId(document.warehouse_id),
    fromWarehouseId: resolveWarehouseId(
      document.from_warehouse_id || document.fromLocation
    ),
    toWarehouseId: resolveWarehouseId(
      document.to_warehouse_id || document.toLocation
    ),
    reference: document.referenceNumber || documentId,
    legacyTransactionId: documentId,
    documentId,
    createdBy: document.created_by || document.operator,
    notes: document.notes,
    occurredAt: document.transactionDate
      ? new Date(document.transactionDate).toISOString()
      : undefined,
  });

  if (!posted) {
    console.error('postStockDocument: ledger post failed, document NOT written', documentId);
    return { ok: false, documentId };
  }

  // ─────────────────────────────────────────────────────────────
  // BƯỚC 2: GHI DOCUMENT HEADER (metadata)
  // ─────────────────────────────────────────────────────────────
  const client = getSupabase();
  if (client) {
    const { error } = await client.from('stock_documents').upsert(
      {
        id: documentId,
        document_type: kind,
        reference_number: document.referenceNumber || documentId,
        status: 'posted',
        transaction_date:
          document.transactionDate || new Date().toISOString().slice(0, 10),
        warehouse_id: resolveWarehouseId(
          document.warehouse_id || document.toLocation
        ),
        from_warehouse_id: resolveWarehouseId(
          document.from_warehouse_id || document.fromLocation
        ),
        to_warehouse_id: resolveWarehouseId(
          document.to_warehouse_id || document.toLocation
        ),
        total_value: document.totalValue || computedTotal,
        created_by: document.created_by || document.operator || null,
        notes: document.notes || null,
        posted_at: new Date().toISOString(),
        legacy_payload: document,
      },
      { onConflict: 'reference_number', ignoreDuplicates: false }
    );

    if (error) {
      console.error(
        'postStockDocument: stock_documents upsert failed (ledger OK):',
        error.message
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // BƯỚC 3: GHI STOCK_DOCUMENT_LINES (chi tiết items)
  // ─────────────────────────────────────────────────────────────
  if (client) {
    const rawItems = document.items && document.items.length > 0
      ? document.items
      : [];

    const docLines = rawItems
      .map((item, idx) => {
        const productId = resolveProductId(
          item.category_id || item.itemId || item.itemName || ''
        );
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        return {
          document_id: documentId,
          line_no: idx + 1,
          product_id: productId,
          quantity: qty,
          unit: item.unit || null,
          unit_cost: price,
          total_value: Number(item.totalValue) || qty * price,
          notes: item.ghiChu || null,
          machine_id: null,
          project_id: document.project_id || null,
        };
      })
      .filter((l) => l.product_id && l.quantity > 0);

    if (docLines.length > 0) {
      // Xóa lines cũ (nếu upsert lại cùng document_id) rồi insert mới
      await client
        .from('stock_document_lines')
        .delete()
        .eq('document_id', documentId);

      const { error: linesErr } = await client
        .from('stock_document_lines')
        .insert(docLines);

      if (linesErr) {
        console.error(
          'postStockDocument: stock_document_lines insert failed (ledger OK):',
          linesErr.message
        );
      }
    }
  }

  return { ok: true, documentId };
}

export async function listLedgerMovements(
  filter: MovementFilter = {}
): Promise<StockLedgerRow[]> {
  return getMovements(filter);
}

export async function listOnHandByProduct() {
  return getOnHandByProduct();
}

export async function listOnHand(filters?: { warehouseId?: string; productId?: string }) {
  return getOnHand(filters);
}

export async function getStockValuation(filters?: { warehouseId?: string }) {
  return getValuation(filters);
}

export function movementTypeLabel(type: string): string {
  switch (type) {
    case 'IN':
    case 'TRANSFER_IN':
      return 'Nhập';
    case 'OUT':
      return 'Xuất';
    case 'OIL_OUT':
      return 'Xuất dầu';
    case 'TRANSFER_OUT':
      return 'Chuyển (xuất)';
    case 'ADJUSTMENT':
      return 'Điều chỉnh';
    default:
      return type;
  }
}

export function matchesMovementFilter(
  movementType: string,
  filter: string
): boolean {
  if (filter === 'all') return true;
  if (filter === 'import') return movementType === 'IN' || movementType === 'TRANSFER_IN';
  if (filter === 'export') return movementType === 'OUT';
  if (filter === 'oil_export') return movementType === 'OIL_OUT';
  if (filter === 'transfer') {
    return movementType === 'TRANSFER_OUT' || movementType === 'TRANSFER_IN';
  }
  return true;
}

export function ledgerStatsFromMovements(movements: StockLedgerRow[]) {
  return {
    totalLines: movements.length,
    ins: movements.filter(
      (m) => m.movement_type === 'IN' || m.movement_type === 'TRANSFER_IN'
    ).length,
    outs: movements.filter(
      (m) =>
        m.movement_type === 'OUT' ||
        m.movement_type === 'OIL_OUT' ||
        m.movement_type === 'TRANSFER_OUT'
    ).length,
    transfers: movements.filter((m) => m.movement_type.startsWith('TRANSFER')).length,
    oilExports: movements.filter((m) => m.movement_type === 'OIL_OUT').length,
  };
}

export type { WarehouseMovementKind, MovementFilter };