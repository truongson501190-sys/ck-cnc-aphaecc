import { createClient } from '@supabase/supabase-js';
import type { RawRecord } from '@/types/common';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
let supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

export const supabase = null;

export const syncDataToSupabase = async (table: string, data: RawRecord[]) => {
  return true;
};

export const loadDataFromSupabase = async (table: string) => {
  return null;
};

export const getSupabase = () => null;
