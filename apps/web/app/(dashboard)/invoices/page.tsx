import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS, formatCurrency, formatDate } from '@field-service/shared'
import { NewInvoiceModal } from '@/components/invoices/NewInvoiceModal'

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const { status } = await searchParams

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const { data: customers } = await supabase
    .from('customers')
    .select('id, first_name, last_name')
    .eq('organization_id', userData?.organization_id ?? '')
    .order('last_name')

  let query = supabase
    .from('invoices')
    .select('*, customers(first_name, last_name)', { count: 'exact' })
    .eq('organization_id', userData?.organization_id ?? '')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) query = query.eq('status', status)

  const { data: invoices, count } = await query

  const statusFilters = [
    { value: '', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'viewed', label: 'Viewed' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">{count ?? 0} total</p>
        </div>
        <NewInvoiceModal customers={customers ?? []} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {statusFilters.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/invoices?status=${f.value}` : '/invoices'}
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
                Invoice #
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3 hidden md:table-cell">
                Customer
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                Status
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">
                Total
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3 hidden sm:table-cell">
                Balance Due
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3 hidden lg:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(invoices ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                  No invoices found
                </td>
              </tr>
            ) : (
              (invoices ?? []).map((inv: any) => {
                const customer = inv.customers
                const statusColor = INVOICE_STATUS_COLORS[inv.status] ?? '#6B7280'
                const statusLabel = INVOICE_STATUS_LABELS[inv.status] ?? inv.status

                return (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {inv.invoice_number}
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">
                        {inv.title}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 hidden md:table-cell">
                      {customer ? `${customer.first_name} ${customer.last_name}` : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: statusColor }}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-gray-900">
                      {formatCurrency(inv.total * 100)}
                    </td>
                    <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                      {inv.balance_due > 0 ? (
                        <span className="text-red-600 font-medium">
                          {formatCurrency(inv.balance_due * 100)}
                        </span>
                      ) : (
                        <span className="text-green-600">Paid</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 hidden lg:table-cell text-xs">
                      {formatDate(inv.created_at)}
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
