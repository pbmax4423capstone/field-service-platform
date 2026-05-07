'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface Props {
  text: string
  label?: string
}

export function CopyButton({ text, label }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <p
        className="text-xs text-gray-600 font-mono truncate max-w-[140px]"
        title={text}
      >
        {label ?? text}
      </p>
      <button
        onClick={handleCopy}
        title="Copy to clipboard"
        className="shrink-0 p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  )
}
