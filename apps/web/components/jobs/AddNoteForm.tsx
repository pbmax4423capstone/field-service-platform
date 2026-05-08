'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AddNoteFormProps {
  jobId: string
}

export function AddNoteForm({ jobId }: AddNoteFormProps) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/jobs/${jobId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to add note')
      } else {
        setContent('')
        router.refresh()
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Add a note..."
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !content.trim()}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
        >
          {saving ? 'Adding...' : 'Add Note'}
        </button>
      </div>
    </form>
  )
}
