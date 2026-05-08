import twilio from 'twilio'
import sgMail from '@sendgrid/mail'
import { createAdminClient } from '@/lib/supabase-server'

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type NotificationEvent =
  | 'appointment_reminder_24h'
  | 'appointment_reminder_2h'
  | 'appointment_confirmed'
  | 'technician_en_route'
  | 'job_completed'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'review_request'
  | 'booking_confirmed'

export interface JobNotificationContext {
  orgId: string
  jobId: string
  event: NotificationEvent
}

export interface NotificationPayload {
  recipientName: string
  recipientPhone?: string | null
  recipientEmail?: string | null
  orgName: string
  jobTitle?: string
  jobAddress?: string
  scheduledAt?: string
  reviewUrl?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// SMS via Twilio
// ──────────────────────────────────────────────────────────────────────────────

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) throw new Error('Twilio credentials not configured')
  return twilio(accountSid, authToken)
}

export async function sendSms(to: string, body: string): Promise<string | null> {
  const from = process.env.TWILIO_PHONE_NUMBER
  if (!from) throw new Error('TWILIO_PHONE_NUMBER not configured')
  const client = getTwilioClient()
  const msg = await client.messages.create({ to, from, body })
  return msg.sid
}

// ──────────────────────────────────────────────────────────────────────────────
// Email via SendGrid
// ──────────────────────────────────────────────────────────────────────────────

const BRAND_BLUE = '#2563EB'

function getFromEmail() {
  return process.env.SENDGRID_FROM_EMAIL || 'noreply@dispatchforceai.com'
}

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<string | null> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) throw new Error('SENDGRID_API_KEY not configured')
  sgMail.setApiKey(apiKey)
  const [response] = await sgMail.send({
    to: opts.to,
    from: getFromEmail(),
    subject: opts.subject,
    html: opts.html,
  })
  return response.headers['x-message-id'] as string | null
}

function buildEmailHtml(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:${BRAND_BLUE};padding:24px 32px;">
            <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">DispatchForce AI</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">${title}</h2>
            <div style="color:#374151;font-size:15px;line-height:1.6;">${body}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">Sent by DispatchForce AI</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`.trim()
}

// ──────────────────────────────────────────────────────────────────────────────
// Expo push notifications
// ──────────────────────────────────────────────────────────────────────────────

export async function sendExpoPush(opts: {
  expoPushToken: string
  title: string
  body: string
  data?: Record<string, unknown>
}): Promise<void> {
  await fetch('https://exp.host/--/push/v2/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to: opts.expoPushToken,
      title: opts.title,
      body: opts.body,
      data: opts.data ?? {},
      sound: 'default',
    }),
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Message builders
// ──────────────────────────────────────────────────────────────────────────────

function buildSmsMessage(event: NotificationEvent, p: NotificationPayload): string {
  switch (event) {
    case 'appointment_reminder_24h':
      return `Hi ${p.recipientName}, reminder: you have a service appointment with ${p.orgName} tomorrow${p.scheduledAt ? ` at ${p.scheduledAt}` : ''}${p.jobAddress ? ` at ${p.jobAddress}` : ''}. Reply STOP to opt out.`
    case 'appointment_reminder_2h':
      return `Hi ${p.recipientName}, your ${p.orgName} technician arrives in ~2 hours${p.jobAddress ? ` at ${p.jobAddress}` : ''}. Reply STOP to opt out.`
    case 'technician_en_route':
      return `Hi ${p.recipientName}, your ${p.orgName} technician is on the way! They should arrive shortly${p.jobAddress ? ` at ${p.jobAddress}` : ''}. Reply STOP to opt out.`
    case 'job_completed':
      return `Hi ${p.recipientName}, your service with ${p.orgName} is complete. Thank you for choosing us!`
    case 'review_request':
      return `Hi ${p.recipientName}, thank you for using ${p.orgName}! We'd love your feedback: ${p.reviewUrl}`
    case 'booking_confirmed':
      return `Hi ${p.recipientName}, your booking with ${p.orgName} has been received. We'll confirm your appointment soon.`
    default:
      return `A notification from ${p.orgName}.`
  }
}

