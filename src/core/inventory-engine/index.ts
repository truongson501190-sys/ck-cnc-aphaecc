import { getSupabase } from '@/supabase';
import type {
  StockLedgerRow,
  StockOnHandProductRow,
  StockOnHandRow,
} from '@/core/stock-ledger/types';

export interface OnHandDisplayRow {
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  valuationAmount: number;
}

export interface MovementFilter {
  warehouseId?: string;
  productId?: string;
  fromDate?: string;
  toDate?: string;
  movementTypes?: string[];
  limit?: number;
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

/** On-hand per warehouse × product — reads v_stock_on_hand only */
export async function getOnHand(filters?: {
  warehouseId?: string;
  productId?: string;
}): Promise<OnHandDisplayRow[]> {
  const client = getSupabase();
  if (!client) return [];

  let query = client.from('v_stock_on_hand').select('*');

  if (filters?.warehouseId) {
    query = query.eq('warehouse_id', filters.warehouseId);
  }
  if (filters?.productId) {
    query = query.eq('product_id', filters.productId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('getOnHand:', error.message);
    return [];
  }

  return (data as StockOnHandRow[]).map((row) => ({
    productId: row.product_id,
    warehouseId: row.warehouse_id,
    quantityOnHand: toNumber(row.quantity_on_hand),
    valuationAmount: toNumber(row.valuation_amount),
  }));
}

/** Global on-hand per product (all warehouses) */
export async function getOnHandByProduct(): Promise<
  Array<{ productId: string; quantityOnHand: number; valuationAmount: number }>
> {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client.from('v_stock_on_hand_product').select('*');
  if (error) {
    console.warn('getOnHandByProduct:', error.message);
    return [];
  }

  return (data as StockOnHandProductRow[]).map((row) => ({
    productId: row.product_id,
    quantityOnHand: toNumber(row.quantity_on_hand),
    valuationAmount: toNumber(row.valuation_amount),
  }));
}

/** Ledger movements — read-only */
export async function getMovements(
  filter: MovementFilter = {}
): Promise<StockLedgerRow[]> {
  const client = getSupabase();
  if (!client) return [];

  let query = client
    .from('stock_ledger')
    .select('*')
    .order('occurred_at', { ascending: false });

  if (filter.warehouseId) query = query.eq('warehouse_id', filter.warehouseId);
  if (filter.productId) query = query.eq('product_id', filter.productId);
  if (filter.fromDate) query = query.gte('occurred_at', filter.fromDate);
  if (filter.toDate) query = query.lte('occurred_at', filter.toDate);
  if (filter.movementTypes?.length) {
    query = query.in('movement_type', filter.movementTypes);
  }
  if (filter.limit) query = query.limit(filter.limit);

  const { data, error } = await query;
  if (error) {
    console.warn('getMovements:', error.message);
    return [];
  }

  return (data || []) as StockLedgerRow[];
}

/** Valuation from ledger (SUM qty × unit_cost per warehouse/product) */
export async function getValuation(filters?: {
  warehouseId?: string;
}): Promise<{ totalValue: number; rows: OnHandDisplayRow[] }> {
  const rows = await getOnHand(filters);
  const totalValue = rows.reduce((s, r) => s + r.valuationAmount, 0);
  return { totalValue, rows };
}

/** On-hand for one product in one warehouse (forms validation) */
export async function getProductOnHandInWarehouse(
  productId: string,
  warehouseId?: string
): Promise<number> {
  if (warehouseId) {
    const rows = await getOnHand({ productId, warehouseId });
    return rows.reduce((s, r) => s + r.quantityOnHand, 0);
  }
  const rows = await getOnHandByProduct();
  const match = rows.find((r) => r.productId === productId);
  return match?.quantityOnHand ?? 0;
}
