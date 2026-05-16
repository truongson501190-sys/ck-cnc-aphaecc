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
    console.log(`🔄 Syncing ${data.length} records to ${table}...`);
    
    // Use upsert instead of delete + insert for better multi-device sync
    // This preserves existing records on the cloud that aren't in local storage
    // and updates existing ones that are in both.
    const { error } = await supabase
      .from(table)
      .upsert(data, { 
        onConflict: table === 'user_records' ? 'msnv' : 'id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      // Fallback if upsert with specific onConflict fails
      console.warn(`⚠️ Specific upsert failed for ${table}, trying generic:`, error.message);
      const { error: error2 } = await supabase.from(table).upsert(data);
      if (error2) throw error2;
    }

    console.log(`✅ Synced ${data.length} records to ${table}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Sync error ${table}:`, error.message || error);
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