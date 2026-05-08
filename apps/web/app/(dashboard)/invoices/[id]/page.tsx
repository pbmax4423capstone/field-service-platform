import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
} from '@field-service/shared'
import { ArrowLeft, User, Phone, Mail, CreditCard } from 'lucide-react'
import { InvoiceActions } from '@/components/invoices/InvoiceActions'
import { CopyButton } from '@/components/invoices/CopyButton'
import { EditInvoiceButton } from '@/components/invoices/EditInvoiceButton'
import { RecordPaymentButton } from '@/components/invoices/RecordPaymentButton'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const { data: invoice } = await supabase
    .from('invoices')
    .select(`*, customers(first_name, last_name, email, phone), invoice_line_items(*), payments(*)`)
    .eq('id', id)
    .eq('organization_id', userData?.organization_id ?? '')
    .single()

  if (!invoice) notFound()

  const { data: org } = await supabase
    .from('organizations')
    .select('name, stripe_onboarding_complete, stripe_account_id')
    .eq('id', userData?.organization_id ?? '')
    .single()

  const customer = invoice.customers as any
  const lineItems = (invoice.invoice_line_items as any[]) ?? []
  const payments = (invoice.payments as any[]) ?? []

  const subtotal = lineItems.reduce(
    (sum: number, li: any) => sum + li.quantity * li.unit_price,
    0,
  )
  const taxRate = invoice.tax_rate ?? 0
  const taxAmount = subtotal * taxRate
  const total = subtotal + taxAmount
  const amountPaid = invoice.amount_paid ?? 0
  const balanceDue = invoice.balance_due ?? 0

  const statusColor = INVOICE_STATUS_COLORS[invoice.status] ?? '#6B7280'
  const statusLabel = INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status

  const paymentLink = `${APP_URL}/pay/${invoice.public_token}`

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/invoices"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Invoices
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{invoice.title}</h1>
            <EditInvoiceButton
              invoice={{
                id: invoice.id,
                title: invoice.title,
                due_date: invoice.due_date,
                notes: invoice.notes,
                terms: invoice.terms,
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
            {invoice.invoice_number && (
              <span className="text-sm text-gray-500 font-mono">{invoice.invoice_number}</span>
            )}
          </div>
        </div>

        <InvoiceActions
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number ?? ''}
          publicToken={invoice.public_token ?? ''}
          status={invoice.status}
          appUrl={APP_URL}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left: Customer + line items + notes + terms */}
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
                      href={`/customers/${invoice.customer_id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {customer.first_name} {customer.last_name}
                    </Link>
                  </div>
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
                  {customer.phone && (
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <a
                        href={`tel:${customer.phone}`}
                        className="text-sm text-gray-700 hover:text-blue-600"
                      >
                        {formatPhone(customer.phone)}
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
                      <span className="font-medium text-gray-900 w-28 text-right">
                        {formatCurrency(subtotal * 100)}
                      </span>
                    </div>
                    {taxRate > 0 && (
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-gray-500">Tax ({(taxRate * 100).toFixed(1)}%)</span>
                        <span className="font-medium text-gray-900 w-28 text-right">
                          {formatCurrency(taxAmount * 100)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-6 border-t border-gray-100 pt-2 mt-1">
                      <span className="text-sm font-bold text-gray-900">Total</span>
                      <span className="text-lg font-bold text-gray-900 w-28 text-right">
                        {formatCurrency(total * 100)}
                      </span>
                    </div>
                    {amountPaid > 0 && (
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-gray-500">Amount Paid</span>
                        <span className="font-medium text-green-600 w-28 text-right">
                          {formatCurrency(amountPaid * 100)}
                        </span>
                      </div>
                    )}
                    {balanceDue > 0 && (
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-gray-500">Balance Due</span>
                        <span className="font-bold text-red-600 w-28 text-right">
                          {formatCurrency(balanceDue * 100)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Notes</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Terms */}
          {invoice.terms && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Terms &amp; Conditions</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.terms}</p>
            </div>
          )}
        </div>

        {/* Right: Invoice details + payments */}
        <div className="space-y-5">
          {/* Invoice details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Invoice Details</h2>
            <dl className="space-y-3">
              {invoice.invoice_number && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Invoice Number
                  </dt>
                  <dd className="text-sm text-gray-900 font-mono mt-0.5">
                    {invoice.invoice_number}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                  Date Created
                </dt>
                <dd className="text-sm text-gray-900 mt-0.5">
                  {formatDateTime(invoice.created_at)}
                </dd>
              </div>
              {invoice.due_date && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                    Due Date
                  </dt>
                  <dd className="text-sm text-gray-900 mt-0.5">
                    {formatDate(invoice.due_date)}
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
              {invoice.public_token && (
                <div>
                  <dt className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                    Payment Link
                  </dt>
                  <dd>
                    <CopyButton text={paymentLink} />
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Payment history */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">Payments</h2>
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 mb-3">No payments recorded</p>
                <RecordPaymentButton invoiceId={invoice.id} balanceDue={balanceDue} />
              </div>
            ) : (
              <>
                <ul className="divide-y divide-gray-100">
                  {payments
                    .sort(
                      (a: any, b: any) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                    )
                    .map((payment: any) => (
                      <li key={payment.id} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(payment.amount * 100)}
                            </p>
                            {payment.method && (
                              <p className="text-xs text-gray-500 mt-0.5 capitalize">
                                {payment.method.replace(/_/g, ' ')}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {payment.status && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  payment.status === 'succeeded'
                                    ? 'bg-green-100 text-green-700'
                                    : payment.status === 'failed'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {payment.status}
                              </span>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDateTime(payment.created_at)}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
                <div className="px-5 py-3 border-t border-gray-100">
                  <RecordPaymentButton invoiceId={invoice.id} balanceDue={balanceDue} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

