import { getSupabase } from '@/supabase';

export interface LowStockRow {
  ma_dao: string;
  ten_dao: string;
  ton_toi_thieu: number;
  on_hand_total: number;
  shortfall: number;
}

export async function getLowStockAlert(): Promise<
  { ok: true; data: LowStockRow[] } | { ok: false; error: string }
> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  const { data, error } = await client
    .from('v_low_stock_alert')
    .select('*')
    .order('shortfall', { ascending: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as LowStockRow[] };
}
