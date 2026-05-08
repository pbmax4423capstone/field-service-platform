import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  const stripe = getStripe()

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('[stripe/webhook] Invalid signature:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent
        const invoiceId = intent.metadata?.invoice_id
        if (!invoiceId) break

        const amount = intent.amount_received / 100

        // Record payment
        await supabase.from('payments').insert({
          invoice_id: invoiceId,
          organization_id: intent.metadata?.organization_id ?? '',
          amount,
          method: 'credit_card' as const,
          status: 'succeeded' as const,
          stripe_payment_intent_id: intent.id,
          stripe_charge_id: typeof intent.latest_charge === 'string' ? intent.latest_charge : null,
        })

        // Fetch invoice to update amounts
        const { data: invoice } = await supabase
          .from('invoices')
          .select('total, amount_paid')
          .eq('id', invoiceId)
          .single()

        if (invoice) {
          const newAmountPaid = (invoice.amount_paid ?? 0) + amount
          const isPaid = newAmountPaid >= invoice.total - 0.01

          await supabase
            .from('invoices')
            .update({
              amount_paid: newAmountPaid,
              status: isPaid ? 'paid' : 'sent',
              paid_at: isPaid ? new Date().toISOString() : null,
            })
            .eq('id', invoiceId)
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        if (account.details_submitted && account.charges_enabled) {
          await supabase
            .from('organizations')
            .update({ stripe_onboarding_complete: true })
            .eq('stripe_account_id', account.id)
        }
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[stripe/webhook] Handler error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
