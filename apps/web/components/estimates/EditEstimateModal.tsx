'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'

interface LineItemRow {
  id?: string
  name: string
  description: string
  quantity: string
  unit_price: string
  taxable: boolean
}

interface EditEstimateModalProps {
  estimate: {
    id: string
    title: string
    notes?: string | null
    terms?: string | null
    valid_until?: string | null
  }
  lineItems?: { id: string; name: string; description?: string | null; quantity: number; unit_price: number; taxable: boolean }[]
  onClose: () => void
  onSaved: () => void
}

export function EditEstimateModal({ estimate, lineItems = [], onClose, onSaved }: EditEstimateModalProps) {
  const [form, setForm] = useState({
    title: estimate.title,
    valid_until: estimate.valid_until ?? '',
    notes: estimate.notes ?? '',
    terms: estimate.terms ?? '',
  })
  const [items, setItems] = useState<LineItemRow[]>(
    lineItems.map(li => ({
      id: li.id,
      name: li.name,
      description: li.description ?? '',
      quantity: String(li.quantity),
      unit_price: String(li.unit_price),
      taxable: li.taxable,
    }))
  )
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  function addItem() {
    setItems(prev => [...prev, { name: '', description: '', quantity: '1', unit_price: '0', taxable: false }])
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: string, value: string | boolean) {
    setItems(prev =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setErrorMsg('')

    try {
      const res = await fetch(`/api/estimates/${estimate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          valid_until: form.valid_until || null,
          notes: form.notes || null,
          terms: form.terms || null,
          line_items: items.filter(li => li.name.trim()).map(li => ({
            name: li.name.trim(),
            description: li.description.trim() || null,
            quantity: parseFloat(li.quantity) || 1,
            unit_price: parseFloat(li.unit_price) || 0,
            taxable: li.taxable,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error ?? 'Failed to save estimate')
      } else {
        onSaved()
        onClose()
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error — please try again')
    } finally {
      setStatus('idle')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Edit Estimate</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Estimate title"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Line Items</label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Item
              </button>
            </div>
            
            {items.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                No line items — click Add Item
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-2 space-y-1.5">
                    <div className="flex gap-2 items-start">
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                        className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="0"
                        step="1"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="0"
                        step="0.01"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Description (optional)"
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-600"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
            <input
              type="date"
              name="valid_until"
              value={form.valid_until}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Optional notes"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Terms</label>
            <textarea
              name="terms"
              value={form.terms}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Optional terms"
              rows={2}
            />
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === 'saving'}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
            >
              {status === 'saving' ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
