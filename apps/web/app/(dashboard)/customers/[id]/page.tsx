import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  formatPhone,
  formatDate,
  formatCurrency,
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  EQUIPMENT_TYPE_LABELS,
} from '@field-service/shared'
import { ArrowLeft, Phone, Mail, MapPin, Wrench, Plus } from 'lucide-react'
import { EditCustomerButton } from '@/components/customers/EditCustomerButton'
import { CopyPortalLinkButton } from '@/components/customers/CopyPortalLinkButton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const [{ data: customer }, { data: addresses }, { data: equipment }, { data: jobs }, { data: invoices }] =
    await Promise.all([
      supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('organization_id', userData?.organization_id ?? '')
        .single(),
      supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', id)
        .order('is_primary', { ascending: false }),
      supabase
        .from('customer_equipment')
        .select('*, customer_addresses(street)')
        .eq('customer_id', id),
      supabase
        .from('jobs')
        .select('*, customer_addresses(street, city)')
        .eq('customer_id', id)
        .order('scheduled_start', { ascending: false })
        .limit(20),
      supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

  if (!customer) notFound()

  const totalRevenue = (invoices ?? [])
    .filter((inv: any) => inv.status === 'paid')
    .reduce((sum: number, inv: any) => sum + (inv.amount_paid ?? 0), 0)

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <Link
          href="/customers"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Customers
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {customer.first_name} {customer.last_name}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {customer.phone && (
                <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:text-blue-600">
                  <Phone className="w-3.5 h-3.5" />
                  {formatPhone(customer.phone)}
                </a>
              )}
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-blue-600">
                  <Mail className="w-3.5 h-3.5" />
                  {customer.email}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue * 100)}</p>
            </div>
            <CopyPortalLinkButton customerId={customer.id} />
            <EditCustomerButton customer={customer} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-5">
          {/* Service history */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Service History</h2>
              <Link
                href={`/jobs/new?customerId=${id}`}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                New Job
              </Link>
            </div>
            {(jobs ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No service history</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {(jobs ?? []).map((job: any) => (
                  <li key={job.id}>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{job.title}</p>
                        <p className="text-xs text-gray-500">{formatDate(job.scheduled_start)}</p>
                      </div>
                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
                        style={{ backgroundColor: JOB_STATUS_COLORS[job.status] ?? '#6B7280' }}
                      >
                        {JOB_STATUS_LABELS[job.status] ?? job.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Invoices */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Invoices</h2>
            </div>
            {(invoices ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No invoices</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {(invoices ?? []).map((inv: any) => (
                  <li key={inv.id}>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-500">{formatDate(inv.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(inv.total * 100)}
                        </p>
                        <span className="text-xs text-gray-500 capitalize">{inv.status}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {/* Addresses */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Service Addresses</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {(addresses ?? []).map((addr: any) => (
                <li key={addr.id} className="px-5 py-3.5">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      {addr.label && (
                        <p className="text-xs font-medium text-gray-700 mb-0.5">{addr.label}</p>
                      )}
                      <p className="text-xs text-gray-600">{addr.street}</p>
                      <p className="text-xs text-gray-500">
                        {addr.city}, {addr.state} {addr.zip}
                      </p>
                      {addr.is_primary && (
                        <span className="text-xs text-blue-600 font-medium">Primary</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Equipment */}
          {(equipment ?? []).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">Equipment</h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {(equipment ?? []).map((eq: any) => (
                  <li key={eq.id} className="px-5 py-3.5">
                    <div className="flex items-start gap-2">
                      <Wrench className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-800">
                          {EQUIPMENT_TYPE_LABELS[eq.equipment_type] ?? eq.equipment_type}
                        </p>
                        {(eq.make || eq.model) && (
                          <p className="text-xs text-gray-500">
                            {[eq.make, eq.model].filter(Boolean).join(' ')}
                          </p>
                        )}
                        {eq.install_date && (
                          <p className="text-xs text-gray-400">
                            Installed {formatDate(eq.install_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Customer notes */}
          {customer.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-medium text-amber-800 mb-1">Notes</p>
              <p className="text-xs text-amber-700">{customer.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
