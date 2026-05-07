import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const updateEstimateSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'declined', 'expired']).optional(),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  valid_until: z.string().optional().nullable(),
  sent_at: z.string().optional().nullable(),
  accepted_at: z.string().optional().nullable(),
  declined_at: z.string().optional().nullable(),
})

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
    const parsed = updateEstimateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
    }

    const updates: Record<string, unknown> = { ...parsed.data }

    if (parsed.data.status === 'sent' && !parsed.data.sent_at) {
      updates.sent_at = new Date().toISOString()
    }
    if (parsed.data.status === 'accepted' && !parsed.data.accepted_at) {
      updates.accepted_at = new Date().toISOString()
    }
    if (parsed.data.status === 'declined' && !parsed.data.declined_at) {
      updates.declined_at = new Date().toISOString()
    }

    const { data: estimate, error } = await supabase
      .from('estimates')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', userData?.organization_id ?? '')
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ estimate })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
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

    const { error } = await supabase
      .from('estimates')
      .delete()
      .eq('id', id)
      .eq('organization_id', userData?.organization_id ?? '')
      .eq('status', 'draft')

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
