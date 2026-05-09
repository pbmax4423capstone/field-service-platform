import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/admin-supabase'
import { Wrench, Phone, Mail, MapPin } from 'lucide-react'
import Link from 'next/link'
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  EQUIPMENT_TYPE_LABELS,
  formatDate,
  formatPhone,
  formatCurrency,
} from '@field-service/shared'

interface PageProps {
  params: Promise<{ token: string }>
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-violet-100 text-violet-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  void: 'bg-gray-100 text-gray-500',
}

export default async function CustomerPortalPage({ params }: PageProps) {
  const { token } = await params
  const admin = createAdminClient()

  // Validate token
  const { data: tokenRow } = await admin
    .from('customer_portal_tokens')
    .select('customer_id, organization_id, expires_at')
    .eq('token', token)
    .single()

  if (!tokenRow) redirect('/portal/expired')
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    redirect('/portal/expired')
  }

  const { customer_id, organization_id } = tokenRow

  // Fetch all customer data in parallel
  const [
    { data: customer },
    { data: addresses },
    { data: equipment },
    { data: jobs },
    { data: invoices },
    { data: org },
  ] = await Promise.all([
    admin
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single(),
    admin
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customer_id)
      .order('is_primary', { ascending: false }),
    admin
      .from('customer_equipment')
      .select('*')
      .eq('customer_id', customer_id),
    admin
      .from('jobs')
      .select('*, users(full_name), customer_addresses(street, city)')
      .eq('customer_id', customer_id)
      .eq('organization_id', organization_id)
      .order('scheduled_start', { ascending: false }),
    admin
      .from('invoices')
      .select('*')
      .eq('customer_id', customer_id)
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false }),
    admin
      .from('organizations')
      .select('name, phone, email')
      .eq('id', organization_id)
      .single(),
  ])

  if (!customer) redirect('/portal/expired')

  const primaryAddress = (addresses ?? []).find((a: any) => a.is_primary) ?? (addresses ?? [])[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{org?.name ?? 'DispatchForce AI'}</p>
            {(org?.phone || org?.email) && (
              <p className="text-xs text-gray-500">{org?.phone ?? org?.email}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Customer info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            {customer.first_name} {customer.last_name}
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
              >
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                {customer.email}
              </a>
            )}
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
              >
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                {formatPhone(customer.phone)}
              </a>
            )}
            {primaryAddress && (
              <div className="flex items-start gap-2 text-gray-600 sm:col-span-2">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span>
                  {primaryAddress.street}, {primaryAddress.city}, {primaryAddress.state}{' '}
                  {primaryAddress.zip}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Equipment */}
        {(equipment ?? []).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Equipment</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {(equipment ?? []).map((eq: any) => (
                <li key={eq.id} className="px-5 py-4">
                  <p className="text-sm font-medium text-gray-900">
                    {EQUIPMENT_TYPE_LABELS[eq.equipment_type] ?? eq.equipment_type}
                  </p>
                  {(eq.make || eq.model) && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {[eq.make, eq.model].filter(Boolean).join(' ')}
                    </p>
                  )}
                  {eq.serial_number && (
                    <p className="text-xs text-gray-400 mt-0.5">S/N: {eq.serial_number}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Service History */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Service History</h2>
          </div>
          {(jobs ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No service history</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {(jobs ?? []).map((job: any) => (
                <li key={job.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{job.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {job.scheduled_start ? formatDate(job.scheduled_start) : 'Not scheduled'}
                      </p>
                      {job.users?.full_name && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Technician: {job.users.full_name}
                        </p>
                      )}
                    </div>
                    <span
                      className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full text-white"
                      style={{ backgroundColor: JOB_STATUS_COLORS[job.status] ?? '#6B7280' }}
                    >
                      {JOB_STATUS_LABELS[job.status] ?? job.status}
                    </span>
                  </div>
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
                <li key={inv.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(inv.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(inv.total * 100)}
                      </p>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${INVOICE_STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                      </span>
                      {inv.status !== 'paid' && inv.status !== 'void' && inv.public_token && (
                        <Link
                          href={`/pay/${inv.public_token}`}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          Pay Now
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        Powered by DispatchForce AI
      </footer>
    </div>
  )
}
