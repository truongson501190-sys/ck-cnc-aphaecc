import { supabase, loadDataFromSupabase, syncDataToSupabase } from '@/supabase'
import type { RawRecord } from '@/types/common'

export const db = {
  async get(table: string) {
    return await loadDataFromSupabase(table)
  },

  async insert(table: string, item: RawRecord) {
    return await syncDataToSupabase(table, [item])
  },

  async update(
    table: string,
    id: string | number,
    item: RawRecord
  ) {
    // For update, we can still use upsert via syncDataToSupabase
    // as it handles field mapping and onConflict.
    return await syncDataToSupabase(table, [{ ...item, id }])
  },

  async remove(table: string, id: string | number) {
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