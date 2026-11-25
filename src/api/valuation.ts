import { getSupabase } from '@/supabase';

export interface ValuationRow {
  warehouse_id: string;
  product_id: string;
  on_hand_qty: number;
  on_hand_value: number;
  avg_unit_cost: number;
}

export interface ValuationHistoryRow {
  month: string;
  warehouse_id: string;
  product_id: string;
  closing_qty: number;
  closing_value: number;
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function toValuationRow(row: Record<string, unknown>): ValuationRow {
  return {
    warehouse_id: String(row.warehouse_id),
    product_id: String(row.product_id),
    on_hand_qty: Number(row.on_hand_qty),
    on_hand_value: Number(row.on_hand_value),
    avg_unit_cost: Number(row.avg_unit_cost),
  };
}

function toValuationHistoryRow(row: Record<string, unknown>): ValuationHistoryRow {
  return {
    month: String(row.month),
    warehouse_id: String(row.warehouse_id),
    product_id: String(row.product_id),
    closing_qty: Number(row.closing_qty),
    closing_value: Number(row.closing_value),
  };
}

export async function getValuationAt(asOf?: string): Promise<Result<ValuationRow[]>> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  const { data, error } = await client.rpc('get_stock_valuation_at', {
    p_as_of: asOf ?? new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: ((data ?? []) as Record<string, unknown>[]).map(toValuationRow),
  };
}

export async function getValuationHistory(
  monthFrom: string,
  monthTo: string
): Promise<Result<ValuationHistoryRow[]>> {
  const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!monthPattern.test(monthFrom) || !monthPattern.test(monthTo)) {
    return { ok: false, error: 'Tháng phải có định dạng YYYY-MM' };
  }
  if (monthFrom > monthTo) {
    return { ok: false, error: 'Tháng bắt đầu không được sau tháng kết thúc' };
  }

  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  const { data, error } = await client.rpc('get_valuation_history', {
    p_month_from: monthFrom,
    p_month_to: monthTo,
  });

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: ((data ?? []) as Record<string, unknown>[]).map(toValuationHistoryRow),
  };
}

export async function getCurrentValuation(): Promise<Result<ValuationRow[]>> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  const { data, error } = await client
    .from('v_stock_valuation')
    .select('*')
    .order('on_hand_value', { ascending: false });

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: ((data ?? []) as Record<string, unknown>[]).map(toValuationRow),
  };
}
