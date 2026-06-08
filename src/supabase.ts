import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('🔍 Supabase Config:')
console.log('  URL:', supabaseUrl ? '✅ exists' : '❌ missing')
console.log('  Key:', supabaseAnonKey ? '✅ exists' : '❌ missing')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
export const getSupabase = () => supabase

export const loadDataFromSupabase = async (tableName: string) => {
  if (!supabase) return []
  try {
    const { data, error } = await supabase.from(tableName).select('*')
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Load error from', tableName, error)
    return []
  }
}

export const syncDataToSupabase = async (tableName: string, data: any[]) => {
  if (!supabase) return false
  if (!data || data.length === 0) return true
  
  try {
    const { error } = await supabase.from(tableName).upsert(data, {
      onConflict: 'id',
      ignoreDuplicates: false
    })
    if (error) throw error
    return true
  } catch (error) {
    console.error('Sync error to', tableName, error)
    return false
  }
}

export default supabase