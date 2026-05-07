/**
 * POST /api/voice/inbound
 *
 * Twilio hits this endpoint when a customer calls the contractor's number.
 * We respond with TwiML that:
 *   1. Records the call.
 *   2. Streams the call audio to our WebSocket handler at /api/voice/stream.
 *
 * The caller's number (From) and the called number (To) are passed as custom
 * <Parameter> elements so the WebSocket handler can look up the organisation
 * without needing to make an additional Twilio API call.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const from = (formData.get('From') as string | null) ?? ''
  const to = (formData.get('To') as string | null) ?? ''
  const callSid = (formData.get('CallSid') as string | null) ?? ''

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(
    /\/+$/,
    '',
  )

  // Build the WebSocket URL — protocol wss:// in production, ws:// locally
  const wsUrl = appUrl
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://')
    + '/api/voice/stream'

  const statusCallbackUrl = `${appUrl}/api/voice/status`

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect action="${statusCallbackUrl}" method="POST">
    <Stream url="${wsUrl}">
      <Parameter name="callerNumber" value="${escapeXml(from)}" />
      <Parameter name="toNumber" value="${escapeXml(to)}" />
      <Parameter name="callSid" value="${escapeXml(callSid)}" />
    </Stream>
  </Connect>
</Response>`

  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
