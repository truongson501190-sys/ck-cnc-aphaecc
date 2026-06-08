import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are missing')
  console.warn('Please create .env.local with:')
  console.warn('VITE_SUPABASE_URL=your-url')
  console.warn('VITE_SUPABASE_ANON_KEY=your-key')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Export cho các module cũ dùng getSupabase
export const getSupabase = () => supabase

export default supabase
