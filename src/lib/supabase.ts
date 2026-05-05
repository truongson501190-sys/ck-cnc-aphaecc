// Supabase configuration for data synchronization
import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fix malformed URLs (e.g., " http//localhost" or " http://localhost")
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.trim().replace(/\s+/g, ''); // Remove all spaces
  
  // Fix missing protocol colon (e.g., http// -> http://)
  if (/^https?:\/\//i.test(supabaseUrl)) {
    // Already correct
  } else if (/^https?\/\//i.test(supabaseUrl)) {
    supabaseUrl = supabaseUrl.replace(/^(https?)/i, '$1:');
  } else if (!/^https?:\/\//i.test(supabaseUrl) && !supabaseUrl.startsWith('//')) {
    // No protocol at all, assume http:// for localhost
    supabaseUrl = 'http://' + supabaseUrl;
  }

  // Ensure no double protocols or other common typos
  supabaseUrl = supabaseUrl.replace(/^(https?:\/\/)+/i, '$1');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper functions for data synchronization
export const syncDataToSupabase = async (table: string, data: any[]) => {
  if (!supabase) return false;

  try {
    // Clear existing data safely
    // For Supabase, to delete all records we need a filter. 
    // We try multiple filters that might match different table PKs.
    const { error: deleteError } = await supabase.from(table).delete().gt('id', -1);
    if (deleteError && deleteError.message.includes('column "id" does not exist')) {
      // Fallback for tables like 'users' that use 'msnv' as primary or have no 'id'
      await supabase.from(table).delete().neq('msnv', '');
    }

    // Insert new data
    // Remove 'id' from data if it's a number to let DB generate it, 
    // but keep it if it's a string (UUID)
    const dataToInsert = data.map(item => {
      const newItem = { ...item };
      // If id is a number, it's likely a local serial or from DB, 
      // we might want to let DB regenerate it to avoid conflicts 
      // unless we want to preserve IDs. For now, let's keep it 
      // as the app seems to rely on local IDs.
      return newItem;
    });

    const { error } = await supabase.from(table).insert(dataToInsert);
    if (error) throw error;

    console.log(`✅ Synced ${data.length} records to ${table}`);
    return true;
  } catch (error: any) {
    // Only log if it's not a network error to avoid console spam
    if (error?.message !== 'Failed to fetch' && !error?.message?.includes('net::ERR')) {
      console.error(`❌ Failed to sync ${table}:`, error);
    }
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
  } catch (error: any) {
    // Only log if it's not a network error
    if (error?.message !== 'Failed to fetch' && !error?.message?.includes('net::ERR')) {
      console.error(`❌ Failed to load ${table}:`, error);
    }
    return null;
  }
};

export const getSupabase = () => supabase;