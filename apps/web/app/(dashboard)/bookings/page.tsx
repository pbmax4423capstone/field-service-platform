import { createServerSupabaseClient } from '@/lib/supabase-server'
import { formatDate, formatPhone } from '@field-service/shared'
import { CalendarCheck, Phone } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  approved: '#3B82F6',
  scheduled: '#10B981',
  declined: '#EF4444',
}

export default async function BookingsPage({ searchParams }: PageProps) {
  const { status } = await searchParams

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const orgId = (userData as any)?.organization_id ?? ''

  let query = supabase
    .from('bookings')
    .select('*', { count: 'exact' })
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)

  const { data: bookings, count } = await query

  const statusFilters = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'declined', label: 'Declined' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{count ?? 0} total</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {statusFilters.map((f) => (
          <a
            key={f.value}
            href={f.value ? `/bookings?status=${f.value}` : '/bookings'}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              (status ?? '') === f.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {(bookings ?? []).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CalendarCheck className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No bookings yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Bookings come in via your website booking widget, AI chat, or AI voice agent
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(bookings ?? []).map((booking: any) => (
            <div key={booking.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{booking.customer_name}</p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                    <Phone className="w-3 h-3" />
                    {formatPhone(booking.customer_phone)}
                  </div>
                </div>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full text-white capitalize"
                  style={{ backgroundColor: STATUS_COLORS[booking.status] ?? '#6B7280' }}
                >
                  {booking.status}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800 mb-1">{booking.service_requested}</p>
              <p className="text-xs text-gray-500 mb-2">{booking.address}</p>
              {booking.preferred_date && (
                <p className="text-xs text-blue-600 font-medium">
                  Preferred: {formatDate(booking.preferred_date)}
                  {booking.preferred_time_of_day && ` (${booking.preferred_time_of_day})`}
                </p>
              )}
              {booking.urgency === 'emergency' && (
                <p className="text-xs font-medium text-red-600 mt-1">⚡ Emergency</p>
              )}
              {booking.notes && (
                <p className="text-xs text-gray-400 mt-2 border-t border-gray-100 pt-2">
                  {booking.notes}
                </p>
              )}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  via {booking.source} · {formatDate(booking.created_at)}
                </p>
                <div className="flex gap-2">
                  {booking.status === 'pending' && (
                    <>
                      <button className="text-xs text-green-600 hover:underline font-medium">
                        Approve
                      </button>
                      <button className="text-xs text-red-500 hover:underline">Decline</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
