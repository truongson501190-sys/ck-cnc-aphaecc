import { getSupabase } from '@/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type StockDocumentType =
  | 'IN' | 'OUT' | 'TRANSFER' | 'OIL_OUT' | 'ADJUSTMENT' | 'INVENTORY';

export type WorkflowStatus =
  | 'draft' | 'pending' | 'approved' | 'transferred'
  | 'received' | 'rejected' | 'posted';

export interface StockDocumentLineInput {
  lineNo: number;
  productId: string;          // khớp stock_ledger.product_id (tên/ma_dao)
  quantity: number;
  unit?: string;
  unitCost?: number;
  totalValue?: number;
  notes?: string;
  machineId?: string | null;  // UUID
  projectId?: string | null;  // UUID
}

export interface CreateDocumentInput {
  documentType: StockDocumentType;
  referenceNumber: string;
  transactionDate?: string;             // YYYY-MM-DD
  warehouseId?: string | null;
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  supplier?: string;
  projectId?: string;
  notes?: string;
  createdBy?: string;
  lines: StockDocumentLineInput[];
}

export interface StockDocumentRow {
  id: string;
  document_type: string;
  reference_number: string;
  status: string;
  transaction_date: string;
  warehouse_id: string | null;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  total_value: number | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  posted_at: string | null;
  workflow_status: WorkflowStatus | null;
  approved_by: string | null;
  approved_at: string | null;
  transferred_by: string | null;
  transferred_at: string | null;
  received_by: string | null;
  received_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  project_id: string | null;
  supplier: string | null;
  metadata: Record<string, unknown>;
}

export interface StockDocumentLineRow {
  id: string;
  document_id: string;
  line_no: number;
  product_id: string;
  quantity: number;
  unit: string | null;
  unit_cost: number | null;
  total_value: number | null;
  notes: string | null;
  machine_id: string | null;
  project_id: string | null;
}

export interface ListDocumentsFilter {
  documentType?: StockDocumentType;
  workflowStatus?: WorkflowStatus;
  warehouseId?: string;
  fromDate?: string;   // YYYY-MM-DD
  toDate?: string;
  limit?: number;
}

// ============================================================================
// API
// ============================================================================

/**
 * Tạo phiếu kho mới (header + lines).
 * ⚠️ Không atomic — nếu insert lines fail, header sẽ bị xóa (cleanup).
 */
export async function createDocument(
  input: CreateDocumentInput
): Promise<{ ok: true; documentId: string } | { ok: false; error: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  if (!input.documentType || !input.referenceNumber) {
    return { ok: false, error: 'documentType + referenceNumber required' };
  }
  if (!input.lines || input.lines.length === 0) {
    return { ok: false, error: 'at least 1 line required' };
  }

  const totalValue = input.lines.reduce(
    (s, l) => s + (l.totalValue ?? (l.quantity * (l.unitCost ?? 0))),
    0
  );

  const { data: header, error: headerErr } = await client
    .from('stock_documents')
    .insert({
      document_type: input.documentType,
      reference_number: input.referenceNumber,
      transaction_date: input.transactionDate ?? new Date().toISOString().slice(0, 10),
      warehouse_id: input.warehouseId ?? null,
      from_warehouse_id: input.fromWarehouseId ?? null,
      to_warehouse_id: input.toWarehouseId ?? null,
      supplier: input.supplier ?? null,
      project_id: input.projectId ?? null,
      notes: input.notes ?? null,
      created_by: input.createdBy ?? null,
      total_value: totalValue,
      workflow_status: 'pending',
    })
    .select('id')
    .single();

  if (headerErr || !header) {
    return { ok: false, error: headerErr?.message ?? 'insert header failed' };
  }

  const documentId = (header as { id: string }).id;

  const lineRows = input.lines.map((l) => ({
    document_id: documentId,
    line_no: l.lineNo,
    product_id: l.productId,
    quantity: l.quantity,
    unit: l.unit ?? null,
    unit_cost: l.unitCost ?? 0,
    total_value: l.totalValue ?? (l.quantity * (l.unitCost ?? 0)),
    notes: l.notes ?? null,
    machine_id: l.machineId ?? null,
    project_id: l.projectId ?? null,
  }));

  const { error: linesErr } = await client
    .from('stock_document_lines')
    .insert(lineRows);

  if (linesErr) {
    // Cleanup header
    await client.from('stock_documents').delete().eq('id', documentId);
    return { ok: false, error: `insert lines failed: ${linesErr.message}` };
  }

  return { ok: true, documentId };
}

