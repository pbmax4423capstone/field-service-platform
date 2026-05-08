import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/admin-supabase'

const bodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  is_primary: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
    }

    const { name, address, phone, is_primary } = parsed.data

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const orgId = (userData as any).organization_id as string
    const admin = createAdminClient()

    if (is_primary) {
      await admin
        .from('locations')
        .update({ is_primary: false })
        .eq('organization_id', orgId)
        .eq('is_primary', true)
    }

    const { data: location, error } = await admin
      .from('locations')
      .insert({
        organization_id: orgId,
        name,
        address: address ?? null,
        phone: phone ?? null,
        is_primary: is_primary ?? false,
      })
      .select('id, name, address, phone, is_primary, created_at')
      .single()

    if (error) throw error

    return NextResponse.json({ location }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[locations POST]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
