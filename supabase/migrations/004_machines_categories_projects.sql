-- 004_missing_tables.sql
-- Bảng còn thiếu cho hệ thống

-- ---------------------------------------------------------------------------
-- machines (máy móc)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_may TEXT,
  ten_may TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  gia_8h_1ca NUMERIC DEFAULT 0,
  gia_10h_1ca NUMERIC DEFAULT 0,
  gia_8h_2ca NUMERIC DEFAULT 0,
  gia_10h_2ca NUMERIC DEFAULT 0,
  gia_12h_1ca NUMERIC DEFAULT 0,
  gia_12h_2ca NUMERIC DEFAULT 0,
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- projects (dự án)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_du_an TEXT NOT NULL,
  ten_du_an TEXT NOT NULL,
  khach_hang TEXT,
  ngay_bat_dau DATE,
  ngay_ket_thuc DATE,
  trang_thai TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- categories (danh mục / chủng loại)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_loai TEXT NOT NULL,
  ten_loai TEXT NOT NULL,
  don_vi TEXT,
  gia NUMERIC DEFAULT 0,
  loai TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- warehouses (kho)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_kho TEXT NOT NULL,
  ten_kho TEXT NOT NULL,
  vi_tri TEXT,
  nguoi_phu_trach TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- tools (dao cụ)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_dao TEXT,
  ten_dao TEXT NOT NULL,
  don_vi TEXT,
  gia NUMERIC DEFAULT 0,
  ton_kho NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_machines_ten_may ON public.machines(ten_may);
