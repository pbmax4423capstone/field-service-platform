import { createServerSupabaseClient } from '@/lib/supabase'
import Link from 'next/link'
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS, formatDateTime, formatPhone } from '@field-service/shared'
import { Plus } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>
}

export default async function JobsPage({ searchParams }: PageProps) {
  const { status, page: pageParam } = await searchParams
  const page = Number(pageParam ?? 1)
  const perPage = 50
  const from = (page - 1) * perPage

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const orgId = userData?.organization_id
  let query = orgId
    ? supabase
        .from('jobs')
        .select(
          '*, customers(first_name, last_name, phone), customer_addresses(street, city), users(full_name)',
          { count: 'exact' },
        )
        .eq('organization_id', orgId)
        .order('scheduled_start', { ascending: false })
        .range(from, from + perPage - 1)
    : null

  if (query && status) query = query.eq('status', status)

  const { data: jobs, count } = query ? await query : { data: [], count: 0 }

  const statusFilters = [
    { value: '', label: 'All' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'dispatched', label: 'Dispatched' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{count ?? 0} total</p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Job
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {statusFilters.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/jobs?status=${f.value}` : '/jobs'}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              (status ?? '') === f.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                Job
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3 hidden md:table-cell">
                Customer
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">
                Technician
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                Status
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3 hidden sm:table-cell">
                Scheduled
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(jobs ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                  No jobs found
                </td>
              </tr>
            ) : (
              (jobs ?? []).map((job: any) => {
                const customer = job.customers
                const tech = job.users
                const statusColor = JOB_STATUS_COLORS[job.status] ?? '#6B7280'
                const statusLabel = JOB_STATUS_LABELS[job.status] ?? job.status

                return (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {job.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell">
                      {customer ? `${customer.first_name} ${customer.last_name}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 hidden lg:table-cell">
                      {tech?.full_name ?? 'Unassigned'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: statusColor }}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell text-xs">
                      {formatDateTime(job.scheduled_start)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
