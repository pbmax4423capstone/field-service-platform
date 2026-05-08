'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { Plus, X, Trash2 } from 'lucide-react'

interface Customer {
  id: string
  first_name: string
  last_name: string
}

interface CustomerAddress {
  state?: string | null
  city?: string | null
  zip?: string | null
}

interface Props {
  customers: Customer[]
}

interface LineItem {
  name: string
  description: string
  quantity: number
  unit_price: number
  taxable: boolean
}

interface FormValues {
  customer_id: string
  title: string
  due_date: string
  notes: string
  tax_rate: number
  line_items: LineItem[]
}

const INPUT_CLS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const LABEL_CLS = 'block text-sm font-medium text-gray-700 mb-1'

export function NewInvoiceModal({ customers }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingTaxRate, setLoadingTaxRate] = useState(false)
  const [taxRateMsg, setTaxRateMsg] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      customer_id: '',
      title: '',
      due_date: '',
      notes: '',
      tax_rate: 0,
      line_items: [{ name: '', description: '', quantity: 1, unit_price: 0, taxable: false }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'line_items' })

  const watchedItems = useWatch({ control, name: 'line_items' })
  const watchedTaxRate = useWatch({ control, name: 'tax_rate' })
  const watchedCustomerId = useWatch({ control, name: 'customer_id' })

  const subtotal = (watchedItems ?? []).reduce(
    (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0),
    0,
  )

  const taxableSubtotal = (watchedItems ?? []).reduce(
    (sum, li) =>
      li.taxable ? sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0) : sum,
    0,
  )

  const rate = (Number(watchedTaxRate) || 0) / 100   // field stores %, convert to decimal
  const taxAmount = taxableSubtotal * rate
  const total = subtotal + taxAmount

  // Auto-suggest tax rate when customer changes
  useEffect(() => {
    if (!watchedCustomerId) {
      setTaxRateMsg(null)
      return
    }

    const fetchAndSuggestTaxRate = async () => {
      try {
        setLoadingTaxRate(true)
        setTaxRateMsg(null)

        const addressRes = await fetch(`/api/customer-addresses?customer_id=${watchedCustomerId}`)
        if (!addressRes.ok) return

        const addressData = await addressRes.json()
        const addresses = addressData.data as CustomerAddress[]
        if (!addresses || addresses.length === 0) {
          setTaxRateMsg('No address on file for this customer.')
          return
        }

        const primaryAddress = addresses[0]
        if (!primaryAddress.state) {
          setTaxRateMsg('Customer address has no state — cannot look up tax rate.')
          return
        }

        const params = new URLSearchParams({ state: primaryAddress.state })
        if (primaryAddress.city) params.append('city', primaryAddress.city)
        if (primaryAddress.zip) params.append('zip', primaryAddress.zip)

        const suggestRes = await fetch(`/api/tax-rates/suggest?${params.toString()}`)
        if (!suggestRes.ok) return

        const suggestData = await suggestRes.json()
        if (suggestData.data?.rate) {
          // Store as percentage (UI) — convert decimal to %
          setValue('tax_rate', parseFloat((suggestData.data.rate * 100).toFixed(4)))
          setTaxRateMsg(`Auto-filled: ${suggestData.data.name} (${(suggestData.data.rate * 100).toFixed(2)}%)`)
        } else {
          setTaxRateMsg(`No tax rate configured for ${primaryAddress.state}. Add one in Settings → Tax Rates.`)
        }
      } catch (err) {
        console.error('Failed to suggest tax rate:', err)
      } finally {
        setLoadingTaxRate(false)
      }
    }

    fetchAndSuggestTaxRate()
  }, [watchedCustomerId, setValue])

  function formatMoney(n: number) {
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: values.customer_id || null,
          title: values.title,
          due_date: values.due_date || null,
          notes: values.notes || null,
          tax_rate: (values.tax_rate || 0) / 100,  // convert % to decimal for storage
          line_items: values.line_items,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to create invoice')
      }

      const result = await res.json()
      reset()
      setOpen(false)
      router.push(`/invoices/${result.invoice.id}`)
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    if (submitting) return
    reset()
    setError(null)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Invoice
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">New Invoice</h2>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
              {/* Customer */}
              <div>
                <label className={LABEL_CLS} htmlFor="inv-customer">
                  Customer
                </label>
                <select
                  id="inv-customer"
                  {...register('customer_id')}
                  className={INPUT_CLS}
                >
                  <option value="">— No customer —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className={LABEL_CLS} htmlFor="inv-title">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="inv-title"
                  type="text"
                  placeholder="e.g. HVAC Repair – June"
                  {...register('title', { required: 'Title is required' })}
                  className={INPUT_CLS}
                />
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className={LABEL_CLS} htmlFor="inv-due-date">
                  Due Date
                </label>
                <input
                  id="inv-due-date"
                  type="date"
                  {...register('due_date')}
                  className={INPUT_CLS}
                />
              </div>

              {/* Tax Rate */}
              <div>
                <label className={LABEL_CLS} htmlFor="inv-tax-rate">
                  Tax Rate %
                  {loadingTaxRate && <span className="text-xs text-blue-500 ml-2">Looking up rate…</span>}
                </label>
                <div className="relative">
                  <input
                    id="inv-tax-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0.00"
                    {...register('tax_rate', { valueAsNumber: true })}
                    className={INPUT_CLS + ' pr-8'}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
                </div>
                {taxRateMsg && (
                  <p className={`text-xs mt-1 ${taxRateMsg.startsWith('Auto') ? 'text-green-600' : 'text-amber-600'}`}>
                    {taxRateMsg}
                    {taxRateMsg.includes('Settings') && (
                      <a href="/settings" className="ml-1 underline hover:text-amber-800">Go to Settings →</a>
                    )}
                  </p>
                )}
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className={`${LABEL_CLS} mb-0`}>Line Items</label>
                  <button
                    type="button"
                    onClick={() =>
                      append({ name: '', description: '', quantity: 1, unit_price: 0, taxable: false })
                    }
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <label className={LABEL_CLS}>
                            Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Item name"
                            {...register(`line_items.${idx}.name`, {
                              required: 'Name is required',
                            })}
                            className={INPUT_CLS}
                          />
                          {errors.line_items?.[idx]?.name && (
                            <p className="text-xs text-red-500 mt-1">
                              {errors.line_items[idx]?.name?.message}
                            </p>
                          )}
                        </div>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(idx)}
                            className="mt-6 p-1.5 rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className={LABEL_CLS}>Description</label>
                        <input
                          type="text"
                          placeholder="Optional description"
                          {...register(`line_items.${idx}.description`)}
                          className={INPUT_CLS}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={LABEL_CLS}>Qty</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            {...register(`line_items.${idx}.quantity`, { valueAsNumber: true })}
                            className={INPUT_CLS}
                          />
                        </div>
                        <div>
                          <label className={LABEL_CLS}>Unit Price</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            {...register(`line_items.${idx}.unit_price`, { valueAsNumber: true })}
                            className={INPUT_CLS}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`taxable-${idx}`}
                          {...register(`line_items.${idx}.taxable`)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          htmlFor={`taxable-${idx}`}
                          className="text-sm text-gray-700 select-none"
                        >
                          Taxable
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-lg px-4 py-3 space-y-1.5 border border-gray-200">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                {rate > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax ({(rate * 100).toFixed(1)}%)</span>
                    <span>{formatMoney(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-1.5 mt-1">
                  <span>Total</span>
                  <span>{formatMoney(total)}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={LABEL_CLS} htmlFor="inv-notes">
                  Notes
                </label>
                <textarea
                  id="inv-notes"
                  rows={3}
                  placeholder="Any notes for the customer…"
                  {...register('notes')}
                  className={INPUT_CLS}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="text-sm font-medium text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {submitting ? 'Creating…' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
