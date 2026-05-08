'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  estimateId: string
  status: string
}

export function EstimateActions({ estimateId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function markAsSent() {
    setLoading(true)
    try {
      const res = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function convertToInvoice() {
    setLoading(true)
    try {
      const res = await fetch(`/api/estimates/${estimateId}/convert`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/invoices/${data.invoice.id}`)
      }
    } finally {
      setLoading(false)
    }
  }

  async function deleteEstimate() {
    if (!confirm('Delete this estimate? This cannot be undone.')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/estimates/${estimateId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.push('/estimates')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'draft' && (
        <>
          <button
            onClick={markAsSent}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Updating…' : 'Mark as Sent'}
          </button>
          <button
            onClick={deleteEstimate}
            disabled={loading}
            className="flex items-center gap-2 bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 border border-red-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </>
      )}

      {(status === 'draft' || status === 'sent' || status === 'accepted') && (
        <button
          onClick={convertToInvoice}
          disabled={loading}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Converting…' : 'Convert to Invoice'}
        </button>
      )}
    </div>
  )
}
