import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/admin-supabase'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }

    const body = await req.json()
    const { technicianId, scheduledStart } = body as {
      technicianId?: string | null
      scheduledStart?: string | null
    }

    // If a technician is specified, verify they belong to the same org
    if (technicianId) {
      const { data: tech } = await supabase
        .from('users')
        .select('id')
        .eq('id', technicianId)
        .eq('organization_id', userData.organization_id)
        .single()

      if (!tech) {
        return NextResponse.json({ error: 'Technician not found in organization' }, { status: 400 })
      }
    }

    const admin = createAdminClient()
    const updates: Record<string, unknown> = {}
    if (technicianId !== undefined) updates.technician_id = technicianId
    if (scheduledStart !== undefined) updates.scheduled_start = scheduledStart

    const { data: job, error } = await admin
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ job })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
