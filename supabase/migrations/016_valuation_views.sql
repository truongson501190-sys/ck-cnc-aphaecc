BEGIN;

-- Serialize movements for the same warehouse/product before choosing issue cost.
CREATE OR REPLACE FUNCTION public.post_warehouse_movement_weighted_average(
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
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_unit_cost NUMERIC := COALESCE(p_unit_cost, 0);
  v_on_hand NUMERIC;
BEGIN
  IF p_movement_kind IN ('OUT', 'OIL_OUT', 'TRANSFER') THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(lock_keys.lock_key, 0))
      FROM (
        SELECT DISTINCT warehouse_id || '|' || p_product_id AS lock_key
          FROM unnest(
            CASE
              WHEN p_movement_kind = 'TRANSFER'
                THEN ARRAY[p_from_warehouse_id, p_to_warehouse_id]
              ELSE ARRAY[p_warehouse_id]
            END
          ) AS warehouses(warehouse_id)
         WHERE warehouse_id IS NOT NULL
         ORDER BY lock_key
      ) AS lock_keys;

    SELECT SUM(qty_delta),
           CASE
             WHEN SUM(qty_delta) > 0
               THEN SUM(qty_delta * COALESCE(unit_cost, 0)) / SUM(qty_delta)
             ELSE NULL
           END
      INTO v_on_hand, v_unit_cost
      FROM public.stock_ledger
     WHERE warehouse_id = CASE
         WHEN p_movement_kind = 'TRANSFER' THEN p_from_warehouse_id
         ELSE p_warehouse_id
       END
       AND product_id = p_product_id;

    IF COALESCE(v_on_hand, 0) <= 0 OR v_unit_cost IS NULL THEN
      RAISE EXCEPTION
        'Cannot determine weighted-average cost: warehouse=% product=% on_hand=%',
        CASE WHEN p_movement_kind = 'TRANSFER' THEN p_from_warehouse_id ELSE p_warehouse_id END,
        p_product_id,
        COALESCE(v_on_hand, 0);
    END IF;
  END IF;

  RETURN public.post_warehouse_movement(
    p_movement_kind => p_movement_kind,
    p_product_id => p_product_id,
    p_quantity => p_quantity,
    p_warehouse_id => p_warehouse_id,
    p_from_warehouse_id => p_from_warehouse_id,
    p_to_warehouse_id => p_to_warehouse_id,
    p_unit_cost => v_unit_cost,
    p_reference => p_reference,
    p_legacy_transaction_id => p_legacy_transaction_id,
    p_created_by => p_created_by,
    p_notes => p_notes,
    p_occurred_at => p_occurred_at,
    p_document_id => p_document_id,
    p_document_line_id => p_document_line_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.post_warehouse_movement_weighted_average(
  TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT,
  TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_warehouse_movement_weighted_average(
  TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT,
  TIMESTAMPTZ, TEXT, TEXT
) TO anon, authenticated;

CREATE OR REPLACE VIEW public.v_stock_valuation AS
SELECT
  warehouse_id,
  product_id,
  SUM(qty_delta) AS on_hand_qty,
  SUM(qty_delta * COALESCE(unit_cost, 0)) AS on_hand_value,
  CASE
    WHEN SUM(qty_delta) > 0
      THEN SUM(qty_delta * COALESCE(unit_cost, 0)) / SUM(qty_delta)
    ELSE 0
  END AS avg_unit_cost
FROM public.stock_ledger
GROUP BY warehouse_id, product_id;

GRANT SELECT ON public.v_stock_valuation TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_stock_valuation_at(
  p_as_of TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  warehouse_id TEXT,
  product_id TEXT,
  on_hand_qty NUMERIC,
  on_hand_value NUMERIC,
  avg_unit_cost NUMERIC
)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT
    l.warehouse_id,
    l.product_id,
    SUM(l.qty_delta) AS on_hand_qty,
    SUM(l.qty_delta * COALESCE(l.unit_cost, 0)) AS on_hand_value,
    CASE
      WHEN SUM(l.qty_delta) > 0
        THEN SUM(l.qty_delta * COALESCE(l.unit_cost, 0)) / SUM(l.qty_delta)
      ELSE 0
    END AS avg_unit_cost
  FROM public.stock_ledger AS l
  WHERE l.occurred_at <= COALESCE(p_as_of, now())
  GROUP BY l.warehouse_id, l.product_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_stock_valuation_at(TIMESTAMPTZ)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_valuation_history(
  p_month_from TEXT,
  p_month_to TEXT
)
RETURNS TABLE (
  month TEXT,
  warehouse_id TEXT,
  product_id TEXT,
  closing_qty NUMERIC,
  closing_value NUMERIC
)
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_month_from DATE;
  v_month_to DATE;
BEGIN
  IF p_month_from !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    OR p_month_to !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Month values must use YYYY-MM format';
  END IF;

  v_month_from := (p_month_from || '-01')::DATE;
  v_month_to := (p_month_to || '-01')::DATE;

  IF v_month_from > v_month_to THEN
    RAISE EXCEPTION 'Start month must not be after end month';
  END IF;
  IF v_month_to >= v_month_from + INTERVAL '120 months' THEN
    RAISE EXCEPTION 'Valuation history range cannot exceed 120 months';
  END IF;

  RETURN QUERY
  WITH months AS (
    SELECT series.month_start::DATE AS month_start
      FROM generate_series(
        v_month_from::TIMESTAMP,
        v_month_to::TIMESTAMP,
        INTERVAL '1 month'
      ) AS series(month_start)
  ),
  dimensions AS (
    SELECT DISTINCT l.warehouse_id, l.product_id
      FROM public.stock_ledger AS l
     WHERE l.occurred_at < (v_month_to + INTERVAL '1 month')
  ),
  opening AS (
    SELECT l.warehouse_id,
           l.product_id,
           SUM(l.qty_delta) AS qty,
           SUM(l.qty_delta * COALESCE(l.unit_cost, 0)) AS value
      FROM public.stock_ledger AS l
     WHERE l.occurred_at < v_month_from::TIMESTAMPTZ
     GROUP BY l.warehouse_id, l.product_id
  ),
  monthly_movements AS (
    SELECT l.warehouse_id,
           l.product_id,
           date_trunc('month', l.occurred_at)::DATE AS month_start,
           SUM(l.qty_delta) AS qty,
           SUM(l.qty_delta * COALESCE(l.unit_cost, 0)) AS value
      FROM public.stock_ledger AS l
     WHERE l.occurred_at >= v_month_from::TIMESTAMPTZ
       AND l.occurred_at < (v_month_to + INTERVAL '1 month')::TIMESTAMPTZ
     GROUP BY l.warehouse_id, l.product_id, date_trunc('month', l.occurred_at)::DATE
  ),
  period_grid AS (
    SELECT m.month_start,
           d.warehouse_id,
           d.product_id,
           COALESCE(o.qty, 0) AS opening_qty,
           COALESCE(o.value, 0) AS opening_value,
           COALESCE(mm.qty, 0) AS movement_qty,
           COALESCE(mm.value, 0) AS movement_value
      FROM months AS m
      CROSS JOIN dimensions AS d
      LEFT JOIN opening AS o
        ON o.warehouse_id = d.warehouse_id AND o.product_id = d.product_id
      LEFT JOIN monthly_movements AS mm
        ON mm.month_start = m.month_start
       AND mm.warehouse_id = d.warehouse_id
       AND mm.product_id = d.product_id
  ),
  closing AS (
    SELECT month_start,
           warehouse_id,
           product_id,
           opening_qty + SUM(movement_qty) OVER (
             PARTITION BY warehouse_id, product_id ORDER BY month_start
           ) AS closing_qty,
           opening_value + SUM(movement_value) OVER (
             PARTITION BY warehouse_id, product_id ORDER BY month_start
           ) AS closing_value
      FROM period_grid
  )
  SELECT to_char(c.month_start, 'YYYY-MM'),
         c.warehouse_id,
         c.product_id,
         c.closing_qty,
         c.closing_value
    FROM closing AS c
   ORDER BY c.month_start, c.warehouse_id, c.product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_valuation_history(TEXT, TEXT)
  TO anon, authenticated;

COMMIT;