CREATE INDEX IF NOT EXISTS idx_projects_ma_du_an ON public.projects(ma_du_an);
CREATE INDEX IF NOT EXISTS idx_categories_ten_loai ON public.categories(ten_loai);
CREATE INDEX IF NOT EXISTS idx_warehouses_ma_kho ON public.warehouses(ma_kho);
CREATE INDEX IF NOT EXISTS idx_tools_ten_dao ON public.tools(ten_dao);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS machines_all ON public.machines;
CREATE POLICY machines_all ON public.machines FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS projects_all ON public.projects;
CREATE POLICY projects_all ON public.projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS categories_all ON public.categories;
CREATE POLICY categories_all ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS warehouses_all ON public.warehouses;
CREATE POLICY warehouses_all ON public.warehouses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tools_all ON public.tools;
CREATE POLICY tools_all ON public.tools FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Grant permissions
-- ---------------------------------------------------------------------------
GRANT ALL ON public.machines TO anon, authenticated;
GRANT ALL ON public.projects TO anon, authenticated;
GRANT ALL ON public.categories TO anon, authenticated;
GRANT ALL ON public.warehouses TO anon, authenticated;
GRANT ALL ON public.tools TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Thêm dữ liệu mặc định
-- ---------------------------------------------------------------------------
INSERT INTO public.warehouses (ma_kho, ten_kho, vi_tri, status)
VALUES 
  ('KHO001', 'Kho chính', 'Nhà máy 1', 'active'),
  ('KHO002', 'Kho phụ', 'Nhà máy 1', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (ma_loai, ten_loai, don_vi, loai, status)
VALUES 
  ('DAO001', 'Dao phay', 'cái', 'tool', 'active'),
  ('DAO002', 'Dao khoan', 'cái', 'tool', 'active'),
  ('VATLIEU001', 'Thép SS400', 'kg', 'material', 'active')
ON CONFLICT DO NOTHING;
-- Master Data: Machines, Projects, Categories, Warehouses, Tools, Customers, Suppliers

-- ---------------------------------------------------------------------------
-- machines (máy móc)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_may TEXT,
  ten_may TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  gia_8h_1ca NUMERIC DEFAULT 0,
  gia_10h_1ca NUMERIC DEFAULT 0,
  gia_8h_2ca NUMERIC DEFAULT 0,
  gia_10h_2ca NUMERIC DEFAULT 0,
  gia_12h_1ca NUMERIC DEFAULT 0,
  gia_12h_2ca NUMERIC DEFAULT 0,
  ghi_chu TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- projects (dự án)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_du_an TEXT NOT NULL,
  ten_du_an TEXT NOT NULL,
  khach_hang TEXT,
  ngay_bat_dau DATE,
  ngay_ket_thuc DATE,
  trang_thai TEXT DEFAULT 'active',
  mo_ta TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- categories (danh mục / chủng loại)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_loai TEXT NOT NULL,
  ten_loai TEXT NOT NULL,
  don_vi TEXT,
  gia NUMERIC DEFAULT 0,
  loai TEXT CHECK (loai IN ('tool', 'material', 'spare_part', 'other')),
  status TEXT DEFAULT 'active',
  mo_ta TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- warehouses (kho)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_kho TEXT NOT NULL,
  ten_kho TEXT NOT NULL,
  vi_tri TEXT,
  nguoi_phu_trach TEXT,
  status TEXT DEFAULT 'active',
  mo_ta TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- tools (dao cụ)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_dao TEXT,
  ten_dao TEXT NOT NULL,
  don_vi TEXT DEFAULT 'cái',
  gia NUMERIC DEFAULT 0,
  ton_kho NUMERIC DEFAULT 0,
  ton_toi_thieu NUMERIC DEFAULT 0,
  vi_tri TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- customers (khách hàng)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_kh TEXT NOT NULL,
  ten_kh TEXT NOT NULL,
  dia_chi TEXT,
  dien_thoai TEXT,
  email TEXT,
  ma_so_thue TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- suppliers (nhà cung cấp)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ma_ncc TEXT NOT NULL,
  ten_ncc TEXT NOT NULL,
  dia_chi TEXT,
  dien_thoai TEXT,
  email TEXT,
  ma_so_thue TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- employees (nhân viên)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  msnv TEXT NOT NULL UNIQUE,
  ho_ten TEXT NOT NULL,
  ngay_sinh DATE,
  gioi_tinh TEXT CHECK (gioi_tinh IN ('Nam', 'Nữ', 'Khác')),
  chuc_vu TEXT,
  phong_ban TEXT,
  dien_thoai TEXT,
  email TEXT,
  ngay_vao_lam DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_machines_ten_may ON public.machines(ten_may);
CREATE INDEX IF NOT EXISTS idx_machines_ma_may ON public.machines(ma_may);
CREATE INDEX IF NOT EXISTS idx_projects_ma_du_an ON public.projects(ma_du_an);
CREATE INDEX IF NOT EXISTS idx_categories_ten_loai ON public.categories(ten_loai);
CREATE INDEX IF NOT EXISTS idx_warehouses_ma_kho ON public.warehouses(ma_kho);
CREATE INDEX IF NOT EXISTS idx_tools_ten_dao ON public.tools(ten_dao);
CREATE INDEX IF NOT EXISTS idx_customers_ma_kh ON public.customers(ma_kh);
CREATE INDEX IF NOT EXISTS idx_suppliers_ma_ncc ON public.suppliers(ma_ncc);
CREATE INDEX IF NOT EXISTS idx_employees_msnv ON public.employees(msnv);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS machines_all ON public.machines;
CREATE POLICY machines_all ON public.machines FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS projects_all ON public.projects;
CREATE POLICY projects_all ON public.projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS categories_all ON public.categories;
CREATE POLICY categories_all ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS warehouses_all ON public.warehouses;
CREATE POLICY warehouses_all ON public.warehouses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tools_all ON public.tools;
CREATE POLICY tools_all ON public.tools FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS customers_all ON public.customers;
CREATE POLICY customers_all ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS suppliers_all ON public.suppliers;
CREATE POLICY suppliers_all ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS employees_all ON public.employees;
CREATE POLICY employees_all ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Grant permissions
-- ---------------------------------------------------------------------------
GRANT ALL ON public.machines TO anon, authenticated;
GRANT ALL ON public.projects TO anon, authenticated;
GRANT ALL ON public.categories TO anon, authenticated;
GRANT ALL ON public.warehouses TO anon, authenticated;
GRANT ALL ON public.tools TO anon, authenticated;
GRANT ALL ON public.customers TO anon, authenticated;
GRANT ALL ON public.suppliers TO anon, authenticated;
GRANT ALL ON public.employees TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Insert default data
-- ---------------------------------------------------------------------------

-- Warehouses
INSERT INTO public.warehouses (ma_kho, ten_kho, vi_tri, status)
VALUES 
  ('KHO001', 'Kho chính', 'Nhà máy 1', 'active'),
  ('KHO002', 'Kho phụ', 'Nhà máy 1', 'active'),
  ('KHO003', 'Kho nguyên vật liệu', 'Nhà máy 1', 'active'),
  ('KHO004', 'Kho thành phẩm', 'Nhà máy 1', 'active')
ON CONFLICT DO NOTHING;

-- Categories
INSERT INTO public.categories (ma_loai, ten_loai, don_vi, loai, status)
VALUES 
  ('DAO001', 'Dao phay mặt đầu', 'cái', 'tool', 'active'),
  ('DAO002', 'Dao phay ngón', 'cái', 'tool', 'active'),
  ('DAO003', 'Dao khoan', 'cái', 'tool', 'active'),
  ('DAO004', 'Dao tiện', 'cái', 'tool', 'active'),
  ('VATLIEU001', 'Thép SS400', 'kg', 'material', 'active'),
  ('VATLIEU002', 'Nhôm A6061', 'kg', 'material', 'active'),
  ('VATLIEU003', 'Đồng C3604', 'kg', 'material', 'active')
ON CONFLICT DO NOTHING;

-- Machines
INSERT INTO public.machines (ma_may, ten_may, status, gia_8h_1ca, gia_10h_1ca, gia_8h_2ca, gia_10h_2ca, gia_12h_1ca, gia_12h_2ca)
VALUES 
  ('MAY001', 'NEWAY FB160HC', 'active', 500000, 600000, 550000, 650000, 700000, 800000),
  ('MAY002', 'HISION GNU 32x80', 'active', 450000, 540000, 495000, 585000, 630000, 720000),
  ('MAY003', 'MITSUBISHI', 'active', 400000, 480000, 440000, 520000, 560000, 640000),
  ('MAY004', 'AWEA LP5025', 'active', 380000, 456000, 418000, 494000, 532000, 608000),
  ('MAY005', 'DOOSAN DNM 500', 'active', 420000, 504000, 462000, 546000, 588000, 672000)
ON CONFLICT DO NOTHING;

-- Employees (thêm nhân viên mẫu)
INSERT INTO public.employees (msnv, ho_ten, chuc_vu, phong_ban, status)
VALUES 
  ('1118', 'Nguyễn Trường Sơn', 'Admin', 'Ban Giám Đốc', 'active'),
  ('1001', 'Trần Văn An', 'Tổ trưởng', 'Xưởng CNC', 'active'),
  ('1002', 'Lê Thị Bình', 'Tổ phó', 'Xưởng CNC', 'active'),
  ('1003', 'Phạm Văn Cường', 'Nhóm trưởng', 'Xưởng CNC', 'active'),
  ('1004', 'Nguyễn Văn Dũng', 'Kỹ thuật viên', 'Xưởng CNC', 'active')
ON CONFLICT (msnv) DO NOTHING;