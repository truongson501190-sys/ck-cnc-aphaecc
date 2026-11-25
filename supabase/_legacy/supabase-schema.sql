-- Supabase Database Schema for Kho-app (Relational design)
-- Master tables and relational constraints

-- Categories master table
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  unit TEXT,
  price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warehouses master table
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

-- Projects master table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  project_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Machines master table
CREATE TABLE IF NOT EXISTS machines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users master table (Người nhập - xuất)
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

-- Warehouse transaction table with foreign keys
CREATE TABLE IF NOT EXISTS warehouse_transactions (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  warehouse_id INTEGER REFERENCES warehouses(id),
  from_warehouse_id INTEGER REFERENCES warehouses(id),
  to_warehouse_id INTEGER REFERENCES warehouses(id),
  project_id INTEGER REFERENCES projects(id),
  machine_id INTEGER REFERENCES machines(id),
  created_by INTEGER REFERENCES users(id),
  received_by INTEGER REFERENCES users(id),
  approved_by INTEGER REFERENCES users(id),
  reason TEXT,
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  transaction_date DATE NOT NULL,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for foreign key lookups and filtering
CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_type ON warehouse_transactions(type);
CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_date ON warehouse_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_reference ON warehouse_transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_category ON warehouse_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_from_warehouse ON warehouse_transactions(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transactions_to_warehouse ON warehouse_transactions(to_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_users_employee_code ON users(employee_code);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_warehouses_name ON warehouses(name);
CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(project_code);
CREATE INDEX IF NOT EXISTS idx_machines_name ON machines(name);

-- Legacy tables for compatibility (if you still need them)
-- Note: these tables are kept only for backward compatibility and migration support.
CREATE TABLE IF NOT EXISTS user_records (
  id SERIAL PRIMARY KEY,
  employee_code TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default admin seed for the new users table
INSERT INTO users (employee_code, full_name, role, status, permissions)
VALUES (
  '1118',
  'Quản trị viên hệ thống',
  'admin',
  'active',
  '{
    "kho-tong": {"view": true, "add": true, "edit": true, "delete": true, "approve": true, "export": true},
    "kho-co-khi": {"view": true, "add": true, "edit": true, "delete": true, "approve": true, "export": true},
    "kho-cnc": {"view": true, "add": true, "edit": true, "delete": true, "approve": true, "export": true},
    "kho-dau": {"view": true, "add": true, "edit": true, "delete": true, "approve": true, "export": true},
    "bao-cao-tong-hop": {"view": true, "add": true, "edit": true, "delete": true, "approve": true, "export": true}
  }'
)
ON CONFLICT (employee_code) DO NOTHING;

INSERT INTO user_records (employee_code, password_hash, status)
VALUES ('1118', 'YWRtaW4xMjM=', true)
ON CONFLICT (employee_code) DO NOTHING;
