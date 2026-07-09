-- Add ALL missing columns to production_reports table to match mapReportToDb
ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS work_time_entries JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS setup_time_entries JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS tg_ga_phoi TEXT;
