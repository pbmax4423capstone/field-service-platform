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
