import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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

    const body = await req.json()
    const { title, description, internal_notes, scheduled_start, scheduled_end, technician_id } = body

    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (internal_notes !== undefined) updates.internal_notes = internal_notes
    if (scheduled_start !== undefined) updates.scheduled_start = scheduled_start
    if (scheduled_end !== undefined) updates.scheduled_end = scheduled_end
    if (technician_id !== undefined) updates.technician_id = technician_id

    const { data: job, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', userData?.organization_id ?? '')
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ job })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err as any)?.message ?? 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
