import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
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
    const { content } = body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const { data: note, error } = await supabase
      .from('job_notes')
      .insert({
        job_id: id,
        organization_id: userData?.organization_id,
        user_id: user.id,
        content: content.trim(),
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ note })
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err as any)?.message ?? 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
