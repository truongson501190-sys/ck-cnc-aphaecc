import { createClient } from '@supabase/supabase-js';

// ================= ENV =================
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// ================= FIX URL =================
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim().replace(/\s+/g, '');

  if (/^https?:\/\//i.test(supabaseUrl)) {
    // OK
  } else if (/^https?\/\//i.test(supabaseUrl)) {
    supabaseUrl = supabaseUrl.replace(/^(https?)/i, '$1:');
  } else {
    supabaseUrl = 'https://' + supabaseUrl;
  }

  supabaseUrl = supabaseUrl.replace(/^(https?:\/\/)+/i, '$1');
}

// ================= CREATE CLIENT (DUY NHẤT 1 LẦN) =================
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// ================= DEBUG =================
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase KEY:', supabaseAnonKey);

// ================= SYNC =================
export const syncDataToSupabase = async (table: string, data: any[]) => {
  if (!supabase) return false;

  try {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .gt('id', -1);

    if (deleteError && deleteError.message.includes('column "id" does not exist')) {
      await supabase.from(table).delete().neq('msnv', '');
    }

    const { error } = await supabase.from(table).insert(data);
    if (error) throw error;

    console.log(`✅ Synced ${data.length} records to ${table}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Sync error ${table}:`, error);
    return false;
  }
};

// ================= LOAD =================
export const loadDataFromSupabase = async (table: string) => {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;

    console.log(`✅ Loaded ${data?.length || 0} records from ${table}`);
    return data;
  } catch (error: any) {
    console.error(`❌ Load error ${table}:`, error);
    return null;
  }
};

// ================= GETTER =================
export const getSupabase = () => supabase;