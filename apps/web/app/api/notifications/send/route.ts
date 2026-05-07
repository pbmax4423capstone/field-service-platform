import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { dispatchJobNotification, type NotificationEvent } from '@/lib/notifications'

const bodySchema = z.object({
  orgId: z.string().uuid(),
  jobId: z.string().uuid(),
  event: z.enum([
    'appointment_reminder_24h',
    'appointment_reminder_2h',
    'appointment_confirmed',
    'technician_en_route',
    'job_completed',
    'invoice_sent',
    'invoice_paid',
    'review_request',
    'booking_confirmed',
  ]),
})

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) return false
  const authHeader = req.headers.get('authorization') ?? ''
  return authHeader === `Bearer ${secret}`
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  try {
    await dispatchJobNotification({
      orgId: parsed.data.orgId,
      jobId: parsed.data.jobId,
      event: parsed.data.event as NotificationEvent,
    })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[notifications/send]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
