'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Send, Link2 } from 'lucide-react'

interface Props {
  invoiceId: string
  invoiceNumber: string
  publicToken: string
  status: string
  appUrl: string
}

export function InvoiceActions({
  invoiceId,
  invoiceNumber,
  publicToken,
  status,
  appUrl,
}: Props) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleSend() {
    setSending(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setSending(false)
    }
  }

  async function handleCopyLink() {
    const link = `${appUrl}/pay/${publicToken}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canSend = status !== 'paid' && status !== 'void'

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Download PDF */}
      <a
        href={`/api/invoices/${invoiceId}/pdf`}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
      >
        <Download className="w-4 h-4" />
        Download PDF
      </a>

      {/* Send Invoice */}
      {canSend && (
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex items-center gap-1.5 bg-white hover:bg-gray-50 disabled:opacity-50 border border-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Sending…' : 'Send Invoice'}
        </button>
      )}

      {/* Copy Payment Link */}
      {publicToken && (
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <Link2 className="w-4 h-4" />
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      )}
    </div>
  )
}
