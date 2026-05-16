import { supabase } from './supabase'

export const db = {
  async get(table: string) {
    const { data, error } = await supabase
      .from(table)
      .select('*')

    if (error) {
      console.error(error)
      return []
    }

    return data
  },

  async insert(table: string, item: any) {
    const { error } = await supabase
      .from(table)
      .insert([item])

    if (error) console.error(error)
  },

  async update(
    table: string,
    id: number,
    item: any
  ) {
    const { error } = await supabase
      .from(table)
      .update(item)
      .eq('id', id)

    if (error) console.error(error)
  },

  async remove(table: string, id: number) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)

    if (error) console.error(error)
  }
}