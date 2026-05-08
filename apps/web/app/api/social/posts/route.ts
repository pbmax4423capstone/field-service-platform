import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/admin-supabase'

const bodySchema = z.object({
  platform: z.enum(['facebook', 'instagram', 'tiktok']),
  content: z.string().min(1).max(280),
  scheduled_for: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
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
    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const orgId = (userData as any).organization_id as string

    const { data: posts, error } = await supabase
      .from('social_posts')
      .select('id, platforms, content, status, scheduled_for, published_at, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    return NextResponse.json({ posts: posts ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[social/posts GET]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

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
      return NextResponse.json({ error: parsed.error.issues.map((i: any) => i.message).join(', ') }, { status: 400 })
    }

    const { platform, content, scheduled_for } = parsed.data

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const orgId = (userData as any).organization_id as string

    const now = new Date()
    const isInPast = scheduled_for ? new Date(scheduled_for) <= now : true
    const status = isInPast ? 'published' : 'scheduled'
    const publishedAt = isInPast ? now.toISOString() : null

    const admin = createAdminClient()
    const { data: post, error } = await admin
      .from('social_posts')
      .insert({
        organization_id: orgId,
        platforms: [platform],
        content,
        status,
        scheduled_for: scheduled_for ?? null,
        published_at: publishedAt,
        created_by: user.id,
      })
      .select('id, platforms, content, status, scheduled_for, published_at, created_at')
      .single()

    if (error) throw error

    return NextResponse.json({ post }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[social/posts POST]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
