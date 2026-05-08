'use client'

import { useState, useTransition } from 'react'
import { X, Twitter, Facebook, Instagram, Linkedin, Send } from 'lucide-react'

type Platform = 'twitter' | 'facebook' | 'instagram' | 'linkedin'

interface NewPostModalProps {
  onClose: () => void
  onCreated: () => void
}

const PLATFORM_OPTIONS: { value: Platform; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'twitter', label: 'Twitter / X', icon: Twitter, color: 'text-sky-500' },
  { value: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600' },
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
]

const MAX_CHARS = 280

export function NewPostModal({ onClose, onCreated }: NewPostModalProps) {
  const [platform, setPlatform] = useState<Platform>('twitter')
  const [content, setContent] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const remaining = MAX_CHARS - content.length
  const isOverLimit = remaining < 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) {
      setError('Post content is required.')
      return
    }
    if (isOverLimit) {
      setError(`Post is ${Math.abs(remaining)} characters over the limit.`)
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        const res = await fetch('/api/social/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform,
            content: content.trim(),
            scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }
        onCreated()
        onClose()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create post.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">New Social Post</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Platform */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORM_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPlatform(value)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    platform === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${platform === value ? 'text-blue-600' : color}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="What's happening at your business?"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <div className={`text-right text-xs mt-1 ${isOverLimit ? 'text-red-500 font-semibold' : remaining <= 20 ? 'text-amber-500' : 'text-gray-400'}`}>
              {remaining} remaining
            </div>
          </div>

          {/* Scheduled For */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule for{' '}
              <span className="text-gray-400 font-normal">(leave blank to publish now)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || isOverLimit || !content.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            {isPending ? 'Posting…' : scheduledFor ? 'Schedule Post' : 'Publish Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
