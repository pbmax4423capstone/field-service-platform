import { createClient } from '@supabase/supabase-js'

// Intentionally untyped — the custom Database generic caused `never` inference
// on all table operations. Explicit types on individual API functions remain intact.
export function createSupabaseClient(supabaseUrl: string, supabaseAnonKey: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

export function createSupabaseServerClient(supabaseUrl: string, supabaseServiceRoleKey: string) {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export type SupabaseClient = ReturnType<typeof createSupabaseClient>
// Keep Database export for any downstream consumers that reference it
export type Database = { public: { Tables: Record<string, unknown> } }
