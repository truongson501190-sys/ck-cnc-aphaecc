import { supabase, loadDataFromSupabase, syncDataToSupabase } from '@/supabase'

export const db = {
  async get(table: string) {
    // Use the robust loader with mapping
    return await loadDataFromSupabase(table)
  },

  async insert(table: string, item: any) {
    // Use the robust sync with mapping (as a single item array)
    return await syncDataToSupabase(table, [item])
  },

  async update(
    table: string,
    id: any, // Changed to any to support string IDs
    item: any
  ) {
    // For update, we can still use upsert via syncDataToSupabase
    // as it handles field mapping and onConflict.
    return await syncDataToSupabase(table, [{ ...item, id }])
  },

  async remove(table: string, id: any) {
    if (!supabase) return false;
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      return false
    }
    return true
  }
}