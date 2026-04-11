// Supabase configuration for data synchronization
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper functions for data synchronization
export const syncDataToSupabase = async (table: string, data: any[]) => {
  if (!supabase) return false;

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
  if (!supabase) return null;

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

export const getSupabase = () => supabase;