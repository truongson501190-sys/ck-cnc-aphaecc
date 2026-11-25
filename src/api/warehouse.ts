import { getSupabase } from '@/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface WarehouseRow {
  id: string;
  maKho: string;
  tenKho: string;
  vi_tri: string | null;
  nguoi_phu_trach: string | null;
  status: string | null;
  ghiChu: string | null;
}

export interface ToolRow {
  id: string;
  ma_dao: string | null;
  ten_dao: string;
  don_vi: string | null;
  gia: number | null;
  ton_kho: number | null;
  ton_toi_thieu: number | null;
  vi_tri: string | null;
  status: string | null;
}

export interface OnHandRow {
  warehouse_id: string;
  product_id: string;
  quantity_on_hand: number;
  valuation_amount: number | null;
}

// ============================================================================
// API
// ============================================================================

export async function getWarehouses(): Promise<
  { ok: true; data: WarehouseRow[] } | { ok: false; error: string }
> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  const { data, error } = await client
    .from('warehouses')
    .select('*')
    .order('maKho');

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as WarehouseRow[] };
}

export async function getProducts(): Promise<
  { ok: true; data: ToolRow[] } | { ok: false; error: string }
> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  const { data, error } = await client
    .from('tools')
    .select('*')
    .order('ten_dao');

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as ToolRow[] };
}

/**
 * Tồn kho hiện tại (từ view v_stock_on_hand).
 */
export async function getOnHand(
  warehouseId?: string,
  productId?: string
): Promise<{ ok: true; data: OnHandRow[] } | { ok: false; error: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  let q = client.from('v_stock_on_hand').select('*');
  if (warehouseId) q = q.eq('warehouse_id', warehouseId);
  if (productId)   q = q.eq('product_id', productId);

  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as OnHandRow[] };
}

/**
 * Validate tồn kho đủ không (trước khi xuất/chuyển).
 * @param productId khớp stock_ledger.product_id (tên sản phẩm)
 */
export async function validateStock(
  productId: string,
  warehouseId: string,
  requiredQty: number
): Promise<
  | { ok: true; onHand: number; sufficient: boolean }
  | { ok: false; error: string }
> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  const { data, error } = await client
    .from('v_stock_on_hand')
    .select('quantity_on_hand')
    .eq('warehouse_id', warehouseId)
    .eq('product_id', productId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  const onHand = (data as { quantity_on_hand: number } | null)?.quantity_on_hand ?? 0;
  return { ok: true, onHand, sufficient: onHand >= requiredQty };
}