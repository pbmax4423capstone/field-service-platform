'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { JOB_STATUS_LABELS } from '@field-service/shared'
import type { JobStatus } from '@field-service/shared'
import { createClient } from '@/lib/supabase'
import { ChevronDown } from 'lucide-react'

interface JobStatusActionsProps {
  jobId: string
  organizationId: string
  currentStatus: JobStatus
  allowedTransitions: string[]
  userId: string
}

export function JobStatusActions({
  jobId,
  organizationId,
  currentStatus,
  allowedTransitions,
  userId,
}: JobStatusActionsProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function advanceStatus(toStatus: string) {
    setLoading(true)
    setOpen(false)
    const supabase = createClient()

    const [jobUpdate] = await Promise.all([
      supabase.from('jobs').update({ status: toStatus }).eq('id', jobId),
      supabase.from('job_status_history').insert({
        job_id: jobId,
        organization_id: organizationId,
        changed_by: userId,
        from_status: currentStatus,
        to_status: toStatus,
      }),
    ])

    setLoading(false)
    if (!jobUpdate.error) {
      router.refresh()
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {loading ? 'Updating…' : 'Update Status'}
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px]">
            {allowedTransitions.map((status) => (
              <button
                key={status}
                onClick={() => advanceStatus(status)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              >
                → {JOB_STATUS_LABELS[status] ?? status}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
