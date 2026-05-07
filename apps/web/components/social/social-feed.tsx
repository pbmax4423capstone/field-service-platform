'use client'

import { useState, useCallback } from 'react'
import { Twitter, Facebook, Instagram, Linkedin, Plus, Trash2, Share2 } from 'lucide-react'
import { NewPostModal } from './new-post-modal'

interface SocialPost {
  id: string
  platforms: string[]
  content: string
  status: string
  scheduled_for: string | null
  published_at: string | null
  created_at: string
}

interface SocialFeedProps {
  initialPosts: SocialPost[]
}

const PLATFORM_ICON: Record<string, React.ElementType> = {
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
}

const PLATFORM_COLOR: Record<string, string> = {
  twitter: 'text-sky-500',
  facebook: 'text-blue-600',
  instagram: 'text-pink-500',
  linkedin: 'text-blue-700',
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Scheduled', className: 'bg-amber-100 text-amber-700' },
  published: { label: 'Published', className: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function SocialFeed({ initialPosts }: SocialFeedProps) {
  const [posts, setPosts] = useState<SocialPost[]>(initialPosts)
  const [showModal, setShowModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/social/posts', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      setPosts(data.posts ?? [])
    }
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this post?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/social/posts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Social Media</h1>
            <p className="text-sm text-gray-500 mt-0.5">{posts.length} post{posts.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
            <Share2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No posts yet</p>
            <p className="text-gray-400 text-sm mt-1">Schedule your first social media post</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Post
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const badge = STATUS_BADGE[post.status] ?? STATUS_BADGE.draft
              const platform = post.platforms[0] ?? 'twitter'
              const PlatformIcon = PLATFORM_ICON[platform] ?? Share2
              const platformColor = PLATFORM_COLOR[platform] ?? 'text-gray-400'

              return (
                <div
                  key={post.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Platform icon */}
                    <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      <PlatformIcon className={`w-4 h-4 ${platformColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-relaxed mb-2 line-clamp-2">
                        {post.content.length > 100
                          ? post.content.slice(0, 100) + '…'
                          : post.content}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>

                        {post.scheduled_for && post.status === 'scheduled' && (
                          <span>Scheduled: {formatDateTime(post.scheduled_for)}</span>
                        )}
                        {post.published_at && (
                          <span>Published: {formatDateTime(post.published_at)}</span>
                        )}
                        <span className="capitalize text-gray-400">{platform}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    {post.status === 'scheduled' && (
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={deletingId === post.id}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors shrink-0"
                        title="Delete post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <NewPostModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false)
            refresh()
          }}
        />
      )}
    </>
  )
}
