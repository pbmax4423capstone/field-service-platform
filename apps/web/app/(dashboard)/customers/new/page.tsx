'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewCustomerPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    phone_alt: '',
    notes: '',
    // service address
    street: '',
    city: '',
    state: '',
    zip: '',
    access_notes: '',
  })
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setErrorMsg('')

    const hasAddress = form.street.trim() !== ''

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          email: form.email || null,
          phone_alt: form.phone_alt || null,
          notes: form.notes || null,
          tags: [],
          address: hasAddress
            ? {
                street: form.street,
                city: form.city,
                state: form.state,
                zip: form.zip,
                access_notes: form.access_notes || null,
              }
            : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error ?? 'Failed to create customer')
        return
      }

      // Navigate to the new customer's detail page
      router.push(`/customers/${data.id}`)
    } catch {
      setStatus('error')
      setErrorMsg('Network error — please try again')
    }
  }

  const inputCls =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/customers"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Customers
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Customer</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Contact info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Contact Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First Name <span className="text-red-500">*</span></label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
                className={inputCls}
                placeholder="Jane"
              />
            </div>
            <div>
              <label className={labelCls}>Last Name <span className="text-red-500">*</span></label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                required
                className={inputCls}
                placeholder="Smith"
              />
            </div>
            <div>
              <label className={labelCls}>Phone <span className="text-red-500">*</span></label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                required
                className={inputCls}
                placeholder="(303) 555-1234"
              />
            </div>
            <div>
              <label className={labelCls}>Alternate Phone</label>
              <input
                name="phone_alt"
                type="tel"
                value={form.phone_alt}
                onChange={handleChange}
                className={inputCls}
                placeholder="Optional"
              />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={inputCls}
                placeholder="jane@example.com"
              />
            </div>
          </div>
        </div>

        {/* Service address */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Service Address <span className="text-xs font-normal text-gray-400">(optional)</span></h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Street</label>
              <input
                name="street"
                value={form.street}
                onChange={handleChange}
                className={inputCls}
                placeholder="123 Main St"
              />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                className={inputCls}
                placeholder="Denver"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>State</label>
                <input
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  maxLength={2}
                  className={inputCls}
                  placeholder="CO"
                />
              </div>
              <div>
                <label className={labelCls}>Zip</label>
                <input
                  name="zip"
                  value={form.zip}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="80203"
                />
              </div>
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Access Notes</label>
              <input
                name="access_notes"
                value={form.access_notes}
                onChange={handleChange}
                className={inputCls}
                placeholder="Gate code, dogs in yard, etc."
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Notes</h2>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Any notes about this customer…"
          />
        </div>

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/customers"
            className="text-sm text-gray-600 hover:text-gray-800 font-medium px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={status === 'saving'}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {status === 'saving' ? 'Creating…' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  )
}