/**
 * Cập nhật workflow status + audit fields tương ứng.
 */
export async function updateWorkflowStatus(
  documentId: string,
  status: WorkflowStatus,
  user: string,
  reason?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    workflow_status: status,
  };

  if (status === 'approved') {
    patch.approved_by = user;
    patch.approved_at = now;
  } else if (status === 'transferred') {
    patch.transferred_by = user;
    patch.transferred_at = now;
  } else if (status === 'received') {
    patch.received_by = user;
    patch.received_at = now;
  } else if (status === 'rejected') {
    patch.rejected_by = user;
    patch.rejected_at = now;
    if (reason) patch.rejected_reason = reason;
  } else if (status === 'posted') {
    patch.posted_at = now;
  }

  const { error } = await client
    .from('stock_documents')
    .update(patch)
    .eq('id', documentId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * List documents (không kèm lines).
 */
export async function listDocuments(
  filter: ListDocumentsFilter = {}
): Promise<{ ok: true; data: StockDocumentRow[] } | { ok: false; error: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  let q = client
    .from('stock_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (filter.documentType)   q = q.eq('document_type', filter.documentType);
  if (filter.workflowStatus) q = q.eq('workflow_status', filter.workflowStatus);
  if (filter.warehouseId)    q = q.eq('warehouse_id', filter.warehouseId);
  if (filter.fromDate)       q = q.gte('transaction_date', filter.fromDate);
  if (filter.toDate)         q = q.lte('transaction_date', filter.toDate);
  if (filter.limit)          q = q.limit(filter.limit);

  const { data, error } = await q;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as StockDocumentRow[] };
}

/**
 * Get document + lines.
 */
export async function getDocumentById(
  id: string
): Promise<
  | { ok: true; document: StockDocumentRow; lines: StockDocumentLineRow[] }
  | { ok: false; error: string }
> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  const { data: doc, error: docErr } = await client
    .from('stock_documents')
    .select('*')
    .eq('id', id)
    .single();

  if (docErr || !doc) return { ok: false, error: docErr?.message ?? 'not found' };

  const { data: lines, error: linesErr } = await client
    .from('stock_document_lines')
    .select('*')
    .eq('document_id', id)
    .order('line_no');

  if (linesErr) return { ok: false, error: linesErr.message };

  return {
    ok: true,
    document: doc as StockDocumentRow,
    lines: (lines ?? []) as StockDocumentLineRow[],
  };
}

/**
 * Xóa document + lines (hard delete — chỉ dùng cho draft/test).
 * Production nên dùng workflow_status = 'rejected' thay vì delete.
 */
export async function deleteDocument(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  await client.from('stock_document_lines').delete().eq('document_id', id);
  const { error } = await client.from('stock_documents').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================================================
// POST — ghi ledger (THÊM MỚI)
// ============================================================================

type RpcCaller = (
  fn: string,
  params: Record<string, unknown>
) => Promise<{ data: unknown; error: { message: string } | null }>;

async function postOneLine(args: {
  kind: 'IN' | 'OUT' | 'TRANSFER';
  productId: string;
  quantity: number;
  unitCost: number;
  warehouseId?: string | null;
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  documentId: string;
  documentLineId: string;
  createdBy: string | null;
  notes: string;
}): Promise<{ ok: true; ledgerIds: string[] } | { ok: false; error: string }> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };
  const rpc = client.rpc as unknown as RpcCaller;

  let params: Record<string, unknown>;
  const idem = `doc:${args.documentId}:${args.documentLineId}`;

  if (args.kind === 'IN') {
    if (!args.warehouseId) return { ok: false, error: 'IN requires warehouseId' };
    params = {
      p_movement_kind: 'IN',
      p_product_id: args.productId,
      p_quantity: args.quantity,
      p_warehouse_id: args.warehouseId,
      p_unit_cost: args.unitCost,
      p_document_id: args.documentId,
      p_document_line_id: args.documentLineId,
      p_created_by: args.createdBy,
      p_notes: args.notes,
      p_legacy_transaction_id: idem,
      p_reference: `DOC-${args.documentId.slice(0, 8)}`,
    };
  } else if (args.kind === 'OUT') {
    if (!args.warehouseId) return { ok: false, error: 'OUT requires warehouseId' };
    params = {
      p_movement_kind: 'OUT',
      p_product_id: args.productId,
      p_quantity: Math.abs(args.quantity),
      p_warehouse_id: args.warehouseId,
      p_unit_cost: args.unitCost,
      p_document_id: args.documentId,
      p_document_line_id: args.documentLineId,
      p_created_by: args.createdBy,
      p_notes: args.notes,
      p_legacy_transaction_id: idem,
      p_reference: `DOC-${args.documentId.slice(0, 8)}`,
    };
  } else {
    if (!args.fromWarehouseId || !args.toWarehouseId) {
      return { ok: false, error: 'TRANSFER requires from + to warehouse' };
    }
    params = {
      p_movement_kind: 'TRANSFER',
      p_product_id: args.productId,
      p_quantity: Math.abs(args.quantity),
      p_from_warehouse_id: args.fromWarehouseId,
      p_to_warehouse_id: args.toWarehouseId,
      p_unit_cost: args.unitCost,
      p_document_id: args.documentId,
      p_document_line_id: args.documentLineId,
      p_created_by: args.createdBy,
      p_notes: args.notes,
      p_legacy_transaction_id: idem,
      p_reference: `DOC-${args.documentId.slice(0, 8)}`,
    };
  }

  const { data, error } = await rpc('post_warehouse_movement_weighted_average', params);
  if (error) return { ok: false, error: error.message };

  const ids = (data as { ledger_entry_ids?: string[] } | null)?.ledger_entry_ids ?? [];
  const expected = args.kind === 'TRANSFER' ? 2 : 1;
  if (ids.length !== expected) {
    return { ok: false, error: `RPC trả ${ids.length} dòng (kỳ vọng ${expected})` };
  }
  return { ok: true, ledgerIds: ids };
}

