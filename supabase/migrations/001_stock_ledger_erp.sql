-- ERP/WMS: Stock Ledger as single source of truth
-- Run in Supabase SQL Editor or via CLI

-- ---------------------------------------------------------------------------
-- stock_ledger (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  warehouse_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (
    movement_type IN (
      'IN', 'OUT', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT', 'OIL_OUT'
    )
  ),
  qty_delta NUMERIC(18, 4) NOT NULL CHECK (qty_delta <> 0),
  unit_cost NUMERIC(18, 4) DEFAULT 0,
  document_type TEXT,
  document_id TEXT,
  document_line_id TEXT,
  reference TEXT,
  legacy_transaction_id TEXT,
  created_by TEXT,
  notes TEXT,
  idempotency_key TEXT NOT NULL,
  CONSTRAINT stock_ledger_idempotency_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_wh_product
  ON public.stock_ledger (warehouse_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_occurred
  ON public.stock_ledger (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_legacy
  ON public.stock_ledger (legacy_transaction_id)
  WHERE legacy_transaction_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- stock_documents (optional header for future workflow)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  reference_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'posted')),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  warehouse_id TEXT,
  from_warehouse_id TEXT,
  to_warehouse_id TEXT,
  total_value NUMERIC(18, 4) DEFAULT 0,
  created_by TEXT,
  notes TEXT,
  legacy_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_at TIMESTAMPTZ,
  CONSTRAINT stock_documents_ref_unique UNIQUE (reference_number)
);

CREATE TABLE IF NOT EXISTS public.stock_document_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.stock_documents(id) ON DELETE CASCADE,
  line_no INT NOT NULL DEFAULT 1,
  product_id TEXT NOT NULL,
  quantity NUMERIC(18, 4) NOT NULL,
  unit TEXT,
  unit_cost NUMERIC(18, 4) DEFAULT 0,
  total_value NUMERIC(18, 4) DEFAULT 0,
  notes TEXT
);

-- ---------------------------------------------------------------------------
-- inventory_count_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_count_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'in_progress', 'posted', 'cancelled')),
  counted_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  created_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_count_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.inventory_count_sessions(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  counted_qty NUMERIC(18, 4) NOT NULL,
  system_qty NUMERIC(18, 4) NOT NULL DEFAULT 0,
  variance_qty NUMERIC(18, 4) GENERATED ALWAYS AS (counted_qty - system_qty) STORED
);

-- ---------------------------------------------------------------------------
-- production_reports (BC-app module)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.production_reports (
  id TEXT PRIMARY KEY,
  ngay_thang DATE,
  may_san_xuat TEXT,
  du_an TEXT,
  khach_hang TEXT,
  ban_ve_so TEXT,
  chi_tiet_so TEXT,
  ten_chi_tiet TEXT,
  noi_dung_gia_cong TEXT,
  so_luong_hoan_thanh NUMERIC(18, 4) DEFAULT 0,
  vat_lieu TEXT,
  nguyen_cong_so TEXT,
  tool_entries JSONB DEFAULT '[]'::jsonb,
  ca TEXT,
  cp_may NUMERIC(18, 4) DEFAULT 0,
  cp_dao_cu NUMERIC(18, 4) DEFAULT 0,
  nguoi_van_hanh TEXT,
  nguoi_kiem_tra TEXT,
  tg_tren_ca TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- roles_permissions (optional DB-backed RBAC)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key TEXT NOT NULL,
  module_key TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_add BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_approve BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  UNIQUE (role_key, module_key)
);

-- ---------------------------------------------------------------------------
-- On-hand view (read model)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_stock_on_hand AS
SELECT
  warehouse_id,
  product_id,
  SUM(qty_delta)::NUMERIC(18, 4) AS quantity_on_hand,
  SUM(qty_delta * COALESCE(unit_cost, 0))::NUMERIC(18, 4) AS valuation_amount
FROM public.stock_ledger
GROUP BY warehouse_id, product_id
HAVING SUM(qty_delta) <> 0;

-- Global on-hand (all warehouses) for product-level screens
CREATE OR REPLACE VIEW public.v_stock_on_hand_product AS
SELECT
  product_id,
  SUM(qty_delta)::NUMERIC(18, 4) AS quantity_on_hand,
  SUM(qty_delta * COALESCE(unit_cost, 0))::NUMERIC(18, 4) AS valuation_amount
FROM public.stock_ledger
GROUP BY product_id
HAVING SUM(qty_delta) <> 0;

-- ---------------------------------------------------------------------------
-- RPC: post_stock_movement (single ledger insert, idempotent)
-- ---------------------------------------------------------------------------
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
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_key TEXT;
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

-- ---------------------------------------------------------------------------
-- RPC: post_warehouse_movement (document-level: IN/OUT/TRANSFER/OIL)
-- ---------------------------------------------------------------------------
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
  p_occurred_at TIMESTAMPTZ DEFAULT now()
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
      'GRN', NULL, NULL, p_reference, p_legacy_transaction_id,
      p_created_by, p_notes, p_occurred_at,
      'in:' || COALESCE(p_legacy_transaction_id, p_reference) || ':' || p_product_id
    );
    v_ids := array_append(v_ids, v_id);

  ELSIF p_movement_kind IN ('OUT', 'OIL_OUT') THEN
    v_id := public.post_stock_movement(
      p_warehouse_id, p_product_id,
      CASE WHEN p_movement_kind = 'OIL_OUT' THEN 'OIL_OUT' ELSE 'OUT' END,
      -v_qty, p_unit_cost, 'GI', NULL, NULL, p_reference, p_legacy_transaction_id,
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
      'TRF', NULL, NULL, p_reference, p_legacy_transaction_id,
      p_created_by, p_notes, p_occurred_at,
      'trf-out:' || COALESCE(p_legacy_transaction_id, p_reference) || ':' || p_product_id
    );
    v_ids := array_append(v_ids, v_id);

    v_id := public.post_stock_movement(
      p_to_warehouse_id, p_product_id, 'TRANSFER_IN', v_qty, p_unit_cost,
      'TRF', NULL, NULL, p_reference, p_legacy_transaction_id,
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

-- ---------------------------------------------------------------------------
-- RLS (permissive for anon during migration — tighten for production)
-- ---------------------------------------------------------------------------
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_document_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_ledger_all ON public.stock_ledger;
CREATE POLICY stock_ledger_all ON public.stock_ledger FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS stock_documents_all ON public.stock_documents;
CREATE POLICY stock_documents_all ON public.stock_documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS production_reports_all ON public.production_reports;
CREATE POLICY production_reports_all ON public.production_reports FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON public.v_stock_on_hand TO anon, authenticated;
GRANT SELECT ON public.v_stock_on_hand_product TO anon, authenticated;
GRANT ALL ON public.stock_ledger TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_stock_movement TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_warehouse_movement TO anon, authenticated;
