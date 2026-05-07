import { JOB_STATUS_LABELS, formatDateTime } from '@field-service/shared'
import { ArrowRight } from 'lucide-react'

export function RecentActivity({ activity }: { activity: any[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Recent Activity</h2>
      </div>

      {activity.length === 0 ? (
        <div className="p-5 text-center text-sm text-gray-400">No recent activity</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {activity.map((item: any) => {
            const job = item.jobs
            const jobTitle = job?.title ?? 'Job'
            const customer = job?.customers
            const customerName = customer
              ? `${customer.first_name} ${customer.last_name}`
              : ''

            return (
              <li key={item.id} className="px-5 py-3.5">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{jobTitle}</p>
                    {customerName && (
                      <p className="text-xs text-gray-500">{customerName}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      {item.from_status && (
                        <>
                          <span className="text-xs text-gray-400">
                            {JOB_STATUS_LABELS[item.from_status] ?? item.from_status}
                          </span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                        </>
                      )}
                      <span className="text-xs font-medium text-blue-600">
                        {JOB_STATUS_LABELS[item.to_status] ?? item.to_status}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDateTime(item.created_at)}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
