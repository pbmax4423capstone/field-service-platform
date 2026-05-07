import { createApiClient } from '@field-service/api-client'
import { createClient } from './supabase'

export function getApiClient() {
  const supabase = createClient()
  return createApiClient(supabase as any)
}
