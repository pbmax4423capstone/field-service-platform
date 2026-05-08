import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ESTIMATE_STATUS_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
} from '@field-service/shared'
import { ArrowLeft, User, Phone, Mail, Clock } from 'lucide-react'
import { EstimateActions } from '@/components/estimates/EstimateActions'
import { EditEstimateButton } from '@/components/estimates/EditEstimateButton'

const ESTIMATE_STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  sent: '#3B82F6',
  accepted: '#10B981',
  declined: '#EF4444',
  expired: '#9CA3AF',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EstimateDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const { data: estimate } = await supabase
    .from('estimates')
    .select('*, customers(first_name, last_name, phone, email), estimate_line_items(*)')
    .eq('id', id)
    .eq('organization_id', userData?.organization_id ?? '')
    .single()

  if (!estimate) notFound()

  const customer = estimate.customers as any
  const lineItems = (estimate.estimate_line_items as any[]) ?? []

  const subtotal = lineItems.reduce(
    (sum: number, li: any) => sum + li.quantity * li.unit_price,
    0,
  )
  const taxRate = estimate.tax_rate ?? 0
  const taxAmount = subtotal * taxRate
  const total = subtotal + taxAmount

  const statusColor = ESTIMATE_STATUS_COLORS[estimate.status] ?? '#6B7280'
  const statusLabel = ESTIMATE_STATUS_LABELS[estimate.status] ?? estimate.status

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/estimates"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Estimates
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{estimate.title}</h1>
            <EditEstimateButton
              estimate={{
                id: estimate.id,
                title: estimate.title,
                notes: estimate.notes,
                terms: estimate.terms,
                valid_until: estimate.valid_until,
              }}
            />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: statusColor }}
            >
              {statusLabel}
            </span>
            {estimate.valid_until && (
              <span className="text-sm text-gray-500">
                Valid until {formatDate(estimate.valid_until)}
              </span>
            )}
          </div>
        </div>

        <EstimateActions estimateId={estimate.id} status={estimate.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left: Customer + line items + notes/terms */}
        <div className="md:col-span-2 space-y-5">
          {/* Customer info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Customer</h2>
            <div className="space-y-3">
              {customer ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <Link
                      href={`/customers/${estimate.customer_id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {customer.first_name} {customer.last_name}
                    </Link>
                  </div>
                  {customer.phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <a
                        href={`tel:${customer.phone}`}
                        className="text-sm text-gray-700 hover:text-blue-600"
                      >
                        {customer.phone}
                      </a>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                      <a
                        href={`mailto:${customer.email}`}
                        className="text-sm text-gray-700 hover:text-blue-600"
                      >
                        {customer.email}
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400">No customer linked</p>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Line Items</h2>
            </div>
            {lineItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No line items added</p>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left text-xs text-gray-500 font-medium uppercase px-5 py-2.5">
                        Item
                      </th>
                      <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2.5">
                        Qty
                      </th>
                      <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2.5">
                        Unit Price
                      </th>
                      <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2.5">
                        Total
                      </th>
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

                {/* Totals */}
                <div className="px-5 py-4 border-t border-gray-100">
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium text-gray-900 w-24 text-right">
                        {formatCurrency(subtotal * 100)}
                      </span>
                    </div>
                    {taxRate > 0 && (
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-gray-500">Tax ({(taxRate * 100).toFixed(1)}%)</span>
                        <span className="font-medium text-gray-900 w-24 text-right">
                          {formatCurrency(taxAmount * 100)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-6 border-t border-gray-100 pt-2 mt-1">
                      <span className="text-sm font-semibold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-gray-900 w-24 text-right">
                        {formatCurrency(total * 100)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          {estimate.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{estimate.notes}</p>
            </div>
          )}

          {/* Terms */}
          {estimate.terms && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Terms &amp; Conditions</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{estimate.terms}</p>
            </div>
          )}
        </div>

        {/* Right: Estimate metadata */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                  Estimate ID
                </dt>
                <dd className="text-sm text-gray-900 font-mono mt-0.5">
                  {estimate.id.slice(0, 8).toUpperCase()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                  Created
                </dt>
                <dd className="text-sm text-gray-900 mt-0.5">
                  {formatDateTime(estimate.created_at)}
                </dd>
              </div>
              {estimate.valid_until && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Valid Until
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {formatDate(estimate.valid_until)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                  Status
                </dt>
                <dd className="mt-1">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: statusColor }}
                  >
                    {statusLabel}
                  </span>
                </dd>
              </div>
              {estimate.status === 'accepted' && estimate.accepted_at && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Accepted On
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {formatDateTime(estimate.accepted_at)}
                  </dd>
                </div>
              )}
              {estimate.status === 'declined' && estimate.declined_at && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Declined On
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {formatDateTime(estimate.declined_at)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Sent date */}
          {estimate.sent_at && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" />
                Sent on {formatDateTime(estimate.sent_at)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
