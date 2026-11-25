// src/supabase.ts
import { createClient } from '@supabase/supabase-js'

// @ts-ignore: import.meta.env is provided by Vite at build time
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
// @ts-ignore: import.meta.env is provided by Vite at build time
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
// Chỉ blacklist placeholder, KHÔNG blacklist project thật
const isDeadSupabaseHost = /your-project-id/i.test(supabaseUrl)

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey && !isDeadSupabaseHost)

console.log('🔍 Supabase Config:')
console.log('  URL:', supabaseUrl ? '✅ exists' : '❌ missing')
console.log('  Key:', supabaseAnonKey ? '✅ exists' : '❌ missing')

if (!hasSupabaseConfig) {
  console.warn('⚠️ Supabase is disabled until a valid project URL and anon key are configured.')
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any

export const getSupabase = () => supabase

export const loadDataFromSupabase = async (tableName: string) => {
  if (!supabase) return []
  try {
    const { data, error } = await supabase.from(tableName).select('*')
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Load error from', tableName, error)
    return []
  }
}

// Filter out columns that don't exist in Supabase
const sanitizeDataForTable = (tableName: string, data: any[]): any[] => {
  if (!Array.isArray(data) || data.length === 0) return data;

  const tableColumns: Record<string, string[]> = {
    users: ['id', 'msnv', 'full_name', 'department', 'position', 'role', 'role_group', 'status', 'created_at', 'updated_at'],
  };

  const allowedColumns = tableColumns[tableName];
  if (!allowedColumns) return data;

  return data.map(item => {
    const sanitized: any = {};
    allowedColumns.forEach(col => {
      if (col in item) {
        sanitized[col] = item[col];
      }
    });
    return sanitized;
  });
};

export const syncDataToSupabase = async (tableName: string, data: any[]) => {
  if (!supabase) return false
  if (!data || data.length === 0) return true

  try {
    const sanitizedData = sanitizeDataForTable(tableName, data);

    if (tableName === 'users' && sanitizedData.length > 0) {
      console.log(`📤 Syncing ${tableName}:`, {
        count: sanitizedData.length,
        columns: Object.keys(sanitizedData[0]),
        sample: JSON.stringify(sanitizedData[0])
      });
    }

    let onConflictColumn = 'id';
    if (tableName === 'users') {
      onConflictColumn = 'msnv';
    }

    const { error } = await supabase.from(tableName).upsert(sanitizedData, {
      onConflict: onConflictColumn,
      ignoreDuplicates: false
    })
    if (error) throw error
    console.log(`✅ Synced ${sanitizedData.length} records to ${tableName}`);
    return true
  } catch (error: any) {
    if (error?.code === 'PGRST204') {
      return false;
    }

    if (tableName === 'users') {
      console.error(`❌ Sync error to ${tableName}:`, {
        status: error?.status,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        description: error?.description
      });
    }
    return false
  }
}

export default supabase