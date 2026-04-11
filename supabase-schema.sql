-- Supabase Database Schema for Kho-app
-- Run this SQL in your Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  msnv TEXT UNIQUE NOT NULL,
  fullName TEXT NOT NULL,
  department TEXT,
  position TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  status TEXT NOT NULL DEFAULT 'active',
  permissions JSONB,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User records for authentication
CREATE TABLE IF NOT EXISTS user_records (
  id SERIAL PRIMARY KEY,
  msnv TEXT UNIQUE NOT NULL,
  fullName TEXT NOT NULL,
  department TEXT,
  position TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  status BOOLEAN NOT NULL DEFAULT true,
  passwordHash TEXT NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory items
CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  currentStock DECIMAL NOT NULL DEFAULT 0,
  minStock DECIMAL DEFAULT 0,
  maxStock DECIMAL,
  location TEXT,
  price DECIMAL DEFAULT 0,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warehouse locations
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'warehouse',
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warehouse transactions (base table)
CREATE TABLE IF NOT EXISTS warehouse_transactions (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL, -- 'import', 'export', 'transfer'
  itemId TEXT NOT NULL,
  itemName TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  price DECIMAL DEFAULT 0,
  totalValue DECIMAL DEFAULT 0,
  fromLocation TEXT,
  toLocation TEXT,
  reason TEXT,
  referenceNumber TEXT,
  operator TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  transactionDate DATE NOT NULL,
  notes TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_msnv ON users(msnv);
CREATE INDEX IF NOT EXISTS idx_user_records_msnv ON user_records(msnv);
CREATE INDEX IF NOT EXISTS idx_inventory_code ON inventory_items(code);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON warehouse_transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON warehouse_transactions(transactionDate);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON warehouse_transactions(referenceNumber);

-- Row Level Security (RLS) - Enable if needed
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE warehouse_transactions ENABLE ROW LEVEL SECURITY;

-- Insert default admin user (msnv: 1118, password: 1118)
INSERT INTO users (msnv, fullName, department, position, role, status, permissions)
VALUES (
  '1118',
  'Quản trị viên hệ thống',
  'Quản trị',
  'Quản trị viên',
  'admin',
  'active',
  '{
    "kho-tong": {"view": true, "add": true, "edit": true, "delete": true, "approve": true, "export": true},
    "kho-co-khi": {"view": true, "add": true, "edit": true, "delete": true, "approve": true, "export": true},
    "kho-cnc": {"view": true, "add": true, "edit": true, "delete": true, "approve": true, "export": true},
    "kho-dau": {"view": true, "add": true, "edit": true, "delete": true, "approve": true, "export": true},
    "bao-cao-tong-hop": {"view": true, "add": true, "edit": true, "delete": true, "approve": true, "export": true}
  }'
) ON CONFLICT (msnv) DO NOTHING;

INSERT INTO user_records (msnv, fullName, department, position, role, status, passwordHash)
VALUES (
  '1118',
  'Quản trị viên hệ thống',
  'Quản trị',
  'Quản trị viên',
  'admin',
  true,
  'YWRtaW4xMjM='  -- base64 encoded 'admin123'
) ON CONFLICT (msnv) DO NOTHING;