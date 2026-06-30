
-- 006_migrate_to_employees_as_sso.sql
-- Migrate all user data and user_records data into employees as the single source of truth

-- ---------------------------------------------------------------------------
-- Step 1: Add missing columns to employees table
-- ---------------------------------------------------------------------------
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS role_group TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Step 2: Migrate data from users and user_records to employees
-- ---------------------------------------------------------------------------
-- Update existing employees with data from users/user_records
UPDATE public.employees e
SET
  role = COALESCE(u.role, e.role, 'user'),
  role_group = COALESCE(u.role_group, e.role_group),
  password_hash = COALESCE(ur.password_hash, e.password_hash),
  last_login = COALESCE(ur.last_login, e.last_login),
  updated_at = now()
FROM public.users u
LEFT JOIN public.user_records ur ON u.msnv = ur.msnv
WHERE e.msnv = u.msnv;

-- Insert employees from users/user_records that don't exist yet
INSERT INTO public.employees (
  msnv,
  ho_ten,
  phong_ban,
  chuc_vu,
  role,
  role_group,
  status,
  password_hash,
  last_login,
  created_at,
  updated_at
)
SELECT
  u.msnv,
  COALESCE(u.full_name, ur.full_name, u.msnv) AS ho_ten,
  COALESCE(u.department, ur.department) AS phong_ban,
  COALESCE(u.position, ur.position) AS chuc_vu,
  COALESCE(u.role, ur.role, 'user') AS role,
  u.role_group,
  COALESCE(u.status, CASE WHEN ur.status THEN 'active' ELSE 'inactive' END, 'active') AS status,
  ur.password_hash,
  ur.last_login,
  COALESCE(u.created_at, ur.created_at, now()) AS created_at,
  now() AS updated_at
FROM public.users u
LEFT JOIN public.user_records ur ON u.msnv = ur.msnv
LEFT JOIN public.employees e ON u.msnv = e.msnv
WHERE e.msnv IS NULL;

-- ---------------------------------------------------------------------------
-- Step 3: Ensure password_hash is NOT NULL for all employees
-- ---------------------------------------------------------------------------
UPDATE public.employees
SET password_hash = msnv
WHERE password_hash IS NULL;

ALTER TABLE public.employees
  ALTER COLUMN password_hash SET NOT NULL;

-- ---------------------------------------------------------------------------
-- Step 4: Update foreign key on user_permissions to reference employees.msnv
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_permissions
  DROP CONSTRAINT IF EXISTS user_permissions_msnv_fkey;

ALTER TABLE public.user_permissions
  ADD CONSTRAINT user_permissions_msnv_fkey
  FOREIGN KEY (msnv) REFERENCES public.employees(msnv) ON DELETE CASCADE;
