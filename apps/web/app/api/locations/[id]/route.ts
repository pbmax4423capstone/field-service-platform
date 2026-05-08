import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/admin-supabase'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

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
    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const orgId = (userData as any).organization_id as string
    const admin = createAdminClient()

    const { data: location, error: fetchError } = await admin
      .from('locations')
      .select('id, is_primary, organization_id')
      .eq('id', id)
      .single()

    if (fetchError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    if ((location as any).organization_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if ((location as any).is_primary) {
      return NextResponse.json(
        { error: 'Cannot delete the primary location. Set another location as primary first.' },
        { status: 422 },
      )
    }

    const { error: deleteError } = await admin.from('locations').delete().eq('id', id)
    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[locations DELETE]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
