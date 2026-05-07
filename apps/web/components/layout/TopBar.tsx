'use client'

import { useRouter } from 'next/navigation'
import { Bell, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getInitials } from '@field-service/shared'

interface TopBarProps {
  user: {
    full_name: string
    email: string
    avatar_url: string | null
    organizations?: { name: string; logo_url: string | null } | null
  } | null
}

export function TopBar({ user }: TopBarProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const orgName = (user as any)?.organizations?.name ?? 'Your Organization'
  const displayName = user?.full_name ?? user?.email ?? 'User'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div>
        <p className="text-sm font-semibold text-gray-900">{orgName}</p>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-white">{getInitials(displayName)}</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-none">{displayName}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
