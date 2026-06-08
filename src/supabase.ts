import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are missing')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for data synchronization
export const syncDataToSupabase = async (table: string, data: any[]) => {
  try {
    // Clear existing data
    await supabase.from(table).delete().neq('id', ''); // Delete all records

    // Insert new data
    const { error } = await supabase.from(table).insert(data);
    if (error) throw error;

    console.log(`✅ Synced ${data.length} records to ${table}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to sync ${table}:`, error);
    return false;
  }
};

export const loadDataFromSupabase = async (table: string) => {
  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;

    console.log(`✅ Loaded ${data?.length || 0} records from ${table}`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to load ${table}:`, error);
    return null;
  }
};

export const getSupabase = () => supabase