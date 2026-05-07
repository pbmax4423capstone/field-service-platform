import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

export function getStripe(): Stripe {
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: '2026-04-22.dahlia',
  })
}

export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
