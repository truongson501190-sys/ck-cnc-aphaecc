import { getSupabase } from '@/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type ToolReturnCondition = 'tot' | 'mon' | 'hong';

export interface ToolReturnItemInput {
  productId: string;
  qtyIssued: number;
  qtyReturned: number;
  condition?: ToolReturnCondition | null;
  machineId?: string | null;   // UUID
  projectId?: string | null;   // UUID
  note?: string;
}

export interface RecordToolReturnInput {
  warehouseId: string;
  returnedBy?: string;
  receivedBy?: string;
  returnedAt?: string;         // ISO
  note?: string;
  documentId?: string;
  createdBy?: string;
  items: ToolReturnItemInput[];
}

export interface ToolReturnRow {
  id: string;
  document_id: string | null;
  warehouse_id: string;
  returned_by: string | null;
  received_by: string | null;
  returned_at: string;
  note: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface ToolReturnItemRow {
  id: string;
  tool_return_id: string;
  product_id: string;
  qty_issued: number;
  qty_returned: number;
  condition: ToolReturnCondition | null;
  machine_id: string | null;
  project_id: string | null;
  note: string | null;
  created_at: string;
}

export interface GetToolReturnsFilter {
  warehouseId?: string;
  machineId?: string;
  projectId?: string;
  productId?: string;
  fromDate?: string;           // ISO
  toDate?: string;             // ISO
  limit?: number;
}

export interface ConsumptionByMachineRow {
  machine_id: string;
  ma_may: string | null;
  ten_may: string | null;
  product_id: string;
  month: string;
  qty_issued: number;
  qty_returned: number;
  qty_consumed: number;
  return_count: number;
}

export interface ConsumptionByProjectRow {
  project_id: string;
  ma_du_an: string | null;
  ten_du_an: string | null;
  khach_hang: string | null;
  product_id: string;
  month: string;
  qty_issued: number;
  qty_returned: number;
  qty_consumed: number;
  return_count: number;
}

export interface ScrapByMonthRow {
  month: string;
  so_phieu: number;
  total_qty: number;
}

// ============================================================================
// API
// ============================================================================

/**
 * Ghi 1 phiếu thu hồi công cụ cũ (đổi cũ lấy mới).
 * Gọi RPC record_tool_return → insert atomic header + items.
 */
export async function recordToolReturn(
  input: RecordToolReturnInput
): Promise<{ ok: true; toolReturnId: string; itemsInserted: number } | { ok: false; error: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  if (!input.warehouseId) return { ok: false, error: 'warehouseId is required' };
  if (!input.items || input.items.length === 0) {
    return { ok: false, error: 'at least 1 item required' };
  }

  // Map camelCase → snake_case cho RPC JSONB
  const items = input.items.map((it) => ({
    product_id: it.productId,
    qty_issued: it.qtyIssued,
    qty_returned: it.qtyReturned,
    condition: it.condition ?? null,
    machine_id: it.machineId ?? null,
    project_id: it.projectId ?? null,
    note: it.note ?? null,
  }));

  const { data, error } = await client.rpc('record_tool_return', {
    p_warehouse_id: input.warehouseId,
    p_returned_by: input.returnedBy ?? null,
    p_received_by: input.receivedBy ?? null,
    p_returned_at: input.returnedAt ?? new Date().toISOString(),
    p_note: input.note ?? null,
    p_document_id: input.documentId ?? null,
    p_created_by: input.createdBy ?? null,
    p_items: items,
  });

  if (error) {
    console.error('record_tool_return RPC failed:', error.message);
    return { ok: false, error: error.message };
  }

  const result = data as { ok: boolean; tool_return_id: string; items_inserted: number };
  return {
    ok: true,
    toolReturnId: result.tool_return_id,
    itemsInserted: result.items_inserted,
  };
}

/**
 * Lấy danh sách phiếu thu hồi + items (nested).
 * Filter theo kho / máy / dự án / sản phẩm / khoảng ngày.
 */
export async function getToolReturns(
  filter: GetToolReturnsFilter = {}
): Promise<{ ok: true; data: Array<ToolReturnRow & { items: ToolReturnItemRow[] }> } | { ok: false; error: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  let query = client
    .from('tool_returns')
    .select('*, items:tool_return_items(*)')
    .order('returned_at', { ascending: false });

  if (filter.warehouseId) query = query.eq('warehouse_id', filter.warehouseId);
  if (filter.fromDate)    query = query.gte('returned_at', filter.fromDate);
  if (filter.toDate)      query = query.lte('returned_at', filter.toDate);
  if (filter.limit)       query = query.limit(filter.limit);

  const { data, error } = await query;
  if (error) {
    console.error('getToolReturns failed:', error.message);
    return { ok: false, error: error.message };
  }

  // Filter items-level sau khi fetch (vì Supabase nested filter cần .filter() trên relation)
  let rows = (data ?? []) as Array<ToolReturnRow & { items: ToolReturnItemRow[] }>;

  if (filter.machineId || filter.projectId || filter.productId) {
    rows = rows
      .map((r) => ({
        ...r,
        items: r.items.filter((it) => {
          if (filter.machineId && it.machine_id !== filter.machineId) return false;
          if (filter.projectId && it.project_id !== filter.projectId) return false;
          if (filter.productId && it.product_id !== filter.productId) return false;
          return true;
        }),
      }))
      .filter((r) => r.items.length > 0);
  }

  return { ok: true, data: rows };
}

/**
 * Báo cáo hao hụt theo máy (từ view v_tool_consumption_by_machine).
 * @param machineId UUID máy (optional — nếu bỏ trống lấy tất cả)
 * @param month     'YYYY-MM' (optional)
 */
export async function getConsumptionByMachine(
  machineId?: string,
  month?: string
): Promise<{ ok: true; data: ConsumptionByMachineRow[] } | { ok: false; error: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  let query = client.from('v_tool_consumption_by_machine').select('*');
  if (machineId) query = query.eq('machine_id', machineId);
  if (month) {
    // month = 'YYYY-MM' → so sánh với cột month (date, đầu tháng)
    query = query.eq('month', `${month}-01`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getConsumptionByMachine failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []) as ConsumptionByMachineRow[] };
}

/**
 * Báo cáo hao hụt theo dự án (từ view v_tool_consumption_by_project).
 */
export async function getConsumptionByProject(
  projectId?: string,
  month?: string
): Promise<{ ok: true; data: ConsumptionByProjectRow[] } | { ok: false; error: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  let query = client.from('v_tool_consumption_by_project').select('*');
  if (projectId) query = query.eq('project_id', projectId);
  if (month) {
    query = query.eq('month', `${month}-01`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getConsumptionByProject failed:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []) as ConsumptionByProjectRow[] };
}

export async function getScrapByMonth(input: {
  monthFrom: string;
  monthTo: string;
}): Promise<{ ok: true; data: ScrapByMonthRow[] } | { ok: false; error: string }> {
  const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!monthPattern.test(input.monthFrom) || !monthPattern.test(input.monthTo)) {
    return { ok: false, error: 'Tháng phải có định dạng YYYY-MM' };
  }
  if (input.monthFrom > input.monthTo) {
    return { ok: false, error: 'Tháng bắt đầu không được sau tháng kết thúc' };
  }

  const [year, month] = input.monthTo.split('-').map(Number);
  const endDate = new Date(Date.UTC(year, month, 1) - 1).toISOString();
  const result = await getToolReturns({
    fromDate: `${input.monthFrom}-01T00:00:00.000Z`,
    toDate: endDate,
  });
  if (!result.ok) return result;

  const monthlyTotals = new Map<string, ScrapByMonthRow>();
  for (const record of result.data) {
    const monthKey = record.returned_at.slice(0, 7);
    const summary = monthlyTotals.get(monthKey) ?? {
      month: monthKey,
      so_phieu: 0,
      total_qty: 0,
    };
    summary.so_phieu += 1;
    summary.total_qty += record.items.reduce(
      (total, item) => total + Number(item.qty_returned || 0),
      0
    );
    monthlyTotals.set(monthKey, summary);
  }

  return {
    ok: true,
    data: [...monthlyTotals.values()].sort((a, b) => a.month.localeCompare(b.month)),
  };
}