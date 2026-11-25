-- =============================================================================
-- 012: ADJUSTMENT movement + workflow fields on stock_documents
-- Chạy SAU migration 011
-- =============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Mở rộng stock_documents.status để chấp nhận workflow states
-- ----------------------------------------------------------------------------
ALTER TABLE public.stock_documents DROP CONSTRAINT IF EXISTS stock_documents_status_check;
ALTER TABLE public.stock_documents ADD CONSTRAINT stock_documents_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'posted', 'transferred', 'received'));

-- ----------------------------------------------------------------------------
-- 2) Thêm workflow tracking fields vào stock_documents
-- ----------------------------------------------------------------------------
ALTER TABLE public.stock_documents
  ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'pending'
    CHECK (workflow_status IN ('draft', 'pending', 'approved', 'transferred', 'received', 'rejected', 'posted')),
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS transferred_by TEXT,
  ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_by TEXT,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS project_id TEXT,
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_stock_documents_workflow_status
  ON public.stock_documents (workflow_status);
CREATE INDEX IF NOT EXISTS idx_stock_documents_document_type
  ON public.stock_documents (document_type);
CREATE INDEX IF NOT EXISTS idx_stock_documents_ref
  ON public.stock_documents (reference_number);

-- ----------------------------------------------------------------------------
-- 3) Drop các overload cũ của post_warehouse_movement
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'post_warehouse_movement'
       AND n.nspname = 'public'
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
    RAISE NOTICE 'Dropped: %', r.sig;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4) Tạo lại post_warehouse_movement với case ADJUSTMENT
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_warehouse_movement(
  p_movement_kind TEXT,
  p_product_id TEXT,
  p_quantity NUMERIC,
  p_warehouse_id TEXT DEFAULT NULL,
  p_from_warehouse_id TEXT DEFAULT NULL,
  p_to_warehouse_id TEXT DEFAULT NULL,
  p_unit_cost NUMERIC DEFAULT 0,
  p_reference TEXT DEFAULT NULL,
  p_legacy_transaction_id TEXT DEFAULT NULL,
  p_created_by TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT now(),
  p_document_id TEXT DEFAULT NULL,
  p_document_line_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids UUID[] := ARRAY[]::UUID[];
  v_id UUID;
  v_qty NUMERIC;
BEGIN
  IF p_quantity IS NULL OR p_quantity = 0 THEN
    RAISE EXCEPTION 'quantity must be non-zero';
  END IF;

  IF p_movement_kind = 'ADJUSTMENT' THEN
    IF p_warehouse_id IS NULL OR p_warehouse_id = '' THEN
      RAISE EXCEPTION 'adjustment requires warehouse_id';
    END IF;

    v_id := public.post_stock_movement(
      p_warehouse_id, p_product_id, 'ADJUSTMENT', p_quantity, p_unit_cost,
      'ADJ', p_document_id, p_document_line_id, p_reference, p_legacy_transaction_id,
      p_created_by, p_notes, p_occurred_at,
      'adjust:' || COALESCE(p_legacy_transaction_id, p_reference) || ':' || p_product_id,
      TRUE
    );
    v_ids := array_append(v_ids, v_id);

  ELSE
    v_qty := ABS(p_quantity);

    IF p_movement_kind = 'IN' THEN
      v_id := public.post_stock_movement(
        p_warehouse_id, p_product_id, 'IN', v_qty, p_unit_cost,
        'GRN', p_document_id, p_document_line_id, p_reference, p_legacy_transaction_id,
        p_created_by, p_notes, p_occurred_at,
        'in:' || COALESCE(p_legacy_transaction_id, p_reference) || ':' || p_product_id
      );
      v_ids := array_append(v_ids, v_id);

    ELSIF p_movement_kind IN ('OUT', 'OIL_OUT') THEN
      v_id := public.post_stock_movement(
        p_warehouse_id, p_product_id,
        CASE WHEN p_movement_kind = 'OIL_OUT' THEN 'OIL_OUT' ELSE 'OUT' END,
        -v_qty, p_unit_cost, 'GI', p_document_id, p_document_line_id,
        p_reference, p_legacy_transaction_id,
        p_created_by, p_notes, p_occurred_at,
        'out:' || COALESCE(p_legacy_transaction_id, p_reference) || ':' || p_product_id
      );
      v_ids := array_append(v_ids, v_id);

    ELSIF p_movement_kind = 'TRANSFER' THEN
      IF p_from_warehouse_id IS NULL OR p_to_warehouse_id IS NULL THEN
        RAISE EXCEPTION 'transfer requires from and to warehouse';
      END IF;
      IF p_from_warehouse_id = p_to_warehouse_id THEN
        RAISE EXCEPTION 'from and to warehouse must differ';
      END IF;

      v_id := public.post_stock_movement(
        p_from_warehouse_id, p_product_id, 'TRANSFER_OUT', -v_qty, p_unit_cost,
        'TRF', p_document_id, p_document_line_id, p_reference, p_legacy_transaction_id,
        p_created_by, p_notes, p_occurred_at,
        'trf-out:' || COALESCE(p_legacy_transaction_id, p_reference) || ':' || p_product_id
      );
      v_ids := array_append(v_ids, v_id);

      v_id := public.post_stock_movement(
        p_to_warehouse_id, p_product_id, 'TRANSFER_IN', v_qty, p_unit_cost,
        'TRF', p_document_id, p_document_line_id, p_reference, p_legacy_transaction_id,
        p_created_by, p_notes, p_occurred_at,
        'trf-in:' || COALESCE(p_legacy_transaction_id, p_reference) || ':' || p_product_id
      );
      v_ids := array_append(v_ids, v_id);

    ELSE
      RAISE EXCEPTION 'unknown movement kind: %', p_movement_kind;
    END IF;
  END IF;

  RETURN jsonb_build_object('ledger_entry_ids', to_jsonb(v_ids));
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_warehouse_movement TO anon, authenticated;

COMMIT;