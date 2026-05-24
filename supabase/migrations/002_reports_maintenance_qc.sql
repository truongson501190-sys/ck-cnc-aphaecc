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
