// @ts-nocheck — Phase 7 (Voice Agent); Deepgram SDK types not yet resolved in monorepo
/**
 * Voice stream WebSocket handler — processes Twilio Media Streams.
 *
 * Flow per call:
 *  1. Twilio sends audio chunks (base64 µ-law 8 kHz) as "media" events.
 *  2. We forward each chunk to Deepgram's live STT connection.
 *  3. On a final Deepgram transcript, we run the utterance through Claude
 *     (with org context) to decide: answer question or create booking.
 *  4. Claude's text reply is synthesised to µ-law 8 kHz audio via Deepgram TTS.
 *  5. The audio bytes are sent back to Twilio as a "media" WebSocket event so
 *     the caller hears the response.
 *  6. On call end we persist the full transcript and outcome to voice_calls.
 */

import { IncomingMessage } from 'http'
import WebSocket from 'ws'
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'
import Anthropic from '@anthropic-ai/sdk'
import sgMail from '@sendgrid/mail'
import { createAdminClient } from './admin-supabase'

const BRAND_BLUE = '#2563EB'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDeepgram() {
  const key = process.env.DEEPGRAM_API_KEY
  if (!key) throw new Error('DEEPGRAM_API_KEY not configured')
  return createClient(key)
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Org context (same shape as chat route) ──────────────────────────────────

async function fetchOrgContext(orgId: string): Promise<string> {
  const admin = createAdminClient()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const lastWeekStr = new Date(today.getTime() - 7 * 86400000).toISOString().split('T')[0]

  const [jobsResult, invoicesResult, customersResult, orgResult] = await Promise.all([
    admin
      .from('jobs')
      .select('id, title, status, scheduled_start, customers(first_name, last_name)')
      .eq('organization_id', orgId)
      .gte('scheduled_start', lastWeekStr)
      .order('scheduled_start', { ascending: false })
      .limit(30),
    admin
      .from('invoices')
      .select('id, invoice_number, status, total, balance_due, due_date')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('customers')
      .select('id, first_name, last_name, phone')
      .eq('organization_id', orgId)
      .limit(50),
    admin.from('organizations').select('name, phone, email').eq('id', orgId).single(),
  ])

  const jobs = jobsResult.data ?? []
  const invoices = invoicesResult.data ?? []
  const customers = customersResult.data ?? []
  const org = orgResult.data

  const todayJobs = jobs.filter((j) => j.scheduled_start?.startsWith(todayStr))
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue')

  return `
You are a friendly AI receptionist for ${org?.name ?? 'this HVAC business'}, answering an inbound phone call.
Your goal: either answer the caller's question using the business data below, or collect information to create a service booking.

TODAY: ${todayStr}
BUSINESS PHONE: ${org?.phone ?? 'N/A'}

TODAY'S JOBS (${todayJobs.length}):
${todayJobs.length === 0 ? 'None.' : todayJobs.map((j) => `- "${j.title}" Status: ${j.status}`).join('\n')}

OVERDUE INVOICES: ${overdueInvoices.length}
TOTAL CUSTOMERS: ${customers.length}

INSTRUCTIONS:
- Keep replies SHORT (1-3 sentences max) — this is a phone call.
- If the caller wants to schedule/book a service, extract: their name, the service needed, preferred date/time, and urgency. Confirm by repeating back the details.
- When you have enough booking info, respond with a JSON block on its own line like: BOOKING:{"name":"...","serviceType":"...","preferredDate":"...","urgency":"emergency|soon|flexible","summary":"..."}
- For general questions, answer concisely from the business data above.
- If you don't know something, say you'll pass the message to the team.
`.trim()
}

// ─── TTS via Deepgram ─────────────────────────────────────────────────────────

async function synthesiseSpeech(text: string): Promise<Buffer> {
  const dg = getDeepgram()
  const response = await dg.speak.request(
    { text },
    {
      model: 'aura-asteria-en',
      encoding: 'mulaw',
      sample_rate: 8000,
      container: 'none',
    } as Parameters<typeof dg.speak.request>[1],
  )
  const stream = await response.getStream()
  if (!stream) throw new Error('Deepgram TTS: no audio stream returned')

  const chunks: Uint8Array[] = []
  const reader = stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks)
}

