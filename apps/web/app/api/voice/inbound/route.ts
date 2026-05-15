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
import twilio from 'twilio'

function validateTwilioSignature(req: NextRequest, body: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  // Fail closed: if token is not configured, always reject
  if (!authToken) return false

  const signature = req.headers.get('x-twilio-signature') ?? ''

  // Build the canonical URL that Twilio signed against.
  // NEXT_PUBLIC_APP_URL is the authoritative source; fall back to
  // reconstructing from request headers (handles SSL-terminating proxies).
  let url: string
  if (process.env.NEXT_PUBLIC_APP_URL) {
    url = `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '')}/api/voice/inbound`
  } else {
    const proto = req.headers.get('x-forwarded-proto') ?? (req.url.startsWith('https') ? 'https' : 'http')
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? ''
    url = `${proto}://${host}/api/voice/inbound`
  }

  // Parse form body into key-value pairs for Twilio validation
  const params: Record<string, string> = {}
  new URLSearchParams(body).forEach((value, key) => { params[key] = value })

  return twilio.validateRequest(authToken, signature, url, params)
}

export async function POST(req: NextRequest) {
  const bodyText = await req.text()

  if (!validateTwilioSignature(req, bodyText)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const formData = new URLSearchParams(bodyText)
  const from = formData.get('From') ?? ''
  const to = formData.get('To') ?? ''
  const callSid = formData.get('CallSid') ?? ''

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
