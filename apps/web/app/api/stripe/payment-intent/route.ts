import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const supabase = createAdminClient()

    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, organizations(stripe_account_id, stripe_onboarding_complete)')
      .eq('public_token', token)
      .single()

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    if (invoice.status === 'paid') return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 })

    const org = invoice.organizations as any
    if (!org?.stripe_account_id || !org?.stripe_onboarding_complete) {
      return NextResponse.json({ error: 'Contractor has not set up payments' }, { status: 400 })
    }

    const stripe = getStripe()
    const amountCents = Math.round(invoice.balance_due * 100)

    if (amountCents < 50) {
      return NextResponse.json({ error: 'Amount too small' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      payment_method_types: ['card'],
      application_fee_amount: Math.round(amountCents * 0.029 + 30), // 2.9% + $0.30 platform fee
      transfer_data: {
        destination: org.stripe_account_id,
      },
      metadata: {
        invoice_id: invoice.id,
        organization_id: invoice.organization_id,
        invoice_number: invoice.invoice_number,
      },
    })

    // Mark invoice as viewed if not already
    if (invoice.status === 'sent') {
      await supabase
        .from('invoices')
        .update({ status: 'viewed', viewed_at: new Date().toISOString() })
        .eq('id', invoice.id)
    }

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err: any) {
    console.error('[stripe/payment-intent]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
