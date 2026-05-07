'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface Props {
  isConnected: boolean
  stripeAccountId: string | null
}

export function StripeConnectButton({ isConnected, stripeAccountId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/onboard', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Failed to start Stripe onboarding')
        setLoading(false)
      }
    } catch {
      setError('Network error — please try again')
      setLoading(false)
    }
  }

  if (isConnected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-green-700">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Stripe account connected
          {stripeAccountId && (
            <span className="text-xs text-gray-400 font-mono">({stripeAccountId.slice(0, 12)}…)</span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          You can accept credit card payments from customers. Payment links are included on all invoices.
        </p>
        <button
          onClick={handleConnect}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Re-connect or update Stripe account
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Connect your Stripe account to accept credit card payments directly from customers via invoice payment links.
      </p>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <button
        onClick={handleConnect}
        disabled={loading}
        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting…
          </>
        ) : (
          'Connect with Stripe →'
        )}
      </button>
    </div>
  )
}
