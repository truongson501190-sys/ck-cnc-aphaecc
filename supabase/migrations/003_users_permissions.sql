-- Users and Permissions tables for Supabase

-- ---------------------------------------------------------------------------
-- users (main user profiles)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  msnv TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  role_group TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_records (authentication records - for login)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  msnv TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  status BOOLEAN NOT NULL DEFAULT true,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- user_permissions (fine-grained permissions per user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  msnv TEXT NOT NULL REFERENCES public.users(msnv) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_add BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_approve BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (msnv, module_key)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_msnv ON public.users(msnv);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_user_records_msnv ON public.user_records(msnv);
CREATE INDEX IF NOT EXISTS idx_user_permissions_msnv ON public.user_permissions(msnv);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (temporary - adjust as needed)
DROP POLICY IF EXISTS users_all ON public.users;
CREATE POLICY users_all ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS user_records_all ON public.user_records;
CREATE POLICY user_records_all ON public.user_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS user_permissions_all ON public.user_permissions;
CREATE POLICY user_permissions_all ON public.user_permissions FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Insert default admin user
-- ---------------------------------------------------------------------------
INSERT INTO public.users (msnv, full_name, department, position, role, role_group, status)
VALUES ('1118', 'Nguyễn Trường Sơn', 'Admin', 'Quản trị viên hệ thống', 'admin', 'Admin', 'active')
ON CONFLICT (msnv) DO NOTHING;

INSERT INTO public.user_records (msnv, full_name, department, position, role, status, password_hash)
VALUES ('1118', 'Nguyễn Trường Sơn', 'Admin', 'Quản trị viên hệ thống', 'admin', true, '1118')
ON CONFLICT (msnv) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Grant permissions
-- ---------------------------------------------------------------------------
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.user_records TO anon, authenticated;
GRANT ALL ON public.user_permissions TO anon, authenticated;
