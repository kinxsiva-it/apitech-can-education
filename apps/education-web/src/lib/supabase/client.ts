import { createClient } from '@supabase/supabase-js'
import { readAuthLink } from '../../features/auth/auth-links'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

// Capture only error/recovery markers before the SDK consumes URL tokens.
export const initialAuthLink = readAuthLink(window.location)
export const AUTH_STORAGE_KEY = 'apitech-education-auth'

// One browser client; supabase-js persists sessions and refreshes tokens by default.
export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
    auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }) : null