// ─── Booking notification email ───────────────────────────────────────────────

async function notifyBookingByEmail(
  orgEmail: string,
  orgName: string,
  callerNumber: string,
  booking: BookingIntent,
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) return
  sgMail.setApiKey(apiKey)

  const from = process.env.SENDGRID_FROM_EMAIL || 'noreply@dispatchforceai.com'
  const urgencyLabel = { emergency: '🚨 Emergency', soon: 'Soon', flexible: 'Flexible' }[booking.urgency] ?? booking.urgency

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:${BRAND_BLUE};padding:24px 32px;">
            <span style="color:#fff;font-size:22px;font-weight:700;">DispatchForce AI — New Voice Booking</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#111827;">📞 New booking from a phone call</h2>
            <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#6b7280;width:160px;">Customer</td><td style="padding:8px 0;color:#111827;font-weight:600;">${booking.name}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Phone</td><td style="padding:8px 0;color:#111827;">${callerNumber}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Service</td><td style="padding:8px 0;color:#111827;">${booking.serviceType}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Urgency</td><td style="padding:8px 0;color:#111827;">${urgencyLabel}</td></tr>
              ${booking.preferredDate ? `<tr><td style="padding:8px 0;color:#6b7280;">Preferred Date</td><td style="padding:8px 0;color:#111827;">${booking.preferredDate}</td></tr>` : ''}
              <tr><td style="padding:8px 0;color:#6b7280;">Summary</td><td style="padding:8px 0;color:#111827;">${booking.summary}</td></tr>
            </table>
            <p style="margin:24px 0 0;color:#6b7280;font-size:14px;">Log in to your DispatchForce AI dashboard to approve or schedule this booking.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()

  await sgMail.send({
    to: orgEmail,
    from,
    subject: `📞 Voice Booking — ${booking.name} (${booking.serviceType})`,
    html,
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingIntent {
  name: string
  serviceType: string
  preferredDate?: string
  urgency: 'emergency' | 'soon' | 'flexible'
  summary: string
}

interface CallState {
  callSid: string
  streamSid: string
  callerNumber: string
  toNumber: string
  orgId: string | null
  orgEmail: string | null
  orgName: string
  voiceCallId: string | null
  systemPrompt: string | null
  conversationHistory: Anthropic.MessageParam[]
  fullTranscript: string
  outcome: 'answered' | 'booked' | 'missed' | 'error'
  isSpeaking: boolean
  pendingUtterance: string
  processingLock: boolean
}

// ─── Main WebSocket handler ───────────────────────────────────────────────────

export async function handleVoiceStream(ws: WebSocket, req: IncomingMessage): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`)
  const callerParam = url.searchParams.get('callerNumber') ?? ''
  const toParam = url.searchParams.get('toNumber') ?? ''

  const state: CallState = {
    callSid: '',
    streamSid: '',
    callerNumber: callerParam,
    toNumber: toParam,
    orgId: null,
    orgEmail: null,
    orgName: 'DispatchForce AI',
    voiceCallId: null,
    systemPrompt: null,
    conversationHistory: [],
    fullTranscript: '',
    outcome: 'missed',
    isSpeaking: false,
    pendingUtterance: '',
    processingLock: false,
  }

  // ── Deepgram live STT connection ─────────────────────────────────────────

  const dg = getDeepgram()
  const dgConn = dg.listen.live({
    model: 'nova-2',
    encoding: 'mulaw',
    sample_rate: 8000,
    punctuate: true,
    interim_results: false,
    endpointing: 400,
  })

  dgConn.on(LiveTranscriptionEvents.Open, () => {
    console.log('[voice] Deepgram STT connection open')
  })

  dgConn.on(LiveTranscriptionEvents.Transcript, (data) => {
    const alt = data.channel?.alternatives?.[0]
    const transcript = alt?.transcript?.trim()
    if (!transcript) return
    if (!data.is_final) return

    state.fullTranscript += (state.fullTranscript ? ' ' : '') + transcript
    state.pendingUtterance += (state.pendingUtterance ? ' ' : '') + transcript

    // Debounce — process after a short pause so Deepgram can combine sentences
    setTimeout(() => {
      const utterance = state.pendingUtterance.trim()
      state.pendingUtterance = ''
      if (utterance && !state.processingLock) {
        processUtterance(utterance).catch((err) =>
          console.error('[voice] processUtterance error:', err),
        )
      }
    }, 600)
  })

  dgConn.on(LiveTranscriptionEvents.Error, (err) => {
    console.error('[voice] Deepgram error:', err)
  })

  // ── Core: run utterance through Claude, TTS, send back ───────────────────

  async function processUtterance(utterance: string): Promise<void> {
    if (!state.orgId || !state.systemPrompt || state.processingLock) return
    state.processingLock = true
    state.isSpeaking = true

    try {
      state.conversationHistory.push({ role: 'user', content: utterance })

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        system: state.systemPrompt,
        messages: state.conversationHistory,
      })

      const replyBlock = response.content.find((b) => b.type === 'text')
      const replyText = replyBlock?.type === 'text' ? replyBlock.text.trim() : ''
      if (!replyText) return

      state.conversationHistory.push({ role: 'assistant', content: replyText })
      state.outcome = 'answered'

      // Check for booking intent signal in Claude's reply
      const bookingMatch = replyText.match(/BOOKING:(\{.*?\})/s)
      if (bookingMatch) {
        try {
          const intent = JSON.parse(bookingMatch[1]) as BookingIntent
          await createVoiceBooking(intent)
          state.outcome = 'booked'
        } catch (err) {
          console.error('[voice] booking parse error:', err)
        }
      }

      // Strip the JSON signal before speaking the confirmation aloud
      const spokenText = replyText.replace(/BOOKING:\{.*?\}/gs, '').trim()
      if (!spokenText) return

      // Synthesise and send
      const audioBuffer = await synthesiseSpeech(spokenText)
      sendAudioToTwilio(audioBuffer)
    } catch (err) {
      console.error('[voice] processUtterance:', err)
      state.outcome = 'error'
    } finally {
      state.processingLock = false
      state.isSpeaking = false
    }
  }

  // ── Create booking in DB ─────────────────────────────────────────────────

  async function createVoiceBooking(intent: BookingIntent): Promise<void> {
    if (!state.orgId) return
    const admin = createAdminClient()

    // Find or create customer by phone
    const { data: existing } = await admin
      .from('customers')
      .select('id')
      .eq('organization_id', state.orgId)
      .eq('phone', state.callerNumber)
      .maybeSingle()

    let customerId: string | null = existing?.id ?? null

    if (!customerId) {
      const parts = intent.name.trim().split(' ')
      const { data: newCust } = await admin
        .from('customers')
        .insert({
          organization_id: state.orgId,
          first_name: parts[0] ?? intent.name,
          last_name: parts.slice(1).join(' ') || '',
          phone: state.callerNumber,
        })
        .select('id')
        .single()
      customerId = newCust?.id ?? null
    }

    const { data: booking } = await admin
      .from('bookings')
      .insert({
        organization_id: state.orgId,
        customer_id: customerId,
        service_requested: intent.serviceType,
        urgency: intent.urgency,
        preferred_date: intent.preferredDate ?? null,
        customer_name: intent.name,
        customer_phone: state.callerNumber,
        notes: intent.summary,
        source: 'voice',
        status: 'pending',
      })
      .select('id')
      .single()

    // Link booking to voice_call record
    if (booking?.id && state.voiceCallId) {
      await admin
        .from('voice_calls')
        .update({ booking_id: booking.id })
        .eq('id', state.voiceCallId)
    }

    // Email contractor
    if (state.orgEmail) {
      await notifyBookingByEmail(state.orgEmail, state.orgName, state.callerNumber, intent).catch(
        (err) => console.error('[voice] email notification error:', err),
      )
    }
  }

  // ── Send audio chunk to Twilio caller ─────────────────────────────────────

  function sendAudioToTwilio(audioBuffer: Buffer): void {
    if (ws.readyState !== WebSocket.OPEN || !state.streamSid) return

    // Optionally clear any buffered audio first
    ws.send(JSON.stringify({ event: 'clear', streamSid: state.streamSid }))

    // Twilio expects chunks ≤ ~60 kB; split if needed
    const chunkSize = 32000
    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
      const chunk = audioBuffer.slice(i, i + chunkSize)
      ws.send(
        JSON.stringify({
          event: 'media',
          streamSid: state.streamSid,
          media: { payload: chunk.toString('base64') },
        }),
      )
    }
  }

  // ── Finalise call record ─────────────────────────────────────────────────

  async function finalizeCall(): Promise<void> {
    if (!state.voiceCallId) return
    const admin = createAdminClient()
    await admin
      .from('voice_calls')
      .update({
        outcome: state.outcome,
        transcript: state.fullTranscript || null,
      })
      .eq('id', state.voiceCallId)
  }

  // ── Twilio WebSocket message handler ────────────────────────────────────

  ws.on('message', async (rawData: Buffer | string) => {
    let msg: Record<string, unknown>
    try {
      msg = JSON.parse(rawData.toString())
    } catch {
      return
    }

    switch (msg.event) {
      case 'connected':
        console.log('[voice] Twilio stream connected')
        break

      case 'start': {
        const startData = msg.start as Record<string, unknown>
        state.callSid = (startData.callSid as string) ?? ''
        state.streamSid = (msg.streamSid as string) ?? ''

        // Custom parameters passed from TwiML <Parameter> elements
        const params = (startData.customParameters as Record<string, string>) ?? {}
        if (params.callerNumber) state.callerNumber = params.callerNumber
        if (params.toNumber) state.toNumber = params.toNumber

        console.log(`[voice] Call started sid=${state.callSid} from=${state.callerNumber ? `+***${state.callerNumber.slice(-4)}` : '(no caller ID)'}`)

        // Resolve org by Twilio "To" number
        const admin = createAdminClient()
        const { data: org } = await admin
          .from('organizations')
          .select('id, name, email, ai_voice_enabled')
          .eq('phone', state.toNumber)
          .maybeSingle()

        if (!org) {
          console.warn(`[voice] No org found for number ${state.toNumber}`)
          ws.close()
          return
        }
        if (!org.ai_voice_enabled) {
          console.log(`[voice] Voice agent disabled for org ${org.id}`)
          ws.close()
          return
        }

        state.orgId = org.id
        state.orgName = org.name ?? 'DispatchForce AI'
        state.orgEmail = org.email ?? null

        // Record the call
        const { data: callRecord } = await admin
          .from('voice_calls')
          .insert({
            organization_id: state.orgId,
            twilio_call_sid: state.callSid,
            caller_number: state.callerNumber,
            outcome: 'missed',
          })
          .select('id')
          .single()
        state.voiceCallId = callRecord?.id ?? null

        // Load system prompt
        state.systemPrompt = await fetchOrgContext(state.orgId)

        // Greet the caller
        const greeting = `Hello! Thank you for calling ${state.orgName}. I'm an AI assistant. How can I help you today?`
        const audioBuffer = await synthesiseSpeech(greeting).catch(() => null)
        if (audioBuffer) sendAudioToTwilio(audioBuffer)
        break
      }

      case 'media': {
        const media = msg.media as Record<string, string>
        const chunk = Buffer.from(media.payload, 'base64')
        if (dgConn.getReadyState() === 1 /* OPEN */) {
          dgConn.send(chunk)
        }
        break
      }

      case 'stop':
        console.log(`[voice] Call ended sid=${state.callSid}`)
        try {
          dgConn.finish()
        } catch {}
        await finalizeCall()
        break
    }
  })

  ws.on('close', async () => {
    console.log(`[voice] WebSocket closed sid=${state.callSid}`)
    try {
      dgConn.finish()
    } catch {}
    await finalizeCall()
  })

  ws.on('error', (err) => {
    console.error('[voice] WebSocket error:', err)
  })
}
