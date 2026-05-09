import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/admin-supabase'
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '@field-service/shared'
import Link from 'next/link'
import { Truck, Clock, User } from 'lucide-react'

// Timeline constants
const HOUR_START = 7  // 07:00
const HOUR_END = 19   // 19:00
const TOTAL_HOURS = HOUR_END - HOUR_START
const HOUR_WIDTH_PX = 120 // pixels per hour in the timeline

function parseHourOffset(dateStr: string): number {
  const d = new Date(dateStr)
  return d.getHours() + d.getMinutes() / 60
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

interface Job {
  id: string
  title: string
  status: string
  scheduled_start: string | null
  estimated_duration_minutes: number | null
  scheduled_end: string | null
  technician_id: string | null
  customers: { first_name: string; last_name: string } | null
  customer_addresses: { street: string; city: string } | null
}

interface Technician {
  id: string
  full_name: string
}

export default async function DispatchPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const orgId = userData?.organization_id ?? ''
  const admin = createAdminClient()

  // Fetch technicians and today's jobs in parallel
  const [{ data: technicians }, { data: allJobs }] = await Promise.all([
    admin
      .from('users')
      .select('id, full_name, user_roles!inner(role)')
      .eq('organization_id', orgId)
      .eq('user_roles.role', 'technician')
      .eq('is_active', true),
    admin
      .from('jobs')
      .select(
        'id, title, status, scheduled_start, scheduled_end, estimated_duration_minutes, technician_id, customers(first_name, last_name), customer_addresses(street, city)',
      )
      .eq('organization_id', orgId)
      .not('status', 'in', '("cancelled","completed")')
      .order('scheduled_start', { ascending: true }),
  ])

  const techs: Technician[] = (technicians ?? []).map((t: any) => ({
    id: t.id,
    full_name: t.full_name,
  }))

  const jobs: Job[] = (allJobs ?? []) as unknown as Job[]

  // Partition jobs
  const scheduledJobs = jobs.filter((j) => j.scheduled_start !== null)
  const unscheduledJobs = jobs.filter((j) => j.scheduled_start === null)

  // Group by technician
  const jobsByTech: Record<string, Job[]> = {}
  for (const tech of techs) {
    jobsByTech[tech.id] = scheduledJobs.filter((j) => j.technician_id === tech.id)
  }
  // Unassigned (have a time but no tech)
  const unassignedScheduled = scheduledJobs.filter(
    (j) => !j.technician_id || !techs.find((t) => t.id === j.technician_id),
  )

  const hourLabels = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
    const h = HOUR_START + i
    return h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`
  })

  const timelineWidth = TOTAL_HOURS * HOUR_WIDTH_PX

  function jobCardStyle(job: Job) {
    if (!job.scheduled_start) return {}
    const startHour = parseHourOffset(job.scheduled_start)
    const clampedStart = Math.max(HOUR_START, Math.min(startHour, HOUR_END))
    const left = (clampedStart - HOUR_START) * HOUR_WIDTH_PX

    let durationHours = 1
    if (job.estimated_duration_minutes) {
      durationHours = job.estimated_duration_minutes / 60
    } else if (job.scheduled_end) {
      const endHour = parseHourOffset(job.scheduled_end)
      durationHours = Math.max(0.5, endHour - startHour)
    }
    const width = Math.max(80, durationHours * HOUR_WIDTH_PX - 4)

    return { left, width }
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Truck className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch Board</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Timeline board */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Time header */}
        <div className="flex border-b border-gray-100">
          <div className="w-44 shrink-0 px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide border-r border-gray-100">
            Technician
          </div>
          <div className="overflow-x-auto flex-1">
            <div className="flex" style={{ width: timelineWidth }}>
              {hourLabels.map((label, i) => (
                <div
                  key={i}
                  className="shrink-0 text-xs text-gray-400 py-3 px-1 border-r border-gray-50 last:border-r-0"
                  style={{ width: HOUR_WIDTH_PX }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Unassigned scheduled row */}
        {unassignedScheduled.length > 0 && (
          <div className="flex border-b border-gray-100">
            <div className="w-44 shrink-0 px-4 py-4 border-r border-gray-100 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">Unassigned</span>
            </div>
            <div className="overflow-x-auto flex-1">
              <div className="relative" style={{ width: timelineWidth, height: 60 }}>
                {/* Hour gridlines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-r border-gray-50"
                    style={{ left: (i + 1) * HOUR_WIDTH_PX }}
                  />
                ))}
                {unassignedScheduled.map((job) => {
                  const style = jobCardStyle(job)
                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="absolute top-2 rounded-lg px-2 py-1.5 text-white text-xs shadow-sm hover:opacity-90 transition-opacity overflow-hidden"
                      style={{
                        left: style.left,
                        width: style.width,
                        backgroundColor: JOB_STATUS_COLORS[job.status] ?? '#6B7280',
                        height: 44,
                      }}
                    >
                      <p className="font-medium truncate">{job.title}</p>
                      {job.scheduled_start && (
                        <p className="opacity-80 truncate">{formatTime(job.scheduled_start)}</p>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Technician rows */}
        {techs.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            No technicians found. Add users with the technician role in Settings.
          </div>
        ) : (
          techs.map((tech, idx) => {
            const techJobs = jobsByTech[tech.id] ?? []
            return (
              <div
                key={tech.id}
                className={`flex border-b border-gray-100 last:border-b-0 ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}
              >
                <div className="w-44 shrink-0 px-4 py-4 border-r border-gray-100 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-blue-700">
                      {tech.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 truncate">{tech.full_name}</span>
                </div>
                <div className="overflow-x-auto flex-1">
                  <div className="relative" style={{ width: timelineWidth, height: 60 }}>
                    {/* Hour gridlines */}
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-r border-gray-50"
                        style={{ left: (i + 1) * HOUR_WIDTH_PX }}
                      />
                    ))}
                    {techJobs.length === 0 && (
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-xs text-gray-300">No jobs scheduled</span>
                      </div>
                    )}
                    {techJobs.map((job) => {
                      const style = jobCardStyle(job)
                      return (
                        <Link
                          key={job.id}
                          href={`/jobs/${job.id}`}
                          className="absolute top-2 rounded-lg px-2 py-1.5 text-white text-xs shadow-sm hover:opacity-90 transition-opacity overflow-hidden"
                          style={{
                            left: style.left,
                            width: style.width,
                            backgroundColor: JOB_STATUS_COLORS[job.status] ?? '#6B7280',
                            height: 44,
                          }}
                        >
                          <p className="font-medium truncate">
                            {job.customers
                              ? `${job.customers.first_name} ${job.customers.last_name}`
                              : job.title}
                          </p>
                          <p className="opacity-80 truncate">
                            {job.customer_addresses?.street ?? job.title}
                          </p>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Unscheduled jobs pile */}
      {unscheduledJobs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">Unscheduled Jobs</h2>
            <span className="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {unscheduledJobs.length}
            </span>
          </div>
          <div className="p-4 flex flex-wrap gap-3">
            {unscheduledJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex flex-col gap-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 hover:border-blue-300 hover:bg-blue-50 transition-colors min-w-[200px] max-w-[260px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                  <span
                    className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: JOB_STATUS_COLORS[job.status] ?? '#6B7280' }}
                  >
                    {JOB_STATUS_LABELS[job.status] ?? job.status}
                  </span>
                </div>
                {job.customers && (
                  <p className="text-xs text-gray-500">
                    {job.customers.first_name} {job.customers.last_name}
                  </p>
                )}
                {job.customer_addresses?.street && (
                  <p className="text-xs text-gray-400 truncate">{job.customer_addresses.street}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
