'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Plus, MessageSquare, Bot, User, Loader2, Wrench } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
}

interface StoredConversation {
  id: string
  title: string
  preview: string
  createdAt: string
}

const STORAGE_KEY = 'fieldpro_chat_conversations'

function loadStoredConversations(): StoredConversation[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveStoredConversation(conv: StoredConversation) {
  const existing = loadStoredConversations().filter((c) => c.id !== conv.id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify([conv, ...existing].slice(0, 50)))
}

export function ChatInterface() {
  const [conversations, setConversations] = useState<StoredConversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [toolCallName, setToolCallName] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setConversations(loadStoredConversations())
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages])

  const startNewChat = useCallback(() => {
    setActiveConversation(null)
    setInput('')
    setToolCallName(null)
  }, [])

  const loadConversation = useCallback(async (stored: StoredConversation) => {
    // We keep messages in memory for active session; on reload just show empty with the id
    setActiveConversation({
      id: stored.id,
      title: stored.title,
      messages: [],
    })
    setInput('')
    setToolCallName(null)
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setIsLoading(true)
    setToolCallName(null)

    const userMessage: Message = { role: 'user', content: text }

    if (!activeConversation) {
      // New conversation — optimistic
      setActiveConversation({
        id: '',
        title: text.slice(0, 40),
        messages: [userMessage],
      })
    } else {
      setActiveConversation((prev) =>
        prev ? { ...prev, messages: [...prev.messages, userMessage] } : null,
      )
    }

    // Add placeholder assistant message for streaming
    const assistantPlaceholder: Message = { role: 'assistant', content: '', isStreaming: true }
    setActiveConversation((prev) =>
      prev ? { ...prev, messages: [...prev.messages, assistantPlaceholder] } : null,
    )

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConversation?.id || undefined,
          message: text,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Request failed')
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let convId = activeConversation?.id ?? ''
      let convTitle = text.slice(0, 40)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = line.slice(6).trim()
          if (!json) continue

          try {
            const event = JSON.parse(json)

            if (event.type === 'conversation_id') {
              convId = event.id
              setActiveConversation((prev) =>
                prev ? { ...prev, id: convId, title: convTitle } : null,
              )
            } else if (event.type === 'token') {
              setActiveConversation((prev) => {
                if (!prev) return null
                const msgs = [...prev.messages]
                const last = msgs[msgs.length - 1]
                if (last.role === 'assistant') {
                  msgs[msgs.length - 1] = { ...last, content: last.content + event.text }
                }
                return { ...prev, messages: msgs }
              })
              setToolCallName(null)
            } else if (event.type === 'tool_call') {
              setToolCallName(event.name)
            } else if (event.type === 'done') {
              setActiveConversation((prev) => {
                if (!prev) return null
                const msgs = [...prev.messages]
                const last = msgs[msgs.length - 1]
                if (last.role === 'assistant') {
                  msgs[msgs.length - 1] = { ...last, isStreaming: false }
                }
                return { ...prev, messages: msgs }
              })

              // Persist to localStorage sidebar
              if (convId) {
                const stored: StoredConversation = {
                  id: convId,
                  title: convTitle,
                  preview: text.slice(0, 60),
                  createdAt: new Date().toISOString(),
                }
                saveStoredConversation(stored)
                setConversations(loadStoredConversations())
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (err: any) {
      setActiveConversation((prev) => {
        if (!prev) return null
        const msgs = [...prev.messages]
        const last = msgs[msgs.length - 1]
        if (last.role === 'assistant') {
          msgs[msgs.length - 1] = {
            ...last,
            content: `Error: ${err.message ?? 'Something went wrong'}`,
            isStreaming: false,
          }
        }
        return { ...prev, messages: msgs }
      })
    } finally {
      setIsLoading(false)
      setToolCallName(null)
      textareaRef.current?.focus()
    }
  }, [input, isLoading, activeConversation])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Left sidebar — conversation list */}
      <aside className="w-64 border-r border-gray-100 flex flex-col bg-gray-50 shrink-0">
        <div className="p-3 border-b border-gray-200">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-400 px-2 py-3 text-center">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeConversation?.id === conv.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
                  <div className="min-w-0">
                    <p className="font-medium truncate text-xs">{conv.title || 'Untitled'}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{conv.preview}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b border-gray-100 flex items-center px-5 gap-3 shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">AI Assistant</p>
            <p className="text-xs text-gray-500">Powered by Claude · Full business context</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-800 mb-1">Ask anything about your business</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                I have full context of your jobs, invoices, and customers. Try asking:
              </p>
              <div className="mt-4 space-y-2 w-full max-w-sm">
                {[
                  'Who has an overdue invoice?',
                  'What jobs are scheduled tomorrow?',
                  'Summarize last week\'s revenue',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion)
                      textareaRef.current?.focus()
                    }}
                    className="w-full text-left text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-lg transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeConversation.messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === 'user' ? 'bg-gray-200' : 'bg-blue-100'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-3.5 h-3.5 text-gray-600" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-blue-600" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}
                >
                  {msg.isStreaming && !msg.content ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      {toolCallName ? (
                        <>
                          <Wrench className="w-3.5 h-3.5 animate-pulse" />
                          <span className="text-xs">
                            Calling {toolCallName.replace(/_/g, ' ')}…
                          </span>
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-xs">Thinking…</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">
                      {msg.content}
                      {msg.isStreaming && (
                        <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse align-middle" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-4 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about jobs, invoices, customers…"
              rows={1}
              className="flex-1 resize-none text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 max-h-32 overflow-y-auto"
              style={{ minHeight: '42px' }}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
