/**
 * POST /api/voice/status
 *
 * Twilio status callback — fires when a call ends (or on interim status updates).
 * We use it to record call duration; the outcome is already persisted by the
 * WebSocket handler, but we update duration_seconds here from Twilio's data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const callSid = (formData.get('CallSid') as string | null) ?? ''
  const callStatus = (formData.get('CallStatus') as string | null) ?? ''
  const callDuration = (formData.get('CallDuration') as string | null) ?? ''

  if (!callSid) {
    return NextResponse.json({ error: 'Missing CallSid' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Map Twilio final statuses to our outcome enum values
  const outcomeMap: Record<string, string> = {
    completed: 'answered',
    'no-answer': 'missed',
    busy: 'missed',
    failed: 'error',
    canceled: 'missed',
  }

  const updateData: Record<string, unknown> = {}
  if (callDuration) {
    const seconds = parseInt(callDuration, 10)
    if (!isNaN(seconds)) updateData.duration_seconds = seconds
  }
  if (outcomeMap[callStatus]) {
    // Only update outcome if the call didn't end cleanly via WebSocket
    // (the WS handler sets 'answered' or 'booked'; status callback may fire after)
    if (callStatus === 'no-answer' || callStatus === 'busy' || callStatus === 'canceled') {
      updateData.outcome = outcomeMap[callStatus]
    }
  }

  if (Object.keys(updateData).length > 0) {
    const { error } = await admin
      .from('voice_calls')
      .update(updateData)
      .eq('twilio_call_sid', callSid)

    if (error) {
      console.error('[voice/status] update error:', error)
    }
  }

  return new NextResponse('', { status: 204 })
}
