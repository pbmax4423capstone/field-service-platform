import Link from 'next/link'
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, formatTime } from '@field-service/shared'

interface TodayJobsListProps {
  jobs: any[]
}

export function TodayJobsList({ jobs }: TodayJobsListProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Today&apos;s Jobs</h2>
        <Link href="/jobs" className="text-sm text-blue-600 hover:underline">
          View all
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="p-5 text-center text-sm text-gray-400">No jobs scheduled for today</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {jobs.map((job: any) => {
            const customer = job.customers
            const customerName = customer
              ? `${customer.first_name} ${customer.last_name}`
              : 'Unknown'
            const statusColor = JOB_STATUS_COLORS[job.status] ?? '#6B7280'
            const statusLabel = JOB_STATUS_LABELS[job.status] ?? job.status

            return (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: statusColor }}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{job.title}</p>
                      <p className="text-xs text-gray-500">{customerName}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs font-medium text-gray-700">
                      {formatTime(job.scheduled_start)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{statusLabel}</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
