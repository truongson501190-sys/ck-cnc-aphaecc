import { getSupabase } from '@/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface InventoryCountLineInput {
  productId: string;
  countedQty: number;
  systemQty: number;
}

export interface CreateSessionInput {
  warehouseId: string;
  notes?: string;
  createdBy?: string;
  lines: InventoryCountLineInput[];
}

export interface InventoryCountSessionRow {
  id: string;
  warehouse_id: string;
  status: string;
  counted_at: string | null;
  posted_at: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface InventoryCountLineRow {
  id: string;
  session_id: string;
  product_id: string;
  counted_qty: number;
  system_qty: number;
  variance_qty: number | null;
}

export interface ListSessionsFilter {
  warehouseId?: string;
  status?: string;
  limit?: number;
}

// ============================================================================
// INTERNAL — gọi RPC post_warehouse_movement trực tiếp
// ============================================================================

type RpcCaller = (
  fn: string,
  params: Record<string, unknown>
) => Promise<{ data: unknown; error: { message: string } | null }>;

async function postAdjustmentLine(args: {
  warehouseId: string;
  productId: string;
  quantity: number;           // giữ dấu +/- (variance)
  documentId: string;
  documentLineId: string | null;
  createdBy: string | null;
  notes: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  const rpc = client.rpc as unknown as RpcCaller;

  const { error } = await rpc('post_warehouse_movement', {
    p_movement_kind: 'ADJUSTMENT',
    p_product_id: args.productId,
    p_quantity: args.quantity,
    p_warehouse_id: args.warehouseId,
    p_document_id: args.documentId,
    p_document_line_id: args.documentLineId,
    p_created_by: args.createdBy,
    p_notes: args.notes,
    p_legacy_transaction_id: `inv-${args.documentId}:${args.documentLineId ?? args.productId}`,
    p_reference: `INV-${args.documentId.slice(0, 8)}`,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================================================
// API
// ============================================================================

/**
 * Tạo phiếu kiểm kê (session + lines).
 */
export async function createSession(
  input: CreateSessionInput
): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  if (!input.warehouseId) return { ok: false, error: 'warehouseId required' };
  if (!input.lines || input.lines.length === 0) {
    return { ok: false, error: 'at least 1 line required' };
  }

  const { data: session, error: sErr } = await client
    .from('inventory_count_sessions')
    .insert({
      warehouse_id: input.warehouseId,
      status: 'draft',
      notes: input.notes ?? null,
      created_by: input.createdBy ?? null,
    })
    .select('id')
    .single();

  if (sErr || !session) {
    return { ok: false, error: sErr?.message ?? 'insert session failed' };
  }

  const sessionId = (session as { id: string }).id;

  const lineRows = input.lines.map((l) => ({
    session_id: sessionId,
    product_id: l.productId,
    counted_qty: l.countedQty,
    system_qty: l.systemQty,
    variance_qty: l.countedQty - l.systemQty,
  }));

  const { error: lErr } = await client
    .from('inventory_count_lines')
    .insert(lineRows);

  if (lErr) {
    await client.from('inventory_count_sessions').delete().eq('id', sessionId);
    return { ok: false, error: `insert lines failed: ${lErr.message}` };
  }

  return { ok: true, sessionId };
}

export async function listSessions(
  filter: ListSessionsFilter = {}
): Promise<
  { ok: true; data: InventoryCountSessionRow[] } | { ok: false; error: string }
> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  let q = client
    .from('inventory_count_sessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (filter.warehouseId) q = q.eq('warehouse_id', filter.warehouseId);
  if (filter.status) q = q.eq('status', filter.status);
  if (filter.limit) q = q.limit(filter.limit);

  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as InventoryCountSessionRow[] };
}

export async function getSessionById(
  id: string
): Promise<
  | { ok: true; session: InventoryCountSessionRow; lines: InventoryCountLineRow[] }
  | { ok: false; error: string }
> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  const { data: s, error: sErr } = await client
    .from('inventory_count_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (sErr || !s) return { ok: false, error: sErr?.message ?? 'not found' };

  const { data: lines, error: lErr } = await client
    .from('inventory_count_lines')
    .select('*')
    .eq('session_id', id);

  if (lErr) return { ok: false, error: lErr.message };

  return {
    ok: true,
    session: s as InventoryCountSessionRow,
    lines: (lines ?? []) as InventoryCountLineRow[],
  };
}

/**
 * Áp dụng chênh lệch kiểm kê → post ADJUSTMENT cho mỗi line có variance != 0.
 * Dùng RPC trực tiếp (không qua postingApi) để tránh type mismatch.
 */
export async function applyVariance(
  sessionId: string,
  createdBy?: string
): Promise<
  { ok: true; adjustedLines: number } | { ok: false; error: string }
> {
  const sessionResult = await getSessionById(sessionId);
  if (!sessionResult.ok) return { ok: false, error: sessionResult.error };

  const { session, lines } = sessionResult;
  const linesWithVariance = lines.filter(
    (l) => l.variance_qty !== null && l.variance_qty !== 0
  );

  if (linesWithVariance.length === 0) {
    return { ok: true, adjustedLines: 0 };
  }

  // Post từng line ADJUSTMENT (giữ dấu: + tăng kho, - giảm kho)
  for (const l of linesWithVariance) {
    const result = await postAdjustmentLine({
      warehouseId: session.warehouse_id,
      productId: l.product_id,
      quantity: l.variance_qty as number,
      documentId: sessionId,
      documentLineId: l.id,
      createdBy: createdBy ?? null,
      notes: `Kiểm kê — chênh lệch ${l.variance_qty}`,
    });
    if (!result.ok) {
      return {
        ok: false,
        error: `line ${l.product_id} (${l.id}): ${result.error}`,
      };
    }
  }

  // Cập nhật status session
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  const now = new Date().toISOString();
  const { error: updErr } = await client
    .from('inventory_count_sessions')
    .update({ status: 'posted', counted_at: now, posted_at: now })
    .eq('id', sessionId);

  if (updErr) return { ok: false, error: updErr.message };

  return { ok: true, adjustedLines: linesWithVariance.length };
}