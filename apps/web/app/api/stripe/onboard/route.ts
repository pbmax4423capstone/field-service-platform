import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    if (!userData) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_account_id, stripe_onboarding_complete, name, email')
      .eq('id', userData.organization_id)
      .single()
    if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

    const stripe = getStripe()

    let accountId = org.stripe_account_id

    // If we already have a stored account ID, verify it still exists in Stripe.
    // It can go missing if the account was deleted or the secret key changed
    // (e.g. switching from test→live mode or to a different Stripe account).
    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId)
      } catch (retrieveErr: any) {
        if (retrieveErr?.code === 'account_invalid' || retrieveErr?.raw?.code === 'resource_missing') {
          // Stale ID — clear it so we create a fresh account below
          accountId = null
          await supabase
            .from('organizations')
            .update({ stripe_account_id: null, stripe_onboarding_complete: false })
            .eq('id', userData.organization_id)
        } else {
          throw retrieveErr
        }
      }
    }

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: org.email || undefined,
        business_profile: {
          name: org.name,
          mcc: '7699', // Repair services
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      accountId = account.id

      await supabase
        .from('organizations')
        .update({ stripe_account_id: accountId })
        .eq('id', userData.organization_id)
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/settings?stripe=refresh`,
      return_url: `${APP_URL}/settings?stripe=success`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: any) {
    console.error('[stripe/onboard]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
