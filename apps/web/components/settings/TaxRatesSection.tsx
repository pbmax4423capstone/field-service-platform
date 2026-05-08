'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Edit2, Plus, X } from 'lucide-react'

interface TaxRate {
  id: string
  name: string
  state: string
  city?: string | null
  county?: string | null
  zip_codes?: string[] | null
  rate: number
  is_default: boolean
}

interface Props {
  taxRates: TaxRate[]
}

export function TaxRatesSection({ taxRates: initialTaxRates }: Props) {
  const router = useRouter()
  const [taxRates, setTaxRates] = useState<TaxRate[]>(initialTaxRates)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'deleting' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    state: '',
    city: '',
    county: '',
    zipCodes: '',
    rate: '',
    isDefault: false,
  })

  const resetForm = () => {
    setFormData({
      name: '',
      state: '',
      city: '',
      county: '',
      zipCodes: '',
      rate: '',
      isDefault: false,
    })
    setEditingId(null)
    setShowAddForm(false)
  }

  const loadEditForm = (rate: TaxRate) => {
    setFormData({
      name: rate.name,
      state: rate.state,
      city: rate.city ?? '',
      county: rate.county ?? '',
      zipCodes: rate.zip_codes ? rate.zip_codes.join(', ') : '',
      rate: (rate.rate * 100).toFixed(2),
      isDefault: rate.is_default,
    })
    setEditingId(rate.id)
    setShowAddForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    setErrorMsg('')

    try {
      if (!formData.name.trim()) {
        throw new Error('Name is required')
      }
      if (!formData.state.trim() || formData.state.length !== 2) {
        throw new Error('State must be 2 characters')
      }
      const rateNum = parseFloat(formData.rate)
      if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
        throw new Error('Rate must be a number between 0 and 100')
      }

      const zipCodes = formData.zipCodes
        .split(',')
        .map((z) => z.trim())
        .filter((z) => z)

      const payload = {
        name: formData.name.trim(),
        state: formData.state.toUpperCase().trim(),
        city: formData.city.trim() || undefined,
        county: formData.county.trim() || undefined,
        zip_codes: zipCodes.length > 0 ? zipCodes : undefined,
        rate: rateNum / 100, // Convert percentage to decimal
        is_default: formData.isDefault,
      }

      let res
      if (editingId) {
        res = await fetch(`/api/tax-rates/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/tax-rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const result = await res.json()
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(result.error ?? 'Failed to save')
      } else {
        const saved: TaxRate = result.data
        if (editingId) {
          setTaxRates((prev) => prev.map((r) => (r.id === editingId ? saved : r)))
        } else {
          setTaxRates((prev) => [...prev, saved])
        }
        router.refresh()
        resetForm()
        setStatus('idle')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tax rate? This cannot be undone.')) return

    setStatus('deleting')
    setErrorMsg('')
    try {
      const res = await fetch(`/api/tax-rates/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        setStatus('error')
        setErrorMsg(data.error ?? 'Failed to delete')
      } else {
        setTaxRates((prev) => prev.filter((r) => r.id !== id))
        router.refresh()
        setStatus('idle')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg('Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      {/* Tax Rates Table */}
      {taxRates.length > 0 ? (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">State</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">City/County</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Rate</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Default</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {taxRates.map((rate, idx) => (
                <tr key={rate.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 text-gray-900">{rate.name}</td>
                  <td className="px-4 py-2 text-gray-900">{rate.state}</td>
                  <td className="px-4 py-2 text-gray-700">
                    {rate.city || rate.county ? (
                      <div>
                        {rate.city && <div>{rate.city}</div>}
                        {rate.county && <div>{rate.county}</div>}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-900 font-medium">
                    {(rate.rate * 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-2">
                    {rate.is_default ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        ✓ Default
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => loadEditForm(rate)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(rate.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Delete"
                        disabled={status === 'deleting'}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No tax rates configured yet</p>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">
              {editingId ? 'Edit Tax Rate' : 'Add Tax Rate'}
            </h3>
            <button
              onClick={resetForm}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Mobile, AL"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  placeholder="AL"
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, state: e.target.value.slice(0, 2) }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rate % *</label>
                <input
                  type="number"
                  placeholder="10.25"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, rate: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">County</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={formData.county}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, county: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Zip Codes (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="36602, 36603, 36604"
                  value={formData.zipCodes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, zipCodes: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2 flex items-center">
                <input
                  type="checkbox"
                  id="is-default"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))
                  }
                  className="w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="is-default" className="ml-2 text-sm text-gray-700">
                  Set as default tax rate
                </label>
              </div>
            </div>

            {errorMsg && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={status === 'saving'}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {status === 'saving' ? 'Saving...' : editingId ? 'Update' : 'Add'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Tax Rate
        </button>
      )}
    </div>
  )
}
