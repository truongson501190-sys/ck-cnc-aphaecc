// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const isDeadSupabaseHost = /oxolhlkfezihtvtyjyxf|your-project-id/i.test(supabaseUrl);

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey && !isDeadSupabaseHost);

if (!hasSupabaseConfig) {
  console.warn('⚠️ Supabase is disabled until a valid project URL and anon key are configured.');
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as unknown as SupabaseClient;

export type { SupabaseClient };