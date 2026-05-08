'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface NewJobFormProps {
  customers: Array<{ id: string; first_name: string; last_name: string }>
  technicians: Array<{ id: string; full_name: string }>
}

export function NewJobForm({ customers, technicians }: NewJobFormProps) {
  const router = useRouter()
  const [form, setForm] = useState({
    customer_id: '',
    address_id: '',
    title: '',
    scheduled_start: '',
    scheduled_end: '',
    description: '',
    internal_notes: '',
    technician_id: '',
  })
  const [addresses, setAddresses] = useState<Array<{ id: string; label: string; street: string; city: string }>>([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Load addresses when customer changes
  useEffect(() => {
    if (!form.customer_id) {
      setAddresses([])
      return
    }

    const loadAddresses = async () => {
      setLoadingAddresses(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('customer_addresses')
          .select('id, label, street, city')
          .eq('customer_id', form.customer_id)

        if (error) throw error
        setAddresses(data ?? [])
        // Clear address selection when customer changes
        setForm(prev => ({ ...prev, address_id: '' }))
      } catch {
        setErrorMsg('Failed to load addresses')
      } finally {
        setLoadingAddresses(false)
      }
    }

    loadAddresses()
  }, [form.customer_id])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setErrorMsg('')

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: form.customer_id,
          address_id: form.address_id,
          title: form.title,
          scheduled_start: new Date(form.scheduled_start).toISOString(),
          scheduled_end: form.scheduled_end ? new Date(form.scheduled_end).toISOString() : null,
          description: form.description || null,
          internal_notes: form.internal_notes || null,
          technician_id: form.technician_id || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error ?? 'Failed to create job')
        return
      }

      // Navigate to the new job
      window.location.href = `/jobs/${data.id}`
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
          href="/jobs"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Jobs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Job</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Address */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Job Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                name="customer_id"
                value={form.customer_id}
                onChange={handleChange}
                required
                className={inputCls}
              >
                <option value="">Select a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Service Address <span className="text-red-500">*</span>
              </label>
              <select
                name="address_id"
                value={form.address_id}
                onChange={handleChange}
                required
                disabled={!form.customer_id || loadingAddresses}
                className={inputCls}
              >
                <option value="">
                  {loadingAddresses ? 'Loading…' : 'Select an address…'}
                </option>
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} — {a.street}, {a.city}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>
              Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              required
              className={inputCls}
              placeholder="e.g., HVAC Inspection, Furnace Repair"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Scheduled Start <span className="text-red-500">*</span>
              </label>
              <input
                name="scheduled_start"
                type="datetime-local"
                value={form.scheduled_start}
                onChange={handleChange}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Scheduled End</label>
              <input
                name="scheduled_end"
                type="datetime-local"
                value={form.scheduled_end}
                onChange={handleChange}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Technician</label>
            <select
              name="technician_id"
              value={form.technician_id}
              onChange={handleChange}
              className={inputCls}
            >
              <option value="">Unassigned</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description & Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Additional Information</h2>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="What work needs to be done?"
            />
          </div>
          <div>
            <label className={labelCls}>Internal Notes</label>
            <textarea
              name="internal_notes"
              value={form.internal_notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="For internal use only…"
            />
          </div>
        </div>

        {status === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/jobs"
            className="text-sm text-gray-600 hover:text-gray-800 font-medium px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={status === 'saving'}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {status === 'saving' ? 'Creating…' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  )
}
