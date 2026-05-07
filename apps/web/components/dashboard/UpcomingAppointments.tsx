import Link from 'next/link'
import { formatDate, formatTime } from '@field-service/shared'
import { MapPin } from 'lucide-react'

export function UpcomingAppointments({ jobs }: { jobs: any[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Next 7 Days</h2>
        <Link href="/jobs" className="text-sm text-blue-600 hover:underline">
          Calendar
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="p-5 text-center text-sm text-gray-400">No upcoming appointments</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {jobs.map((job: any) => {
            const customer = job.customers
            const address = job.customer_addresses
            const customerName = customer
              ? `${customer.first_name} ${customer.last_name}`
              : 'Unknown'

            return (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="text-center min-w-[40px]">
                    <p className="text-xs text-gray-400 uppercase">
                      {new Date(job.scheduled_start).toLocaleDateString('en-US', {
                        weekday: 'short',
                      })}
                    </p>
                    <p className="text-lg font-bold text-gray-900 leading-none">
                      {new Date(job.scheduled_start).getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                    <p className="text-xs text-gray-500">{customerName}</p>
                    {address && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {address.street}, {address.city}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 shrink-0">
                    {formatTime(job.scheduled_start)}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