function buildEmailContent(
  event: NotificationEvent,
  p: NotificationPayload,
): { subject: string; html: string } {
  switch (event) {
    case 'appointment_reminder_24h': {
      const subject = `Appointment Reminder — Tomorrow with ${p.orgName}`
      const body = `
        <p>Hi ${p.recipientName},</p>
        <p>This is a friendly reminder that you have a service appointment with <strong>${p.orgName}</strong> scheduled for tomorrow${p.scheduledAt ? ` at <strong>${p.scheduledAt}</strong>` : ''}.</p>
        ${p.jobAddress ? `<p><strong>Location:</strong> ${p.jobAddress}</p>` : ''}
        <p>If you have any questions or need to reschedule, please contact us.</p>
      `
      return { subject, html: buildEmailHtml(subject, body) }
    }
    case 'appointment_reminder_2h': {
      const subject = `Your ${p.orgName} Technician Arrives in 2 Hours`
      const body = `
        <p>Hi ${p.recipientName},</p>
        <p>Your <strong>${p.orgName}</strong> technician will arrive in approximately <strong>2 hours</strong>.</p>
        ${p.jobAddress ? `<p><strong>Service Address:</strong> ${p.jobAddress}</p>` : ''}
      `
      return { subject, html: buildEmailHtml(subject, body) }
    }
    case 'technician_en_route': {
      const subject = `Your Technician is On the Way — ${p.orgName}`
      const body = `
        <p>Hi ${p.recipientName},</p>
        <p>Great news! Your <strong>${p.orgName}</strong> technician is now on their way to you.</p>
        ${p.jobAddress ? `<p><strong>Service Address:</strong> ${p.jobAddress}</p>` : ''}
      `
      return { subject, html: buildEmailHtml(subject, body) }
    }
    case 'job_completed': {
      const subject = `Service Complete — ${p.orgName}`
      const body = `
        <p>Hi ${p.recipientName},</p>
        <p>Your service with <strong>${p.orgName}</strong> has been completed. Thank you for choosing us!</p>
        ${p.jobTitle ? `<p><strong>Service:</strong> ${p.jobTitle}</p>` : ''}
      `
      return { subject, html: buildEmailHtml(subject, body) }
    }
    case 'review_request': {
      const subject = `How Did We Do? Leave Us a Review`
      const body = `
        <p>Hi ${p.recipientName},</p>
        <p>Thank you for trusting <strong>${p.orgName}</strong> with your service needs.</p>
        <p>We'd love to hear about your experience. It only takes a minute!</p>
        ${
          p.reviewUrl
            ? `<p style="text-align:center;margin:24px 0;">
            <a href="${p.reviewUrl}" style="background:${BRAND_BLUE};color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;display:inline-block;">Leave a Review</a>
          </p>`
            : ''
        }
      `
      return { subject, html: buildEmailHtml(subject, body) }
    }
    case 'booking_confirmed': {
      const subject = `Booking Received — ${p.orgName}`
      const body = `
        <p>Hi ${p.recipientName},</p>
        <p>Your booking request with <strong>${p.orgName}</strong> has been received!</p>
        <p>A team member will contact you shortly to confirm your appointment.</p>
      `
      return { subject, html: buildEmailHtml(subject, body) }
    }
    default: {
      const subject = `Notification from ${p.orgName}`
      return { subject, html: buildEmailHtml(subject, `<p>A notification from ${p.orgName}.</p>`) }
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Core dispatch — checks preferences, fires channels, logs result
// ──────────────────────────────────────────────────────────────────────────────

export async function dispatchJobNotification(ctx: JobNotificationContext): Promise<void> {
  const supabase = createAdminClient()

  // Load notification preference for this org + event
  const { data: pref } = await supabase
    .from('notification_preferences')
    .select('is_enabled, channel')
    .eq('organization_id', ctx.orgId)
    .eq('event', ctx.event)
    .single()

  if (!pref?.is_enabled) return

  // Load job + customer + org
  const { data: job } = await supabase
    .from('jobs')
    .select(
      `id, title, description, scheduled_start,
       organizations!inner(id, name, google_review_url),
       customers!inner(id, first_name, last_name, phone, email),
       customer_addresses(street, city, state, zip)`,
    )
    .eq('id', ctx.jobId)
    .single()

  if (!job) {
    console.error(`[notifications] job ${ctx.jobId} not found`)
    return
  }

  const org = (job as any).organizations as { id: string; name: string; google_review_url: string | null }
  const customer = (job as any).customers as {
    id: string
    first_name: string
    last_name: string
    phone: string
    email: string | null
  }
  const addresses = (job as any).customer_addresses as Array<{
    street: string
    city: string
    state: string
    zip: string
  }>

  const address =
    addresses?.[0]
      ? `${addresses[0].street}, ${addresses[0].city}, ${addresses[0].state} ${addresses[0].zip}`
      : undefined

  const scheduledAt = (job as any).scheduled_start
    ? new Date((job as any).scheduled_start).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : undefined

  const payload: NotificationPayload = {
    recipientName: `${customer.first_name} ${customer.last_name}`.trim(),
    recipientPhone: customer.phone,
    recipientEmail: customer.email,
    orgName: org.name,
    jobTitle: (job as any).title,
    jobAddress: address,
    scheduledAt,
    reviewUrl: org.google_review_url ?? undefined,
  }

  const channels: Array<'sms' | 'email'> =
    pref.channel === 'both'
      ? ['sms', 'email']
      : pref.channel === 'sms'
        ? ['sms']
        : ['email']

  for (const channel of channels) {
    let providerId: string | null = null
    let errorMessage: string | undefined

    try {
      if (channel === 'sms' && customer.phone) {
        const text = buildSmsMessage(ctx.event, payload)
        providerId = await sendSms(customer.phone, text)
        await logNotification({
          orgId: ctx.orgId,
          customerId: customer.id,
          jobId: ctx.jobId,
          event: ctx.event,
          channel: 'sms',
          recipient: customer.phone,
          message: text,
          status: 'sent',
          providerId,
        })
      } else if (channel === 'email' && customer.email) {
        const { subject, html } = buildEmailContent(ctx.event, payload)
        providerId = await sendEmail({ to: customer.email, subject, html })
        await logNotification({
          orgId: ctx.orgId,
          customerId: customer.id,
          jobId: ctx.jobId,
          event: ctx.event,
          channel: 'email',
          recipient: customer.email,
          message: subject,
          status: 'sent',
          providerId,
        })
      }
    } catch (err: any) {
      console.error(`[notifications] ${channel} send failed:`, err)
      errorMessage = err.message
      await logNotification({
        orgId: ctx.orgId,
        customerId: customer.id,
        jobId: ctx.jobId,
        event: ctx.event,
        channel,
        recipient: channel === 'sms' ? customer.phone : (customer.email ?? ''),
        message: '',
        status: 'failed',
        errorMessage,
      })
    }
  }

  // Push notification to assigned technician for dispatched/en-route events
  if (ctx.event === 'technician_en_route') {
    await sendTechPushForJob(ctx.jobId, {
      title: 'Job Update',
      body: `You are marked en route for: ${(job as any).title}`,
      jobId: ctx.jobId,
    })
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Push to assigned technician
// ──────────────────────────────────────────────────────────────────────────────

export async function sendTechPushForJob(
  jobId: string,
  opts: { title: string; body: string; jobId: string },
): Promise<void> {
  const supabase = createAdminClient()

  const { data: job } = await supabase
    .from('jobs')
    .select('assigned_technician_id')
    .eq('id', jobId)
    .single()

  if (!job?.assigned_technician_id) return

  const { data: user } = await supabase
    .from('users')
    .select('expo_push_token')
    .eq('id', job.assigned_technician_id)
    .single()

  if (!user?.expo_push_token) return

  try {
    await sendExpoPush({
      expoPushToken: user.expo_push_token,
      title: opts.title,
      body: opts.body,
      data: { jobId: opts.jobId },
    })
  } catch (err) {
    console.error('[notifications] expo push failed:', err)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Logging helper
// ──────────────────────────────────────────────────────────────────────────────

async function logNotification(opts: {
  orgId: string
  customerId: string
  jobId: string
  event: NotificationEvent
  channel: 'sms' | 'email'
  recipient: string
  message: string
  status: 'sent' | 'delivered' | 'failed' | 'bounced'
  providerId?: string | null
  errorMessage?: string
}): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('notification_logs').insert({
    organization_id: opts.orgId,
    customer_id: opts.customerId,
    job_id: opts.jobId,
    event: opts.event,
    channel: opts.channel,
    recipient: opts.recipient,
    message: opts.message,
    status: opts.status,
    provider_message_id: opts.providerId ?? null,
    error_message: opts.errorMessage ?? null,
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Review request
// ──────────────────────────────────────────────────────────────────────────────

export async function sendReviewRequest(jobId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: job } = await supabase
    .from('jobs')
    .select(
      `id, title,
       organizations!inner(id, name, google_review_url),
       customers!inner(id, first_name, last_name, phone, email)`,
    )
    .eq('id', jobId)
    .single()

  if (!job) throw new Error(`Job ${jobId} not found`)

  const org = (job as any).organizations as { id: string; name: string; google_review_url: string | null }
  const customer = (job as any).customers as {
    id: string
    first_name: string
    last_name: string
    phone: string
    email: string | null
  }

  if (!org.google_review_url) {
    console.warn(`[review-request] org ${org.id} has no google_review_url — skipping`)
    return
  }

  // Check preference
  const { data: pref } = await supabase
    .from('notification_preferences')
    .select('is_enabled, channel')
    .eq('organization_id', org.id)
    .eq('event', 'review_request')
    .single()

  if (!pref?.is_enabled) return

  const payload: NotificationPayload = {
    recipientName: `${customer.first_name} ${customer.last_name}`.trim(),
    recipientPhone: customer.phone,
    recipientEmail: customer.email,
    orgName: org.name,
    reviewUrl: org.google_review_url,
  }

  const channels: Array<'sms' | 'email'> =
    pref.channel === 'both' ? ['sms', 'email'] : pref.channel === 'sms' ? ['sms'] : ['email']

  for (const channel of channels) {
    try {
      if (channel === 'sms' && customer.phone) {
        const text = buildSmsMessage('review_request', payload)
        const sid = await sendSms(customer.phone, text)
        await supabase.from('review_requests').insert({
          organization_id: org.id,
          customer_id: customer.id,
          job_id: jobId,
          sent_at: new Date().toISOString(),
          channel: 'sms',
          review_url: org.google_review_url,
        })
        await logNotification({
          orgId: org.id,
          customerId: customer.id,
          jobId,
          event: 'review_request',
          channel: 'sms',
          recipient: customer.phone,
          message: text,
          status: 'sent',
          providerId: sid,
        })
      } else if (channel === 'email' && customer.email) {
        const { subject, html } = buildEmailContent('review_request', payload)
        const msgId = await sendEmail({ to: customer.email, subject, html })
        await supabase.from('review_requests').insert({
          organization_id: org.id,
          customer_id: customer.id,
          job_id: jobId,
          sent_at: new Date().toISOString(),
          channel: 'email',
          review_url: org.google_review_url,
        })
        await logNotification({
          orgId: org.id,
          customerId: customer.id,
          jobId,
          event: 'review_request',
          channel: 'email',
          recipient: customer.email,
          message: subject,
          status: 'sent',
          providerId: msgId,
        })
      }
    } catch (err: any) {
      console.error(`[review-request] ${channel} failed:`, err)
    }
  }
}
