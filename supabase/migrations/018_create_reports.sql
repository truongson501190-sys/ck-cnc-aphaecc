-- Bảng reports cho OCR upload - trước đây không có trong migration.

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code TEXT,
  quantity TEXT,
  raw_text TEXT,
  employee_id TEXT,
  report_date DATE DEFAULT CURRENT_DATE,
  filename TEXT,
  page_processed TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_created
  ON public.reports(created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reports_all ON public.reports;
CREATE POLICY reports_all ON public.reports
  FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.reports TO anon, authenticated;

COMMENT ON TABLE public.reports IS 'Bảng reports cho OCR upload - trước đây không có trong migration.';
