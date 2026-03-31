import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

let supabase: SupabaseClient

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} catch {
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key')
}

export { supabase }
