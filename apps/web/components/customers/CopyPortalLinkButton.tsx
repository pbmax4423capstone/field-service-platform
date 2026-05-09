'use client'

import { useState } from 'react'
import { Link2, Check, Loader2 } from 'lucide-react'

export function CopyPortalLinkButton({ customerId }: { customerId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle')

  const handleClick = async () => {
    setState('loading')
    try {
      const res = await fetch('/api/portal/generate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Failed')
      await navigator.clipboard.writeText(data.url)
      setState('copied')
      setTimeout(() => setState('idle'), 2500)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 2500)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors disabled:opacity-60"
    >
      {state === 'loading' ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : state === 'copied' ? (
        <Check className="w-3.5 h-3.5 text-green-600" />
      ) : (
        <Link2 className="w-3.5 h-3.5" />
      )}
      {state === 'copied' ? 'Link copied!' : state === 'error' ? 'Failed — retry' : 'Copy Portal Link'}
    </button>
  )
}
