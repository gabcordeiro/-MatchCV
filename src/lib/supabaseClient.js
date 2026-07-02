import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Flag used across the UI to show a friendly setup message when the
// environment variables haven't been configured yet.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[MatchCV] Supabase não configurado. Crie um arquivo .env a partir de .env.example ' +
      'com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
  )
}

// When not configured we still create a client with placeholder values so the
// app can render (the auth screens will show a setup notice instead of crashing).
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)
