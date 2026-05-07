import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/admin-supabase'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
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

    // Verify the post belongs to this org and is still scheduled
    const { data: post } = await admin
      .from('social_posts')
      .select('id, organization_id, status')
      .eq('id', id)
      .single()

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    if (post.organization_id !== orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (post.status !== 'scheduled') {
      return NextResponse.json({ error: 'Only scheduled posts can be deleted' }, { status: 422 })
    }

    const { error } = await admin.from('social_posts').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[social/posts DELETE]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
