import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = null;

export const syncDataToSupabase = async (table: string, data: RawRecord[]) => {
  return true;
};

export const loadDataFromSupabase = async (table: string) => {
  return null;
};

export const getSupabase = () => null;
