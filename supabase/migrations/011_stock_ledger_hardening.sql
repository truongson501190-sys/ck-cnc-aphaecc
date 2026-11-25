-- =============================================================================
-- 011: Hardening stock ledger + fix stock_documents UUID mismatch
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1) Fix stock_documents.id: UUID → TEXT (để chấp nhận documentId custom)
-- ----------------------------------------------------------------------------
ALTER TABLE public.stock_document_lines DROP CONSTRAINT IF EXISTS stock_document_lines_document_id_fkey;
ALTER TABLE public.stock_documents ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE public.stock_document_lines ALTER COLUMN document_id TYPE TEXT USING document_id::TEXT;
ALTER TABLE public.stock_document_lines
  ADD CONSTRAINT stock_document_lines_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES public.stock_documents(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 2) Thêm p_document_id + p_document_line_id + p_allow_negative vào post_stock_movement
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_stock_movement(
  p_warehouse_id TEXT,
  p_product_id TEXT,
  p_movement_type TEXT,
  p_qty_delta NUMERIC,
  p_unit_cost NUMERIC DEFAULT 0,
  p_document_type TEXT DEFAULT NULL,
  p_document_id TEXT DEFAULT NULL,
  p_document_line_id TEXT DEFAULT NULL,
  p_reference TEXT DEFAULT NULL,
  p_legacy_transaction_id TEXT DEFAULT NULL,
  p_created_by TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT now(),
  p_idempotency_key TEXT DEFAULT NULL,
  p_allow_negative BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_key TEXT;
  v_current NUMERIC;
BEGIN
  IF p_warehouse_id IS NULL OR p_warehouse_id = '' THEN
    RAISE EXCEPTION 'warehouse_id is required';
  END IF;
  IF p_product_id IS NULL OR p_product_id = '' THEN
    RAISE EXCEPTION 'product_id is required';
  END IF;
  IF p_qty_delta IS NULL OR p_qty_delta = 0 THEN
    RAISE EXCEPTION 'qty_delta must be non-zero';
  END IF;

  v_key := COALESCE(
    p_idempotency_key,
    encode(sha256(
      (p_warehouse_id || '|' || p_product_id || '|' || p_movement_type || '|' ||
       p_qty_delta::TEXT || '|' || COALESCE(p_reference, '') || '|' ||
       COALESCE(p_legacy_transaction_id, '') || '|' ||
       COALESCE(p_document_line_id, ''))::bytea
    ), 'hex')
  );

  -- Idempotency check TRƯỚC validate âm kho (retry không bị chặn)
  SELECT id INTO v_id FROM public.stock_ledger WHERE idempotency_key = v_key;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- Check âm kho
  IF p_qty_delta < 0 AND NOT p_allow_negative THEN
    SELECT COALESCE(SUM(qty_delta), 0) INTO v_current
      FROM public.stock_ledger
     WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id;
    IF (v_current + p_qty_delta) < 0 THEN
      RAISE EXCEPTION
        'insufficient stock: warehouse=% product=% current=% delta=%',
        p_warehouse_id, p_product_id, v_current, p_qty_delta
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  INSERT INTO public.stock_ledger (
    occurred_at, warehouse_id, product_id, movement_type, qty_delta,
    unit_cost, document_type, document_id, document_line_id, reference,
    legacy_transaction_id, created_by, notes, idempotency_key
  ) VALUES (
    COALESCE(p_occurred_at, now()), p_warehouse_id, p_product_id, p_movement_type,
    p_qty_delta, COALESCE(p_unit_cost, 0), p_document_type, p_document_id,
    p_document_line_id, p_reference, p_legacy_transaction_id, p_created_by,
    p_notes, v_key
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.stock_ledger WHERE idempotency_key = v_key;
  END IF;

  RETURN v_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3) post_warehouse_movement nhận thêm p_document_id (forward xuống post_stock_movement)
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
  v_qty := ABS(p_quantity);
  IF v_qty = 0 THEN
    RAISE EXCEPTION 'quantity must be positive';
  END IF;

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
      -v_qty, p_unit_cost, 'GI', p_document_id, p_document_line_id, p_reference, p_legacy_transaction_id,
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

  RETURN jsonb_build_object('ledger_entry_ids', to_jsonb(v_ids));
END;
$$;

-- ----------------------------------------------------------------------------
-- 4) Khóa quyền ghi trực tiếp vào stock_ledger
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.stock_ledger FROM anon, authenticated;
GRANT SELECT ON public.stock_ledger TO anon, authenticated;

DROP POLICY IF EXISTS stock_ledger_all ON public.stock_ledger;
CREATE POLICY stock_ledger_read ON public.stock_ledger FOR SELECT USING (true);

-- ----------------------------------------------------------------------------
-- 5) Helper get_on_hand
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_on_hand(
  p_warehouse_id TEXT,
  p_product_id   TEXT
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(qty_delta), 0)
    FROM public.stock_ledger
   WHERE warehouse_id = p_warehouse_id
     AND product_id   = p_product_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_on_hand(TEXT, TEXT) TO anon, authenticated;