import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Kiểm tra biến môi trường
if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL is not defined')
  throw new Error('Missing VITE_SUPABASE_URL in .env.local')
}

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY is not defined')
  throw new Error('Missing VITE_SUPABASE_ANON_KEY in .env.local')
}

console.log('✅ Supabase configured successfully')
console.log('URL:', supabaseUrl.substring(0, 30) + '...')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const getSupabase = () => supabase
export default supabase