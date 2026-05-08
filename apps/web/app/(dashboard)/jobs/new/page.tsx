import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NewJobForm } from '@/components/jobs/NewJobForm'

export default async function NewJobPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const orgId = userData?.organization_id

  // Fetch customers
  const { data: customers } = orgId
    ? await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .eq('organization_id', orgId)
        .order('last_name')
    : { data: [] }

  // Fetch technicians (users in the organization)
  const { data: technicians } = orgId
    ? await supabase
        .from('users')
        .select('id, full_name')
        .eq('organization_id', orgId)
        .order('full_name')
    : { data: [] }

  return <NewJobForm customers={customers ?? []} technicians={technicians ?? []} />
}
