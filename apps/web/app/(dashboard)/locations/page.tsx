import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { LocationsList } from '@/components/locations/LocationsList'

export const metadata = {
  title: 'Locations — DispatchForce AI',
}

export default async function LocationsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = (userData as any)?.organization_id as string

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, address, phone, is_primary, created_at')
    .eq('organization_id', orgId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  return <LocationsList initialLocations={(locations as any) ?? []} />
}
