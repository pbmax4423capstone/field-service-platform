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

    const orgId = (userData as any).organization_id as string

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { technicianId, scheduledStart } = body as {
      technicianId?: string | null
      scheduledStart?: string | null
    }

    if (technicianId) {
      const { data: tech } = await supabase
        .from('users')
        .select('id')
        .eq('id', technicianId)
        .eq('organization_id', orgId)
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
      .eq('organization_id', orgId)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ job })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[jobs/assign PATCH]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
