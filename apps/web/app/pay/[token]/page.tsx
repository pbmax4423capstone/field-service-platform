'use client'

import { useEffect, useState, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { CheckCircle, AlertCircle, Loader2, Wrench } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LineItem {
  name: string
  description: string | null
  quantity: number
  unit_price: number
  taxable: boolean
}

interface InvoiceData {
  id: string
  invoice_number: string
  title: string
  status: string
  total: number
  amount_paid: number
  balance_due: number
  subtotal: number
  tax_rate: number
  tax_amount: number
  due_date: string | null
  notes: string | null
  created_at: string
  customers: { first_name: string; last_name: string; email: string | null } | null
  invoice_line_items: LineItem[]
  organizations: {
    name: string
    phone: string | null
    email: string | null
    address: string | null
    city: string | null
    state: string | null
    stripe_onboarding_complete: boolean
  } | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function fmtDate(d: string | null) {
  if (!d) return 'Upon receipt'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const STATUS_COLOR: Record<string, string> = {
  paid: 'bg-green-100 text-green-800',
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-violet-100 text-violet-800',
  overdue: 'bg-red-100 text-red-800',
}

// ---------------------------------------------------------------------------
// PaymentForm (inner — needs Stripe context)
// ---------------------------------------------------------------------------
function PaymentForm({
  invoice,
  token,
  onPaid,
}: {
  invoice: InvoiceData
  token: string
  onPaid: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [intentLoading, setIntentLoading] = useState(true)

  useEffect(() => {
    if (invoice.status === 'paid' || invoice.balance_due <= 0) {
      setIntentLoading(false)
      return
    }
    fetch('/api/stripe/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.clientSecret) setClientSecret(d.clientSecret)
        else setError(d.error ?? 'Could not load payment form')
      })
      .catch(() => setError('Network error'))
      .finally(() => setIntentLoading(false))
  }, [token, invoice.status, invoice.balance_due])

  const handlePay = async () => {
    if (!stripe || !elements || !clientSecret) return
    setPaying(true)
    setError(null)

    const cardEl = elements.getElement(CardElement)
    if (!cardEl) return

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardEl },
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed')
      setPaying(false)
    } else if (paymentIntent?.status === 'succeeded') {
      onPaid()
    }
  }

  if (invoice.status === 'paid' || invoice.balance_due <= 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-500" />
        <p className="text-lg font-semibold text-gray-900">Invoice Paid</p>
        <p className="text-sm text-gray-500">Thank you — this invoice has been paid in full.</p>
      </div>
    )
  }

  if (intentLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (!invoice.organizations?.stripe_onboarding_complete) {
    return (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        Online payments are not yet configured for this contractor. Please contact them directly.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded-lg p-4">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '15px',
                color: '#111827',
                '::placeholder': { color: '#9ca3af' },
              },
            },
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={paying || !stripe || !clientSecret}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {paying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing…
          </>
        ) : (
          `Pay ${fmt(invoice.balance_due)}`
        )}
      </button>
      <p className="text-xs text-gray-400 text-center">Secured by Stripe · SSL encrypted</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [paid, setPaid] = useState(false)
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)

  // Resolve params
  useEffect(() => {
    params.then((p) => setToken(p.token))
  }, [params])

  // Load Stripe
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (key) setStripePromise(loadStripe(key))
  }, [])

  // Fetch invoice
  const fetchInvoice = useCallback(async (t: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/pay/${t}`)
      if (res.status === 404) { setNotFound(true); return }
      const data = await res.json()
      if (data.invoice) setInvoice(data.invoice)
      else setNotFound(true)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) fetchInvoice(token)
  }, [token, fetchInvoice])

  const handlePaid = () => {
    setPaid(true)
    if (token) fetchInvoice(token)
  }

  // ── Render states ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (notFound || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-500 text-sm">This payment link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  const org = invoice.organizations
  const customer = invoice.customers
  const lineItems = invoice.invoice_line_items ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
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

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Paid success banner */}
        {paid && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Payment Successful!</p>
              <p className="text-sm text-green-700">Thank you — your payment has been processed.</p>
            </div>
          </div>
        )}

        {/* Invoice header card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{invoice.title}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{invoice.invoice_number}</p>
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${STATUS_COLOR[invoice.status] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {invoice.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase font-medium">Billed To</p>
              <p className="font-medium text-gray-900 mt-1">
                {customer ? `${customer.first_name} ${customer.last_name}` : '—'}
              </p>
              {customer?.email && <p className="text-gray-500">{customer.email}</p>}
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs uppercase font-medium">Due Date</p>
              <p className="font-medium text-gray-900 mt-1">{fmtDate(invoice.due_date)}</p>
              <p className="text-gray-500 text-xs mt-0.5">Invoice date: {fmtDate(invoice.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Services &amp; Items</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs text-gray-500 font-medium uppercase px-5 py-2.5">Item</th>
                <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2.5">Qty</th>
                <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2.5">Price</th>
                <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2.5">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lineItems.map((li, i) => (
                <tr key={i}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{li.name}</p>
                    {li.description && (
                      <p className="text-xs text-gray-400">{li.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">{li.quantity}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{fmt(li.unit_price)}</td>
                  <td className="px-5 py-3 text-right font-medium">{fmt(li.quantity * li.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="px-5 py-4 border-t border-gray-100 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{fmt(invoice.subtotal)}</span>
            </div>
            {invoice.tax_rate > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax ({(invoice.tax_rate * 100).toFixed(1)}%)</span>
                <span>{fmt(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>{fmt(invoice.total)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Amount Paid</span>
                  <span>-{fmt(invoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-red-600">
                  <span>Balance Due</span>
                  <span>{fmt(invoice.balance_due)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Notes</p>
            <p className="text-sm text-gray-700">{invoice.notes}</p>
          </div>
        )}

        {/* Payment section */}
        {!paid && invoice.status !== 'paid' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Pay Online</h2>
            <p className="text-sm text-gray-500 mb-5">
              Amount due: <span className="font-semibold text-gray-900">{fmt(invoice.balance_due)}</span>
            </p>

            {token && stripePromise ? (
              <Elements stripe={stripePromise}>
                <PaymentForm
                  invoice={invoice}
                  token={token}
                  onPaid={handlePaid}
                />
              </Elements>
            ) : (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        Powered by DispatchForce AI · Payments secured by Stripe
      </footer>
    </div>
  )
}
