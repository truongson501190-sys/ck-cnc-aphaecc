-- Bật Realtime cho tất cả các bảng

-- ---------------------------------------------------------------------------
-- Tạo publication cho realtime
-- ---------------------------------------------------------------------------
DROP PUBLICATION IF EXISTS supabase_realtime;

CREATE PUBLICATION supabase_realtime FOR TABLE 
  public.users,
  public.user_records,
  public.user_permissions,
  public.roles_permissions,
  public.machines,
  public.projects,
  public.categories,
  public.warehouses,
  public.tools,
  public.customers,
  public.suppliers,
  public.employees,
  public.production_reports,
  public.maintenance_reports,
  public.qc_reports,
  public.stock_ledger,
  public.stock_documents,
  public.stock_document_lines,
  public.inventory_count_sessions,
  public.inventory_count_lines;

-- Bật replication cho INSERT, UPDATE, DELETE
ALTER PUBLICATION supabase_realtime SET (publish = 'insert, update, delete');

-- ---------------------------------------------------------------------------
-- Kiểm tra publication
-- ---------------------------------------------------------------------------
SELECT 
  p.pubname AS publication_name,
  COUNT(t.schemaname || '.' || t.tablename) AS table_count,
  string_agg(t.schemaname || '.' || t.tablename, ', ') AS tables
FROM pg_publication p
LEFT JOIN pg_publication_tables t ON p.pubname = t.pubname
WHERE p.pubname = 'supabase_realtime'
GROUP BY p.pubname;
