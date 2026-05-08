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
    const { first_name, last_name, phone, email, phone_alt, notes } = body

    const updates: Record<string, unknown> = {}
    if (first_name !== undefined) updates.first_name = first_name
    if (last_name !== undefined) updates.last_name = last_name
    if (phone !== undefined) updates.phone = phone
    if (email !== undefined) updates.email = email
    if (phone_alt !== undefined) updates.phone_alt = phone_alt
    if (notes !== undefined) updates.notes = notes

    const { data: customer, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', userData?.organization_id ?? '')
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ customer })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err as any)?.message ?? 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
