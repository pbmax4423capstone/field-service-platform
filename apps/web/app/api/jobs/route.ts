import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      customer_id,
      address_id,
      title,
      scheduled_start,
      scheduled_end,
      description,
      internal_notes,
      technician_id,
    } = body

    // Validate required fields
    if (!customer_id || typeof customer_id !== 'string') {
      return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
    }
    if (!address_id || typeof address_id !== 'string') {
      return NextResponse.json({ error: 'address_id is required' }, { status: 400 })
    }
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (!scheduled_start || typeof scheduled_start !== 'string') {
      return NextResponse.json({ error: 'scheduled_start is required' }, { status: 400 })
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        organization_id: userData.organization_id,
        customer_id,
        address_id,
        title: title.trim(),
        scheduled_start,
        scheduled_end: scheduled_end || null,
        description: description?.trim() || null,
        internal_notes: internal_notes?.trim() || null,
        technician_id: technician_id || null,
        status: 'scheduled',
      })
      .select()
      .single()

    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 500 })
    }

    return NextResponse.json({ id: job.id }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : (err as any)?.message ?? 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
