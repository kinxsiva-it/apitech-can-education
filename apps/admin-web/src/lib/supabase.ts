import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
export const ADMIN_AUTH_KEY = 'apitech-admin-auth'
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storageKey: ADMIN_AUTH_KEY,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null
