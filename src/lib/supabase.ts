import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // We'll handle this gracefully in the UI, but it's good to log
  console.warn('Missing Supabase Environment Variables')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
