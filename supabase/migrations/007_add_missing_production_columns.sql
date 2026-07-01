-- Add missing columns to production_reports table
ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS gio_ga NUMERIC(18,4);

ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS gio_chay NUMERIC(18,4);

ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS chi_phi_ga NUMERIC(18,4);

ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS chi_phi_chay_may NUMERIC(18,4);

ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS chi_phi_dao NUMERIC(18,4);

ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS locked_by TEXT;

ALTER TABLE public.production_reports
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;