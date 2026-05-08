'use client'

import { useState } from 'react'

interface Props {
  aiChatEnabled: boolean
  aiVoiceEnabled: boolean
}

export function AIFeaturesToggle({ aiChatEnabled, aiVoiceEnabled }: Props) {
  const [chatEnabled, setChatEnabled] = useState(aiChatEnabled)
  const [voiceEnabled, setVoiceEnabled] = useState(aiVoiceEnabled)
  const [saving, setSaving] = useState(false)

  async function toggle(field: 'ai_chat_enabled' | 'ai_voice_enabled', value: boolean) {
    setSaving(true)
    if (field === 'ai_chat_enabled') setChatEnabled(value)
    else setVoiceEnabled(value)

    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
        <div>
          <p className="text-sm font-medium text-gray-900">AI Chat Agent</p>
          <p className="text-xs text-gray-500">Chat widget on your website that books appointments</p>
        </div>
        <button
          role="switch"
          aria-checked={chatEnabled}
          disabled={saving}
          onClick={() => toggle('ai_chat_enabled', !chatEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-60 ${chatEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${chatEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}
          />
        </button>
      </div>

      <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
        <div>
          <p className="text-sm font-medium text-gray-900">AI Voice Agent</p>
          <p className="text-xs text-gray-500">Answers phone calls and books appointments 24/7</p>
        </div>
        <button
          role="switch"
          aria-checked={voiceEnabled}
          disabled={saving}
          onClick={() => toggle('ai_voice_enabled', !voiceEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-60 ${voiceEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${voiceEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}
          />
        </button>
      </div>
    </div>
  )
}
