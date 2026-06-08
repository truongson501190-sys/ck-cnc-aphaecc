-- Nhât ký Sản xuất / Bảo trì / QC (đồng bộ với localStorage)

-- Bổ sung cột thời gian làm việc cho production_reports (nếu chưa có)
ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS work_time_entries JSONB DEFAULT '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- maintenance_reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_reports (
  id TEXT PRIMARY KEY,
  ngay DATE,
  machine_name TEXT,
  equipment_code TEXT,
  technician TEXT,
  job_content TEXT,
  reason TEXT,
  corrective_action TEXT,
  replacement_parts TEXT,
  completion_time TEXT,
  post_maintenance_status TEXT DEFAULT 'normal',
  next_maintenance_schedule DATE,
  notes_attachments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- qc_reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qc_reports (
  id TEXT PRIMARY KEY,
  ngay DATE,
  du_an TEXT,
  ban_ve_so TEXT,
  chi_tiet_so TEXT,
  ten_chi_tiet TEXT,
  inspected_quantity INTEGER DEFAULT 1,
  result TEXT DEFAULT 'OK' CHECK (result IN ('OK', 'NG')),
  inspector TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS (permissive — giống production_reports)
ALTER TABLE public.maintenance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maintenance_reports_all ON public.maintenance_reports;
CREATE POLICY maintenance_reports_all ON public.maintenance_reports
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS qc_reports_all ON public.qc_reports;
CREATE POLICY qc_reports_all ON public.qc_reports
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.production_reports TO anon, authenticated;
GRANT ALL ON public.maintenance_reports TO anon, authenticated;
GRANT ALL ON public.qc_reports TO anon, authenticated;
-- Nhật ký Sản xuất / Bảo trì / QC (đồng bộ với localStorage)

-- ---------------------------------------------------------------------------
-- production_reports (bổ sung cột)
-- ---------------------------------------------------------------------------
ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS work_time_entries JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS setup_time_entries JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS tg_ga_phoi TEXT;
ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS tg_tren_ca TEXT;

-- ---------------------------------------------------------------------------
-- maintenance_reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_reports (
  id TEXT PRIMARY KEY,
  ngay DATE,
  machine_name TEXT,
  equipment_code TEXT,
  technician TEXT,
  job_content TEXT,
  reason TEXT,
  corrective_action TEXT,
  replacement_parts TEXT,
  completion_time TEXT,
  post_maintenance_status TEXT DEFAULT 'normal',
  next_maintenance_schedule DATE,
  notes_attachments TEXT,
  status TEXT DEFAULT 'pending',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- qc_reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qc_reports (
  id TEXT PRIMARY KEY,
  ngay DATE,
  du_an TEXT,
  ban_ve_so TEXT,
  chi_tiet_so TEXT,
  ten_chi_tiet TEXT,
  inspected_quantity INTEGER DEFAULT 1,
  result TEXT DEFAULT 'OK' CHECK (result IN ('OK', 'NG')),
  inspector TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_maintenance_reports_ngay ON public.maintenance_reports(ngay);
CREATE INDEX IF NOT EXISTS idx_maintenance_reports_machine ON public.maintenance_reports(machine_name);
CREATE INDEX IF NOT EXISTS idx_qc_reports_ngay ON public.qc_reports(ngay);
CREATE INDEX IF NOT EXISTS idx_qc_reports_du_an ON public.qc_reports(du_an);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.production_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_reports_all ON public.production_reports;
CREATE POLICY production_reports_all ON public.production_reports
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS maintenance_reports_all ON public.maintenance_reports;
CREATE POLICY maintenance_reports_all ON public.maintenance_reports
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS qc_reports_all ON public.qc_reports;
CREATE POLICY qc_reports_all ON public.qc_reports
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.production_reports TO anon, authenticated;
GRANT ALL ON public.maintenance_reports TO anon, authenticated;
GRANT ALL ON public.qc_reports TO anon, authenticated;