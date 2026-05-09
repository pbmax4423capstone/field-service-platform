'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@field-service/ui'
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  ClipboardList,
  BookOpen,
  Bell,
  CalendarCheck,
  Settings,
  Wrench,
  MessageSquare,
  Share2,
  BarChart3,
  MapPin,
  Truck,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/jobs', label: 'Jobs', icon: Calendar },
  { href: '/dispatch', label: 'Dispatch', icon: Truck },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/estimates', label: 'Estimates', icon: ClipboardList },
  { href: '/price-book', label: 'Price Book', icon: BookOpen },
  { href: '/bookings', label: 'Bookings', icon: CalendarCheck },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/social', label: 'Social', icon: Share2 },
  { href: '/chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/locations', label: 'Locations', icon: MapPin },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-gray-900 flex flex-col shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-semibold text-sm">DispatchForce AI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-gray-800">
        <p className="text-xs text-gray-600 px-3">DispatchForce AI v0.1</p>
      </div>
    </aside>
  )
}
