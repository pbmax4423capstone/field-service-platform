import { createServerSupabaseClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  JOB_STATUS_TRANSITIONS,
  formatCurrency,
  formatDateTime,
  formatPhone,
} from '@field-service/shared'
import { ArrowLeft, MapPin, Phone, User, Clock, ChevronRight } from 'lucide-react'
import { JobStatusActions } from '@/components/jobs/JobStatusActions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, id')
    .eq('id', user!.id)
    .single()

  const { data: job } = await supabase
    .from('jobs')
    .select(`
      *,
      customers(first_name, last_name, phone, email),
      customer_addresses(street, city, state, zip, access_notes),
      users(full_name),
      job_line_items(*),
      job_photos(*),
      job_notes(*, users(full_name)),
      job_status_history(*, users(full_name))
    `)
    .eq('id', id)
    .eq('organization_id', userData?.organization_id ?? '')
    .single()

  if (!job) notFound()

  const customer = job.customers as any
  const address = job.customer_addresses as any
  const tech = job.users as any
  const lineItems = (job.job_line_items as any[]) ?? []
  const notes = (job.job_notes as any[]) ?? []
  const history = (job.job_status_history as any[]) ?? []

  const subtotal = lineItems.reduce((sum: number, li: any) => sum + li.quantity * li.unit_price, 0)
  const allowedTransitions = JOB_STATUS_TRANSITIONS[job.status] ?? []

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/jobs"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Jobs
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: JOB_STATUS_COLORS[job.status] ?? '#6B7280' }}
            >
              {JOB_STATUS_LABELS[job.status] ?? job.status}
            </span>
            <span className="text-sm text-gray-500">{formatDateTime(job.scheduled_start)}</span>
          </div>
        </div>

        {/* Status Actions */}
        {allowedTransitions.length > 0 && (
          <JobStatusActions
            jobId={job.id}
            organizationId={job.organization_id}
            currentStatus={job.status}
            allowedTransitions={allowedTransitions}
            userId={userData?.id ?? ''}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left: Job info + line items */}
        <div className="md:col-span-2 space-y-5">
          {/* Customer & address */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Customer</h2>
            <div className="space-y-3">
              {customer && (
                <>
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <Link
                      href={`/customers/${job.customer_id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {customer.first_name} {customer.last_name}
                    </Link>
                  </div>
                  {customer.phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <a href={`tel:${customer.phone}`} className="text-sm text-gray-700 hover:text-blue-600">
                        {formatPhone(customer.phone)}
                      </a>
                    </div>
                  )}
                </>
              )}
              {address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-700">
                      {address.street}, {address.city}, {address.state} {address.zip}
                    </p>
                    {address.access_notes && (
                      <p className="text-xs text-amber-600 mt-1">⚠ {address.access_notes}</p>
                    )}
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(`${address.street} ${address.city} ${address.state}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                    >
                      Open in Maps →
                    </a>
                  </div>
                </div>
              )}
              {tech && (
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700">Assigned to {tech.full_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Line Items</h2>
            </div>
            {lineItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No line items added</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left text-xs text-gray-500 font-medium uppercase px-5 py-2.5">Item</th>
                      <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2.5">Qty</th>
                      <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2.5">Price</th>
                      <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2.5">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lineItems.map((li: any) => (
                      <tr key={li.id}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-900">{li.name}</p>
                          {li.description && (
                            <p className="text-xs text-gray-400">{li.description}</p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600">{li.quantity}</td>
                        <td className="px-5 py-3 text-right text-gray-600">
                          {formatCurrency(li.unit_price * 100)}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(li.quantity * li.unit_price * 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Subtotal</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(subtotal * 100)}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Notes</h2>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No notes yet</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notes.map((note: any) => (
                  <li key={note.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm text-gray-800">{note.content}</p>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-500">{note.users?.full_name}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(note.created_at)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: Status history */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Status History</h2>
            </div>
            <ul className="p-4 space-y-3">
              {history
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((h: any) => (
                  <li key={h.id} className="flex items-start gap-2">
                    <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {h.from_status && (
                          <>
                            <span className="text-gray-500">{JOB_STATUS_LABELS[h.from_status]}</span>
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                          </>
                        )}
                        <span className="font-medium text-gray-900">{JOB_STATUS_LABELS[h.to_status]}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {h.users?.full_name} · {formatDateTime(h.created_at)}
                      </p>
                      {h.note && <p className="text-xs text-gray-600 mt-0.5 italic">{h.note}</p>}
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
