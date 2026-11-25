-- Migration script: chuyển dữ liệu text sang foreign key ID
-- Chạy sau khi đã tạo schema mới trong supabase-schema.sql

BEGIN;

-- 1. Tạo bảng master nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  unit TEXT,
  price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  type TEXT NOT NULL DEFAULT 'warehouse',
  address TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  project_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS machines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  employee_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('nhap','xuat','nhan','admin','manager','user')),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  permissions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Thêm cột ID mới cho warehouse_transactions
ALTER TABLE warehouse_transactions
  ADD COLUMN IF NOT EXISTS category_id INTEGER,
  ADD COLUMN IF NOT EXISTS warehouse_id INTEGER,
  ADD COLUMN IF NOT EXISTS from_warehouse_id INTEGER,
  ADD COLUMN IF NOT EXISTS to_warehouse_id INTEGER,
  ADD COLUMN IF NOT EXISTS project_id INTEGER,
  ADD COLUMN IF NOT EXISTS machine_id INTEGER,
  ADD COLUMN IF NOT EXISTS created_by INTEGER,
  ADD COLUMN IF NOT EXISTS received_by INTEGER,
  ADD COLUMN IF NOT EXISTS approved_by INTEGER;

-- 3. Seed master data từ dữ liệu hiện tại
INSERT INTO categories (name)
SELECT DISTINCT TRIM(itemName)
FROM warehouse_transactions
WHERE itemName IS NOT NULL AND itemName <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO warehouses (name)
SELECT DISTINCT TRIM(fromLocation)
FROM warehouse_transactions
WHERE fromLocation IS NOT NULL AND fromLocation <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO warehouses (name)
SELECT DISTINCT TRIM(toLocation)
FROM warehouse_transactions
WHERE toLocation IS NOT NULL AND toLocation <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO projects (project_code, name)
SELECT DISTINCT TRIM(projectId), TRIM(projectId)
FROM warehouse_transactions
WHERE projectId IS NOT NULL AND projectId <> ''
ON CONFLICT (project_code) DO NOTHING;

INSERT INTO machines (name)
SELECT DISTINCT TRIM(machineId)
FROM warehouse_transactions
WHERE machineId IS NOT NULL AND machineId <> ''
ON CONFLICT (name) DO NOTHING;

-- Nếu có bảng người dùng legacy, migrate qua users
INSERT INTO users (employee_code, full_name, role, status, permissions)
SELECT
  COALESCE(msnv, employee_code, CONCAT('EMP_', id::TEXT)),
  COALESCE(fullName, hoTen, name, employee_code, msnv),
  'user',
  'active',
  NULL
FROM public.users
ON CONFLICT (employee_code) DO NOTHING;

-- 4. Map dữ liệu text sang ID
UPDATE warehouse_transactions w
SET category_id = c.id
FROM categories c
WHERE TRIM(w.itemName) = TRIM(c.name);

UPDATE warehouse_transactions w
SET warehouse_id = c.id
FROM warehouses c
WHERE TRIM(w.toLocation) = TRIM(c.name);

UPDATE warehouse_transactions w
SET from_warehouse_id = c.id
FROM warehouses c
WHERE TRIM(w.fromLocation) = TRIM(c.name);

UPDATE warehouse_transactions w
SET to_warehouse_id = c.id
FROM warehouses c
WHERE TRIM(w.toLocation) = TRIM(c.name);

UPDATE warehouse_transactions w
SET project_id = p.id
FROM projects p
WHERE TRIM(w.projectId) = TRIM(p.project_code);

UPDATE warehouse_transactions w
SET machine_id = m.id
FROM machines m
WHERE TRIM(w.machineId) = TRIM(m.name);

UPDATE warehouse_transactions w
SET created_by = u.id
FROM users u
WHERE TRIM(w.operator) IN (TRIM(u.full_name), TRIM(u.employee_code));

UPDATE warehouse_transactions w
SET approved_by = u.id
FROM users u
WHERE TRIM(w.approver) IN (TRIM(u.full_name), TRIM(u.employee_code));

-- 5. Thêm ràng buộc foreign key
ALTER TABLE warehouse_transactions
  ADD CONSTRAINT fk_warehouse_transactions_category FOREIGN KEY (category_id) REFERENCES categories(id),
  ADD CONSTRAINT fk_warehouse_transactions_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  ADD CONSTRAINT fk_warehouse_transactions_from_warehouse FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
  ADD CONSTRAINT fk_warehouse_transactions_to_warehouse FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
  ADD CONSTRAINT fk_warehouse_transactions_project FOREIGN KEY (project_id) REFERENCES projects(id),
  ADD CONSTRAINT fk_warehouse_transactions_machine FOREIGN KEY (machine_id) REFERENCES machines(id),
  ADD CONSTRAINT fk_warehouse_transactions_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  ADD CONSTRAINT fk_warehouse_transactions_received_by FOREIGN KEY (received_by) REFERENCES users(id),
  ADD CONSTRAINT fk_warehouse_transactions_approved_by FOREIGN KEY (approved_by) REFERENCES users(id);

COMMIT;
