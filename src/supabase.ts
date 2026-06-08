// src/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are missing')
  console.warn('URL:', supabaseUrl)
  console.warn('Key:', supabaseAnonKey ? 'exists' : 'missing')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)