/**
 * Ghi ledger cho document (IN/OUT/TRANSFER) + chuyển workflow status.
 * Phải gọi SAU createDocument().
 */
export async function postDocument(
  documentId: string,
  createdBy?: string
): Promise<
  | { ok: true; ledgerIds: string[]; linesPosted: number }
  | { ok: false; error: string }
> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'Supabase client not available' };

  // Load doc + lines
  const docRes = await getDocumentById(documentId);
  if (!docRes.ok) return { ok: false, error: docRes.error };

  const { document: doc, lines } = docRes;

  if (doc.posted_at) {
    return { ok: false, error: 'Phiếu đã được ghi ledger trước đó' };
  }
  if (doc.workflow_status === 'rejected') {
    return { ok: false, error: 'Phiếu đã bị từ chối' };
  }
  if (doc.document_type === 'ADJUSTMENT' || doc.document_type === 'INVENTORY') {
    return {
      ok: false,
      error: `Dùng API inventoryCount cho document_type=${doc.document_type}`,
    };
  }

  const docType = doc.document_type as 'IN' | 'OUT' | 'TRANSFER';
  const ledgerIds: string[] = [];
  let linesPosted = 0;

  for (const line of lines) {
    const res = await postOneLine({
      kind: docType,
      productId: line.product_id,
      quantity: Number(line.quantity),
      unitCost: Number(line.unit_cost ?? 0),
      warehouseId: doc.warehouse_id,
      fromWarehouseId: doc.from_warehouse_id,
      toWarehouseId: doc.to_warehouse_id,
      documentId: doc.id,
      documentLineId: line.id,
      createdBy: createdBy ?? null,
      notes: `${docType} — ${doc.reference_number} — line ${line.line_no}`,
    });

    if (!res.ok) {
      return {
        ok: false,
        error:
          `Line ${line.line_no} (${line.product_id}): ${res.error}. ` +
          `Đã ghi ${linesPosted} dòng trước đó — cần rollback thủ công cho doc ${doc.id}.`,
      };
    }

    ledgerIds.push(...res.ledgerIds);
    linesPosted++;
  }

  // Update workflow
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    posted_at: now,
    status: 'posted',
  };
  if (docType === 'IN') {
    patch.workflow_status = 'received';
    patch.received_by = createdBy ?? null;
    patch.received_at = now;
  } else {
    patch.workflow_status = 'transferred';
    patch.transferred_by = createdBy ?? null;
    patch.transferred_at = now;
  }

  const { error: uErr } = await client
    .from('stock_documents')
    .update(patch)
    .eq('id', documentId);

  if (uErr) {
    return {
      ok: false,
      error:
        `Đã ghi ${ledgerIds.length} dòng ledger nhưng update doc lỗi: ${uErr.message}. ` +
        `Cần rollback thủ công cho doc ${doc.id}.`,
    };
  }

  return { ok: true, ledgerIds, linesPosted };
}