-- Bảng kế hoạch sản xuất và thời gian máy dừng cho module MES.

CREATE TABLE IF NOT EXISTS public.production_plans (
  id TEXT PRIMARY KEY,
  plan_date DATE,
  machine TEXT,
  project TEXT,
  category TEXT,
  part_no TEXT,
  part_name TEXT,
  shift_key TEXT,
  planned_qty NUMERIC(18,4) DEFAULT 0,
  actual_qty NUMERIC(18,4) DEFAULT 0,
  status TEXT DEFAULT 'planned',
  notes TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_production_plans_machine
  ON public.production_plans(machine);
CREATE INDEX IF NOT EXISTS idx_production_plans_date
  ON public.production_plans(plan_date);

ALTER TABLE public.production_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS production_plans_all ON public.production_plans;
CREATE POLICY production_plans_all ON public.production_plans
  FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.production_plans TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.machine_downtime (
  id TEXT PRIMARY KEY,
  machine TEXT,
  from_date DATE,
  to_date DATE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machine_downtime_machine
  ON public.machine_downtime(machine);

ALTER TABLE public.machine_downtime ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS machine_downtime_all ON public.machine_downtime;
CREATE POLICY machine_downtime_all ON public.machine_downtime
  FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.machine_downtime TO anon, authenticated;

COMMENT ON TABLE public.production_plans IS 'Kế hoạch sản xuất của module MES.';
COMMENT ON TABLE public.machine_downtime IS 'Thời gian dừng máy của module MES.';
