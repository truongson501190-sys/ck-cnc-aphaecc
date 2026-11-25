BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_time
  ON public.audit_logs (table_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON public.audit_logs (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record
  ON public.audit_logs (table_name, record_id);

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id TEXT;
  v_old JSONB;
  v_new JSONB;
  v_record_id TEXT;
  v_changed TEXT[];
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_record_id := COALESCE(v_old ->> 'id', v_old ->> 'document_id', v_old ->> 'session_id', '');
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(v_new ->> 'id', v_new ->> 'document_id', v_new ->> 'session_id', '');

    SELECT array_agg(keys.key ORDER BY keys.key)
      INTO v_changed
      FROM jsonb_object_keys(v_new) AS keys(key)
     WHERE (v_old -> keys.key) IS DISTINCT FROM (v_new -> keys.key);
  ELSE
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(v_new ->> 'id', v_new ->> 'document_id', v_new ->> 'session_id', '');
  END IF;

  v_user_id := COALESCE(
    NULLIF(current_setting('app.user_id', true), ''),
    CASE WHEN v_new IS NOT NULL THEN v_new ->> 'created_by' END,
    CASE WHEN v_old IS NOT NULL THEN v_old ->> 'created_by' END,
    'system'
  );

  INSERT INTO public.audit_logs (
    user_id, action, table_name, record_id, old_data, new_data, changed_fields
  )
  VALUES (
    v_user_id, TG_OP, TG_TABLE_NAME, v_record_id, v_old, v_new, v_changed
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'stock_documents',
    'stock_document_lines',
    'stock_ledger',
    'tool_returns',
    'tool_return_items',
    'inventory_count_sessions',
    'inventory_count_lines'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn()',
      table_name,
      table_name
    );
  END LOOP;
END;
$$;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_logs FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE VIEW public.v_low_stock_alert AS
SELECT
  t.ma_dao,
  t.ten_dao,
  t.ton_toi_thieu,
  COALESCE(SUM(l.qty_delta), 0) AS on_hand_total,
  t.ton_toi_thieu - COALESCE(SUM(l.qty_delta), 0) AS shortfall
FROM public.tools AS t
LEFT JOIN public.stock_ledger AS l ON l.product_id = t.ma_dao
WHERE t.ton_toi_thieu IS NOT NULL
  AND t.ton_toi_thieu > 0
  AND t.ma_dao IS NOT NULL
GROUP BY t.ma_dao, t.ten_dao, t.ton_toi_thieu
HAVING COALESCE(SUM(l.qty_delta), 0) < t.ton_toi_thieu;

GRANT SELECT ON public.v_low_stock_alert TO anon, authenticated;

COMMIT;
