import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const getSupabase = () => supabase;

export const syncDataToSupabase = async (table: string, data: any[]) => {
  try {
    // Xóa hết dữ liệu cũ và chèn dữ liệu mới
    const { error } = await supabase.from(table).upsert(data);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error syncing data to Supabase:', error);
    return false;
  }
};

export const loadDataFromSupabase = async (table: string) => {
  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error loading data from Supabase:', error);
    return null;
  }
};
