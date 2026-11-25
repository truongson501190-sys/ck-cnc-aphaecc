-- =============================================================================
-- 013: Tool Returns (đổi cũ lấy mới) + mở rộng stock_document_lines
-- v2: fix quote camelCase cho machines/projects
-- =============================================================================

BEGIN;

-- ============================================================================
-- PHẦN A — Mở rộng stock_document_lines
-- ============================================================================
ALTER TABLE public.stock_document_lines
  ADD COLUMN IF NOT EXISTS machine_id UUID
    REFERENCES public.machines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id UUID
    REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_document_lines_machine
  ON public.stock_document_lines (machine_id) WHERE machine_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_document_lines_project
  ON public.stock_document_lines (project_id) WHERE project_id IS NOT NULL;

-- ============================================================================
-- PHẦN B — tool_returns + tool_return_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tool_returns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   TEXT,
  warehouse_id  TEXT NOT NULL,
  returned_by   TEXT,
  received_by   TEXT,
  returned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  note          TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_returns_warehouse   ON public.tool_returns (warehouse_id);
CREATE INDEX IF NOT EXISTS idx_tool_returns_returned_at ON public.tool_returns (returned_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_returns_document    ON public.tool_returns (document_id);

CREATE TABLE IF NOT EXISTS public.tool_return_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_return_id UUID NOT NULL REFERENCES public.tool_returns(id) ON DELETE CASCADE,
  product_id     TEXT NOT NULL,
  qty_issued     NUMERIC NOT NULL DEFAULT 0,
  qty_returned   NUMERIC NOT NULL DEFAULT 0,
  condition      TEXT CHECK (condition IS NULL OR condition IN ('tot','mon','hong')),
  machine_id     UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  project_id     UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tool_return_items_machine_project_required
    CHECK (qty_returned = 0 OR (machine_id IS NOT NULL AND project_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_tool_return_items_return  ON public.tool_return_items (tool_return_id);
CREATE INDEX IF NOT EXISTS idx_tool_return_items_machine ON public.tool_return_items (machine_id) WHERE machine_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tool_return_items_project ON public.tool_return_items (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tool_return_items_product ON public.tool_return_items (product_id);

-- ============================================================================
-- PHẦN C — Views báo cáo (FIX: quote camelCase)
-- ============================================================================
CREATE OR REPLACE VIEW public.v_tool_consumption_by_machine AS
SELECT
  i.machine_id,
  m."maMay"  AS ma_may,
  m."tenMay" AS ten_may,
  i.product_id,
  date_trunc('month', tr.returned_at)::DATE AS month,
  SUM(i.qty_issued)                         AS qty_issued,
  SUM(i.qty_returned)                       AS qty_returned,
  SUM(i.qty_issued - i.qty_returned)        AS qty_consumed,
  COUNT(*)                                  AS return_count
FROM public.tool_return_items i
JOIN public.tool_returns tr ON tr.id = i.tool_return_id
LEFT JOIN public.machines m ON m.id = i.machine_id
WHERE i.machine_id IS NOT NULL
GROUP BY i.machine_id, m."maMay", m."tenMay", i.product_id,
         date_trunc('month', tr.returned_at);

CREATE OR REPLACE VIEW public.v_tool_consumption_by_project AS
SELECT
  i.project_id,
  p."maDuAn"   AS ma_du_an,
  p."tenDuAn"  AS ten_du_an,
  p.khach_hang,
  i.product_id,
  date_trunc('month', tr.returned_at)::DATE AS month,
  SUM(i.qty_issued)                         AS qty_issued,
  SUM(i.qty_returned)                       AS qty_returned,
  SUM(i.qty_issued - i.qty_returned)        AS qty_consumed,
  COUNT(*)                                  AS return_count
FROM public.tool_return_items i
JOIN public.tool_returns tr ON tr.id = i.tool_return_id
LEFT JOIN public.projects p ON p.id = i.project_id
WHERE i.project_id IS NOT NULL
GROUP BY i.project_id, p."maDuAn", p."tenDuAn", p.khach_hang, i.product_id,
         date_trunc('month', tr.returned_at);

-- ============================================================================
-- PHẦN D — RLS
-- ============================================================================
ALTER TABLE public.tool_returns      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_return_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tool_returns_select      ON public.tool_returns;
DROP POLICY IF EXISTS tool_returns_insert      ON public.tool_returns;
DROP POLICY IF EXISTS tool_return_items_select ON public.tool_return_items;
DROP POLICY IF EXISTS tool_return_items_insert ON public.tool_return_items;

CREATE POLICY tool_returns_select      ON public.tool_returns      FOR SELECT TO authenticated USING (true);
CREATE POLICY tool_returns_insert      ON public.tool_returns      FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY tool_return_items_select ON public.tool_return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY tool_return_items_insert ON public.tool_return_items FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- PHẦN E — RPC record_tool_return
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_tool_return(
  p_warehouse_id TEXT,
  p_returned_by  TEXT DEFAULT NULL,
  p_received_by  TEXT DEFAULT NULL,
  p_returned_at  TIMESTAMPTZ DEFAULT now(),
  p_note         TEXT DEFAULT NULL,
  p_document_id  TEXT DEFAULT NULL,
  p_created_by   TEXT DEFAULT NULL,
  p_items        JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_return_id UUID;
  v_item      JSONB;
  v_count     INT := 0;
BEGIN
  IF p_warehouse_id IS NULL OR p_warehouse_id = '' THEN
    RAISE EXCEPTION 'warehouse_id is required';
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'at least 1 item required';
  END IF;

  INSERT INTO public.tool_returns (
    warehouse_id, returned_by, received_by, returned_at,
    note, document_id, created_by
  ) VALUES (
    p_warehouse_id, p_returned_by, p_received_by,
    COALESCE(p_returned_at, now()),
    p_note, p_document_id, p_created_by
  ) RETURNING id INTO v_return_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.tool_return_items (
      tool_return_id, product_id, qty_issued, qty_returned,
      condition, machine_id, project_id, note
    ) VALUES (
      v_return_id,
      v_item->>'product_id',
      COALESCE((v_item->>'qty_issued')::NUMERIC, 0),
      COALESCE((v_item->>'qty_returned')::NUMERIC, 0),
      NULLIF(v_item->>'condition', ''),
      NULLIF(v_item->>'machine_id', '')::UUID,
      NULLIF(v_item->>'project_id', '')::UUID,
      v_item->>'note'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'tool_return_id', v_return_id,
    'items_inserted', v_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_tool_return FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_tool_return TO authenticated;

COMMIT;