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