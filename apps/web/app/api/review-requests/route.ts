import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendReviewRequest } from '@/lib/notifications'

const bodySchema = z.object({
  jobId: z.string().uuid(),
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

    // Verify the job belongs to the caller's org
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { data: job } = await supabase
      .from('jobs')
      .select('id, organization_id, status')
      .eq('id', parsed.data.jobId)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    if (job.organization_id !== userData.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await sendReviewRequest(parsed.data.jobId)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[review-requests POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
