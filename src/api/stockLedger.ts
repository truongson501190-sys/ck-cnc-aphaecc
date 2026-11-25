import { getSupabase } from '@/supabase';

export interface LedgerRow {
  id: string;
  occurred_at: string;
  posted_at: string;
  warehouse_id: string;
  product_id: string;
  movement_type: string;
  qty_delta: number;
  unit_cost: number | null;
  document_type: string | null;
  document_id: string | null;
  document_line_id: string | null;
  reference: string | null;
  legacy_transaction_id: string | null;
  created_by: string | null;
  notes: string | null;
  idempotency_key: string | null;
}

export interface MovementFilter {
  warehouseId?: string;
  productId?: string;
  fromDate?: string;
  toDate?: string;
  movementTypes?: string[];
  limit?: number;
}

type Result<T> = { ok: true } & T | { ok: false; error: string };

// ============ LIST MOVEMENTS ============
export async function listMovements(filter: MovementFilter = {}): Promise<
  Result<{ data: LedgerRow[] }>
> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  let q = client
    .from('stock_ledger')
    .select('*')
    .order('occurred_at', { ascending: true });

  if (filter.warehouseId) q = q.eq('warehouse_id', filter.warehouseId);
  if (filter.productId)   q = q.eq('product_id', filter.productId);
  if (filter.fromDate)    q = q.gte('occurred_at', filter.fromDate);
  if (filter.toDate)      q = q.lte('occurred_at', filter.toDate);
  if (filter.movementTypes?.length) q = q.in('movement_type', filter.movementTypes);
  if (filter.limit)       q = q.limit(filter.limit);

  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as LedgerRow[] };
}

// ============ STOCK CARD (thẻ kho) ============
export async function getStockCard(params: {
  warehouseId: string;
  productId: string;
  fromDate?: string;
  toDate?: string;
}): Promise<Result<{ opening: number; rows: Array<LedgerRow & { running_qty: number }> }>> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  // Opening balance = tổng trước fromDate
  let opening = 0;
  if (params.fromDate) {
    const { data, error } = await client
      .from('stock_ledger')
      .select('qty_delta')
      .eq('warehouse_id', params.warehouseId)
      .eq('product_id', params.productId)
      .lt('occurred_at', params.fromDate);
    if (error) return { ok: false, error: error.message };
    opening = (data ?? []).reduce((s: number, r: any) => s + Number(r.qty_delta), 0);
  }

  const res = await listMovements({
    warehouseId: params.warehouseId,
    productId: params.productId,
    fromDate: params.fromDate,
    toDate: params.toDate,
  });
  if (!res.ok) return res;

  let running = opening;
  const rows = res.data.map(r => {
    running += Number(r.qty_delta);
    return { ...r, running_qty: running };
  });
  return { ok: true, opening, rows };
}

// ============ NXT REPORT ============
export interface NxtRow {
  warehouse_id: string;
  product_id: string;
  opening: number;
  in_qty: number;
  out_qty: number;
  transfer_in: number;
  transfer_out: number;
  adjust: number;
  closing: number;
}

export async function getNxtReport(params: {
  fromDate: string;
  toDate: string;
  warehouseId?: string;
  productId?: string;
}): Promise<Result<{ rows: NxtRow[] }>> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  let q = client.from('stock_ledger').select('*');
  if (params.warehouseId) q = q.eq('warehouse_id', params.warehouseId);
  if (params.productId)   q = q.eq('product_id', params.productId);

  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };

  const from = new Date(params.fromDate).getTime();
  const to = new Date(params.toDate).getTime();
  const map = new Map<string, NxtRow>();

  for (const r of (data ?? []) as LedgerRow[]) {
    const key = `${r.warehouse_id}|${r.product_id}`;
    if (!map.has(key)) {
      map.set(key, {
        warehouse_id: r.warehouse_id,
        product_id: r.product_id,
        opening: 0, in_qty: 0, out_qty: 0,
        transfer_in: 0, transfer_out: 0, adjust: 0, closing: 0,
      });
    }
    const row = map.get(key)!;
    const t = new Date(r.occurred_at).getTime();
    const qty = Number(r.qty_delta);

    if (t < from) {
      row.opening += qty;
    } else if (t <= to) {
      switch (r.movement_type) {
        case 'IN': row.in_qty += qty; break;
        case 'OUT':
        case 'OIL_OUT': row.out_qty += Math.abs(qty); break;
        case 'TRANSFER_IN': row.transfer_in += qty; break;
        case 'TRANSFER_OUT': row.transfer_out += Math.abs(qty); break;
        case 'ADJUSTMENT': row.adjust += qty; break;
      }
    }
    row.closing += qty;
  }

  const rows = Array.from(map.values()).sort(
    (a, b) => a.warehouse_id.localeCompare(b.warehouse_id) ||
              a.product_id.localeCompare(b.product_id)
  );
  return { ok: true, rows };
}