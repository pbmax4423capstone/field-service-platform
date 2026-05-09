/**
 * POST /api/voice/status
 *
 * Twilio status callback — fires when a call ends (or on interim status updates).
 * We use it to record call duration; the outcome is already persisted by the
 * WebSocket handler, but we update duration_seconds here from Twilio's data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import twilio from 'twilio'

function validateTwilioSignature(req: NextRequest, body: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  // Fail closed: if token is not configured, always reject
  if (!authToken) return false

  const signature = req.headers.get('x-twilio-signature') ?? ''

  let url: string
  if (process.env.NEXT_PUBLIC_APP_URL) {
    url = `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')}/api/voice/status`
  } else {
    const proto = req.headers.get('x-forwarded-proto') ?? (req.url.startsWith('https') ? 'https' : 'http')
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? ''
    url = `${proto}://${host}/api/voice/status`
  }

  const params: Record<string, string> = {}
  new URLSearchParams(body).forEach((value, key) => { params[key] = value })

  return twilio.validateRequest(authToken, signature, url, params)
}

export async function POST(req: NextRequest) {
  let bodyText: string
  try {
    bodyText = await req.text()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  if (!validateTwilioSignature(req, bodyText)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const formData = new URLSearchParams(bodyText)
  const callSid = formData.get('CallSid') ?? ''
  const callStatus = formData.get('CallStatus') ?? ''
  const callDuration = formData.get('CallDuration') ?? ''

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
