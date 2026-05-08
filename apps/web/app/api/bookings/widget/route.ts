import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/notifications'

const BRAND_BLUE = '#2563EB'

const widgetBookingSchema = z.object({
  orgSlug: z.string().min(1),
  serviceType: z.string().min(1),
  urgency: z.enum(['emergency', 'soon', 'flexible']),
  preferredDate: z.string().optional().nullable(),
  preferredTimeOfDay: z.enum(['morning', 'afternoon', 'evening', 'flexible']).optional().nullable(),
  name: z.string().min(1),
  phone: z.string().min(7),
  email: z.string().email().optional().nullable(),
  address: z.string().min(5),
  notes: z.string().optional().nullable(),
})

export async function POST(req: NextRequest) {
  // Allow cross-origin requests from embedded widgets
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers })
  }

  const parsed = widgetBookingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400, headers })
  }

  const {
    orgSlug,
    serviceType,
    urgency,
    preferredDate,
    preferredTimeOfDay,
    name,
    phone,
    email,
    address,
    notes,
  } = parsed.data

  const supabase = createAdminClient()

  // Resolve org by slug
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, email')
    .eq('slug', orgSlug)
    .single()

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404, headers })
  }

  // Find or create customer by phone
  let customerId: string | null = null
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('organization_id', org.id)
    .eq('phone', phone)
    .maybeSingle()

  if (existingCustomer) {
    customerId = existingCustomer.id
  } else {
    const nameParts = name.trim().split(' ')
    const firstName = nameParts[0] ?? name
    const lastName = nameParts.slice(1).join(' ') || ''
    const { data: newCustomer } = await supabase
      .from('customers')
      .insert({
        organization_id: org.id,
        first_name: firstName,
        last_name: lastName,
        phone,
        email: email ?? null,
      })
      .select('id')
      .single()
    customerId = newCustomer?.id ?? null
  }

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      organization_id: org.id,
      customer_id: customerId,
      service_requested: serviceType,
      urgency,
      preferred_date: preferredDate ?? null,
      preferred_time_of_day: preferredTimeOfDay ?? null,
      customer_name: name,
      customer_phone: phone,
      customer_email: email ?? null,
      address,
      notes: notes ?? null,
      source: 'widget',
      status: 'pending',
    })
    .select('id')
    .single()

  if (bookingError) {
    console.error('[bookings/widget]', bookingError)
    return NextResponse.json({ error: bookingError.message }, { status: 500, headers })
  }

  // Notify contractor via SendGrid if they have an email
  const orgEmail = (org as any).email as string | null
  if (orgEmail) {
    try {
      const urgencyLabel = { emergency: '🚨 Emergency', soon: 'Soon', flexible: 'Flexible' }[urgency]
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
            <span style="color:#fff;font-size:22px;font-weight:700;">DispatchForce AI — New Booking</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 16px;color:#111827;">You have a new booking request!</h2>
            <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;color:#6b7280;width:160px;">Customer</td><td style="padding:8px 0;color:#111827;font-weight:600;">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Phone</td><td style="padding:8px 0;color:#111827;">${phone}</td></tr>
              ${email ? `<tr><td style="padding:8px 0;color:#6b7280;">Email</td><td style="padding:8px 0;color:#111827;">${email}</td></tr>` : ''}
              <tr><td style="padding:8px 0;color:#6b7280;">Service</td><td style="padding:8px 0;color:#111827;">${serviceType}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Urgency</td><td style="padding:8px 0;color:#111827;">${urgencyLabel}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Address</td><td style="padding:8px 0;color:#111827;">${address}</td></tr>
              ${preferredDate ? `<tr><td style="padding:8px 0;color:#6b7280;">Preferred Date</td><td style="padding:8px 0;color:#111827;">${preferredDate}</td></tr>` : ''}
              ${preferredTimeOfDay ? `<tr><td style="padding:8px 0;color:#6b7280;">Preferred Time</td><td style="padding:8px 0;color:#111827;">${preferredTimeOfDay}</td></tr>` : ''}
              ${notes ? `<tr><td style="padding:8px 0;color:#6b7280;">Notes</td><td style="padding:8px 0;color:#111827;">${notes}</td></tr>` : ''}
            </table>
            <p style="margin:24px 0 0;color:#6b7280;font-size:14px;">Log in to your DispatchForce AI dashboard to approve or schedule this booking.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
      `.trim()

      await sendEmail({
        to: orgEmail,
        subject: `New Booking Request — ${name} (${serviceType})`,
        html,
      })
    } catch (err) {
      console.error('[bookings/widget] contractor notification failed:', err)
    }
  }

  return NextResponse.json({ ok: true, bookingId: booking?.id }, { status: 201, headers })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
