import { createClient } from '@supabase/supabase-js'
import type { Tables } from '@field-service/shared'

export type Database = {
  public: {
    Tables: {
      [K in keyof Tables]: {
        Row: Tables[K]
        Insert: Omit<Tables[K], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Tables[K], 'id' | 'organization_id' | 'created_at'>>
      }
    }
  }
}

export function createSupabaseClient(supabaseUrl: string, supabaseAnonKey: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

export function createSupabaseServerClient(supabaseUrl: string, supabaseServiceRoleKey: string) {
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export type SupabaseClient = ReturnType<typeof createSupabaseClient>
